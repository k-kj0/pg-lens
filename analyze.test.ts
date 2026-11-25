import { describe, expect, it } from 'vitest';
import { analyzeRow, analyzeAll, normalize, summarize, sortItems } from './analyze';
import { SAMPLE_ROWS } from './sample';
import type { StatRow } from './types';

const base: StatRow = {
  queryid: 't',
  query: 'SELECT 1',
  calls: 100,
  total_exec_time: 1000,
  mean_exec_time: 10,
  rows: 100,
  shared_blks_hit: 0,
  shared_blks_read: 0,
};
const make = (over: Partial<StatRow>): StatRow => ({ ...base, ...over });

describe('normalize', () => {
  it('drops comments and string literals so their words never match', () => {
    const q = normalize("SELECT 'sum(x) group by' /* count(*) */ -- avg(y)\n FROM t");
    expect(q).not.toMatch(/sum|group by|count|avg/);
  });
});

describe('analyzeRow', () => {
  it('keeps writes on Postgres with score 0', () => {
    const a = analyzeRow(make({ query: 'INSERT INTO t (a) VALUES ($1)' }));
    expect(a.verdict).toBe('keep');
    expect(a.score).toBe(0);
  });

  it('keeps SELECT ... FOR UPDATE on Postgres', () => {
    expect(analyzeRow(make({ query: 'SELECT * FROM t WHERE id = $1 FOR UPDATE' })).verdict).toBe('keep');
  });

  it('flags a heavy GROUP BY over a big scan as an offload candidate', () => {
    const a = analyzeRow(
      make({
        query: "SELECT date_trunc('day', ts) d, count(*), sum(x) FROM events GROUP BY 1",
        mean_exec_time: 5000,
        shared_blks_hit: 80_000_000,
        shared_blks_read: 20_000_000,
      }),
    );
    expect(a.verdict).toBe('offload');
    expect(a.score).toBeGreaterThanOrEqual(60);
    expect(a.reasons.join(' ')).toMatch(/GROUP BY/);
  });

  it('does not flag a point lookup', () => {
    const a = analyzeRow(make({ query: 'SELECT * FROM orders WHERE id = $1', shared_blks_hit: 400 }));
    expect(a.verdict).toBe('keep');
  });

  it('does not call a big scan without aggregation an offload candidate', () => {
    const a = analyzeRow(
      make({ query: 'SELECT * FROM big_table WHERE flag = $1', mean_exec_time: 500, shared_blks_hit: 50_000_000, shared_blks_read: 50_000_000 }),
    );
    expect(a.verdict).not.toBe('offload');
  });

  it('is not fooled by aggregate words inside string literals', () => {
    const a = analyzeRow(make({ query: "SELECT id FROM notes WHERE body = 'sum(x) group by y'" }));
    expect(a.verdict).toBe('keep');
  });

  it('clamps the score between 0 and 100', () => {
    const a = analyzeRow(
      make({
        query: "SELECT date_trunc('hour', ts), count(distinct u), sum(x), rank() OVER (ORDER BY ts) FROM a JOIN b ON 1=1 JOIN c ON 1=1 JOIN d ON 1=1 GROUP BY 1",
        mean_exec_time: 9999,
        shared_blks_hit: 1e9,
      }),
    );
    expect(a.score).toBeLessThanOrEqual(100);
    expect(a.score).toBeGreaterThanOrEqual(0);
  });
});

describe('summary and sorting on the sample data', () => {
  const items = analyzeAll(SAMPLE_ROWS as StatRow[]);

  it('finds some offload candidates and some queries to keep', () => {
    const s = summarize(items);
    expect(s.offloadCount).toBeGreaterThan(0);
    expect(s.keepCount).toBeGreaterThan(0);
    expect(s.offloadTimeShare).toBeGreaterThan(0);
    expect(s.offloadTimeShare).toBeLessThanOrEqual(1);
  });

  it('sorts by score descending', () => {
    const sorted = sortItems(items, 'score');
    for (let i = 1; i < sorted.length; i++) expect(sorted[i - 1].score).toBeGreaterThanOrEqual(sorted[i].score);
  });

  it('keeps the known OLTP rows on Postgres', () => {
    const byId = Object.fromEntries(items.map((a) => [a.row.queryid, a.verdict]));
    expect(byId['1005']).toBe('keep'); // point lookup by id
    expect(byId['1007']).toBe('keep'); // insert
    expect(byId['1013']).toBe('keep'); // FOR UPDATE
  });

  it('flags the known reporting queries', () => {
    const byId = Object.fromEntries(items.map((a) => [a.row.queryid, a.verdict]));
    expect(byId['1001']).toBe('offload');
    expect(byId['1002']).toBe('offload');
  });
});

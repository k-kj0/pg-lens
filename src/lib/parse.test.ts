import { describe, expect, it } from 'vitest';
import { parseCsv, parseInput } from './parse';

describe('parseCsv', () => {
  it('handles quoted commas, escaped quotes and newlines', () => {
    const t = parseCsv('a,b\n"x, y","say ""hi""\nthere"\n');
    expect(t).toEqual([['a', 'b'], ['x, y', 'say "hi"\nthere']]);
  });
});

describe('parseInput', () => {
  it('reads a JSON array with string numbers (as bigint columns arrive)', () => {
    const r = parseInput(JSON.stringify([{ queryid: '1', query: 'select 1', calls: '10', total_exec_time: '50.5', rows: '10' }]));
    expect(r.errors).toEqual([]);
    expect(r.rows[0].calls).toBe(10);
    expect(r.rows[0].mean_exec_time).toBeCloseTo(5.05);
  });

  it('reads CSV with a header row', () => {
    const csv = 'queryid,query,calls,total_exec_time,mean_exec_time,rows,shared_blks_hit,shared_blks_read\n7,"select a, b from t",3,30,10,3,100,5\n';
    const r = parseInput(csv);
    expect(r.errors).toEqual([]);
    expect(r.rows[0].query).toBe('select a, b from t');
    expect(r.rows[0].shared_blks_hit).toBe(100);
  });

  it('accepts a json_agg result wrapped in an extra array', () => {
    const r = parseInput(JSON.stringify([[{ query: 'select 1', calls: 1, total_exec_time: 1 }]]));
    expect(r.rows).toHaveLength(1);
  });

  it('reports bad rows with row numbers and keeps the good ones', () => {
    const r = parseInput(JSON.stringify([{ query: 'select 1', calls: 1, total_exec_time: 1 }, { calls: 1, total_exec_time: 1 }]));
    expect(r.rows).toHaveLength(1);
    expect(r.errors[0]).toMatch(/Row 2/);
  });

  it('rejects empty input and invalid JSON with a readable message', () => {
    expect(parseInput('   ').errors[0]).toMatch(/Paste/);
    expect(parseInput('[{"query": ').errors[0]).toMatch(/JSON/);
  });

  it('rejects negative or missing numbers', () => {
    expect(parseInput(JSON.stringify([{ query: 'select 1', calls: -1, total_exec_time: 1 }])).errors[0]).toMatch(/calls/);
    expect(parseInput(JSON.stringify([{ query: 'select 1', calls: 1 }])).errors[0]).toMatch(/total_exec_time|mean_exec_time/);
  });
});

import type { Analysis, StatRow, Summary, Verdict } from './types';

/**
 * Heuristic: does this query look like analytical (OLAP) work?
 *
 * It only reads the normalised query text and the I/O counters that
 * pg_stat_statements already provides. It cannot see your schema, indexes or
 * data, so treat a verdict as a prompt to run EXPLAIN and a test, not a fact.
 * Every weight below is a judgement call, kept in one place so it is easy to change.
 */
export const WEIGHTS = {
  aggregate: 25,
  groupBy: 20,
  window: 10,
  timeBucket: 10,
  distinctCount: 5,
  manyJoins: 5,
  bigScan: 25,
  mediumScan: 12,
  slowCall: 5,
  pointLookup: -25,
} as const;

export const THRESHOLDS = { offload: 60, watch: 35 } as const;
export const BLOCK_BYTES = 8192;
const BIG_SCAN_BLOCKS = 1000; // about 8 MB touched per call
const MEDIUM_SCAN_BLOCKS = 100; // about 0.8 MB per call
const SLOW_MS = 100;

/** Remove comments and string literals so words inside them never match. */
export function normalize(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const WRITE = /^(insert|update|delete|merge|copy|create|alter|drop|truncate|vacuum|analyze|reindex|grant|revoke|begin|commit|rollback|set|call|do|lock|refresh)\b/;
const AGG = /\b(count|sum|avg|min|max|stddev|stddev_pop|stddev_samp|variance|var_pop|var_samp|percentile_cont|percentile_disc|array_agg|string_agg|json_agg|jsonb_agg|bool_and|bool_or|corr)\s*\(/;
const GROUP_BY = /\bgroup by\b/;
const WINDOW = /\bover\s*\(/;
const BUCKET = /\b(date_trunc|time_bucket)\s*\(/;
const DISTINCT_COUNT = /\bcount\s*\(\s*distinct\b/;
const FOR_LOCK = /\bfor (update|share|no key update|key share)\b/;
const POINT_LOOKUP = /\bwhere\b[^;]*?\b(?:[a-z_]*\.)?(?:id|[a-z_]+_id)\s*=\s*(?:\$\d+|\d+|'')/;

export function analyzeRow(row: StatRow): Analysis {
  const q = normalize(row.query);
  const blocksPerCall = (row.shared_blks_hit + row.shared_blks_read) / row.calls;
  const reasons: string[] = [];

  if (WRITE.test(q) || FOR_LOCK.test(q)) {
    return {
      row,
      score: 0,
      verdict: 'keep',
      reasons: ['Write, DDL or locking statement. This is transactional work and stays on Postgres.'],
      blocksPerCall,
    };
  }

  let score = 0;
  const hasAgg = AGG.test(q);
  const hasGroup = GROUP_BY.test(q);
  const hasWindow = WINDOW.test(q);

  if (hasAgg) {
    score += WEIGHTS.aggregate;
    reasons.push('Uses aggregate functions (count, sum, avg and similar).');
  }
  if (hasGroup) {
    score += WEIGHTS.groupBy;
    reasons.push('Groups rows with GROUP BY.');
  }
  if (hasWindow) {
    score += WEIGHTS.window;
    reasons.push('Uses a window function.');
  }
  if (BUCKET.test(q)) {
    score += WEIGHTS.timeBucket;
    reasons.push('Buckets by time (date_trunc), typical of reporting queries.');
  }
  if (DISTINCT_COUNT.test(q)) {
    score += WEIGHTS.distinctCount;
    reasons.push('Counts distinct values, which is expensive on a row store.');
  }
  const joins = (q.match(/\bjoin\b/g) ?? []).length;
  if (joins >= 3) {
    score += WEIGHTS.manyJoins;
    reasons.push(`Joins ${joins + 1} tables.`);
  }

  const mbPerCall = (blocksPerCall * BLOCK_BYTES) / (1024 * 1024);
  if (blocksPerCall >= BIG_SCAN_BLOCKS) {
    score += WEIGHTS.bigScan;
    reasons.push(`Touches about ${mbPerCall.toFixed(1)} MB per call, which suggests a large scan.`);
  } else if (blocksPerCall >= MEDIUM_SCAN_BLOCKS) {
    score += WEIGHTS.mediumScan;
    reasons.push(`Touches about ${mbPerCall.toFixed(1)} MB per call.`);
  }
  if (row.mean_exec_time >= SLOW_MS) {
    score += WEIGHTS.slowCall;
    reasons.push(`Averages ${Math.round(row.mean_exec_time)} ms per call.`);
  }
  if (POINT_LOOKUP.test(q) && !hasGroup) {
    score += WEIGHTS.pointLookup;
    reasons.push('Filters on an id column with equality, which looks like a point lookup that Postgres handles well.');
  }

  score = Math.max(0, Math.min(100, score));

  let verdict: Verdict = score >= THRESHOLDS.offload ? 'offload' : score >= THRESHOLDS.watch ? 'watch' : 'keep';
  // A big scan alone is not analytical. Require an aggregate, GROUP BY or window to say "offload".
  if (verdict === 'offload' && !(hasAgg || hasGroup || hasWindow)) verdict = 'watch';

  if (reasons.length === 0) reasons.push('No analytical signals found in the query text or I/O counters.');
  return { row, score, verdict, reasons, blocksPerCall };
}

export function analyzeAll(rows: StatRow[]): Analysis[] {
  return rows.map(analyzeRow);
}

export function summarize(items: Analysis[]): Summary {
  const totalTimeMs = items.reduce((s, a) => s + a.row.total_exec_time, 0);
  const offloadTime = items.filter((a) => a.verdict === 'offload').reduce((s, a) => s + a.row.total_exec_time, 0);
  return {
    queryCount: items.length,
    totalTimeMs,
    offloadCount: items.filter((a) => a.verdict === 'offload').length,
    watchCount: items.filter((a) => a.verdict === 'watch').length,
    keepCount: items.filter((a) => a.verdict === 'keep').length,
    offloadTimeShare: totalTimeMs > 0 ? offloadTime / totalTimeMs : 0,
  };
}

export type SortKey = 'score' | 'total' | 'mean' | 'calls';

export function sortItems(items: Analysis[], key: SortKey): Analysis[] {
  const val = (a: Analysis) =>
    key === 'score' ? a.score : key === 'total' ? a.row.total_exec_time : key === 'mean' ? a.row.mean_exec_time : a.row.calls;
  return [...items].sort((a, b) => val(b) - val(a) || b.row.total_exec_time - a.row.total_exec_time);
}

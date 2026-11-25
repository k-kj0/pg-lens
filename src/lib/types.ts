export interface StatRow {
  queryid: string;
  query: string;
  calls: number;
  total_exec_time: number; // milliseconds
  mean_exec_time: number; // milliseconds
  rows: number;
  shared_blks_hit: number;
  shared_blks_read: number;
}

export type Verdict = 'offload' | 'watch' | 'keep';

export interface Analysis {
  row: StatRow;
  score: number; // 0..100
  verdict: Verdict;
  reasons: string[];
  /** Average 8 KB blocks touched per call (hit + read). */
  blocksPerCall: number;
}

export interface Summary {
  queryCount: number;
  totalTimeMs: number;
  offloadCount: number;
  watchCount: number;
  keepCount: number;
  /** Fraction (0..1) of total execution time spent in 'offload' queries. */
  offloadTimeShare: number;
}

import type { Analysis, Verdict } from './types';

export interface VerdictSlice {
  verdict: Verdict;
  queries: number;
  timeMs: number;
  /** Fraction (0..1) of total execution time. */
  share: number;
}

export const VERDICT_ORDER: Verdict[] = ['offload', 'watch', 'keep'];

/** Total execution time and query count per verdict, in a fixed order. Shares sum to 1 (or all 0 when there is no time). */
export function timeByVerdict(items: Analysis[]): VerdictSlice[] {
  const total = items.reduce((s, a) => s + a.row.total_exec_time, 0);
  return VERDICT_ORDER.map((verdict) => {
    const group = items.filter((a) => a.verdict === verdict);
    const timeMs = group.reduce((s, a) => s + a.row.total_exec_time, 0);
    return { verdict, queries: group.length, timeMs, share: total > 0 ? timeMs / total : 0 };
  });
}

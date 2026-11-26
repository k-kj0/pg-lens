import { describe, expect, it } from 'vitest';
import { analyzeAll } from './analyze';
import { timeByVerdict } from './chartData';
import { SAMPLE_ROWS } from './sample';
import type { StatRow } from './types';

describe('timeByVerdict', () => {
  const slices = timeByVerdict(analyzeAll(SAMPLE_ROWS as StatRow[]));

  it('returns offload, watch and keep in a fixed order', () => {
    expect(slices.map((s) => s.verdict)).toEqual(['offload', 'watch', 'keep']);
  });

  it('shares add up to 1 and query counts add up to the input size', () => {
    expect(slices.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1);
    expect(slices.reduce((s, x) => s + x.queries, 0)).toBe(SAMPLE_ROWS.length);
  });

  it('returns zero shares when there is no execution time', () => {
    const none = timeByVerdict([]);
    expect(none.every((s) => s.share === 0 && s.queries === 0)).toBe(true);
  });
});

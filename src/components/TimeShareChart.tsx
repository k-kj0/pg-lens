import { useId } from 'react';
import { fmtMs, fmtPct } from '../lib/format';
import type { VerdictSlice } from '../lib/chartData';
import type { Verdict } from '../lib/types';

const LABEL: Record<Verdict, string> = {
  offload: 'Offload candidate',
  watch: 'Watch',
  keep: 'Keep on Postgres',
};

const W = 600;
const H = 44;

/**
 * Stacked bar of total query time by verdict.
 * Not colour-only: each verdict has its own fill pattern, and the same numbers are
 * repeated as text in the list below, which is the accessible equivalent of the graphic.
 */
export default function TimeShareChart({ slices }: { slices: VerdictSlice[] }) {
  const uid = useId().replace(/:/g, '');
  const total = slices.reduce((s, x) => s + x.timeMs, 0);
  if (total <= 0) return null;

  const summary = slices.map((s) => `${LABEL[s.verdict]} ${fmtPct(s.share)}`).join(', ');
  let x = 0;

  return (
    <figure className="chart">
      <figcaption className="chart-title">Share of total query time by verdict</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby={`${uid}-t`}
        aria-describedby={`${uid}-d`}
        className="chart-svg"
        preserveAspectRatio="none"
      >
        <title id={`${uid}-t`}>Share of total query time by verdict</title>
        <desc id={`${uid}-d`}>{summary}</desc>
        <defs>
          <pattern id={`${uid}-watch`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="8" height="8" className="chart-fill-watch" />
            <rect width="3" height="8" className="chart-hatch" />
          </pattern>
          <pattern id={`${uid}-keep`} width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" className="chart-fill-keep" />
            <circle cx="4" cy="4" r="1.5" className="chart-hatch" />
          </pattern>
        </defs>
        {slices.map((s) => {
          const w = s.share * W;
          const fill =
            s.verdict === 'offload' ? undefined : `url(#${uid}-${s.verdict})`;
          const rect = (
            <rect
              key={s.verdict}
              x={x}
              y={0}
              width={w}
              height={H}
              className={s.verdict === 'offload' ? 'chart-fill-offload' : undefined}
              fill={fill}
              stroke="var(--text)"
              strokeWidth={w > 0 ? 1.5 : 0}
            />
          );
          x += w;
          return rect;
        })}
      </svg>
      <ul className="chart-legend">
        {slices.map((s) => (
          <li key={s.verdict}>
            <svg width="20" height="14" aria-hidden="true" focusable="false">
              <rect
                width="20"
                height="14"
                className={s.verdict === 'offload' ? 'chart-fill-offload' : undefined}
                fill={s.verdict === 'offload' ? undefined : `url(#${uid}-${s.verdict})`}
                stroke="var(--text)"
                strokeWidth="1.5"
              />
            </svg>
            <span>
              <strong>{LABEL[s.verdict]}</strong>: {fmtPct(s.share)} of time ({fmtMs(s.timeMs)}), {s.queries}{' '}
              {s.queries === 1 ? 'query' : 'queries'}
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

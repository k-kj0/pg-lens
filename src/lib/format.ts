export function fmtMs(ms: number): string {
  if (ms >= 3_600_000) return `${(ms / 3_600_000).toFixed(1)} h`;
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)} min`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  if (ms >= 10) return `${Math.round(ms)} ms`;
  return `${ms.toFixed(2)} ms`;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function fmtMB(blocksPerCall: number): string {
  const mb = (blocksPerCall * 8192) / (1024 * 1024);
  return mb >= 10 ? mb.toFixed(0) : mb.toFixed(2);
}

export function fmtPct(fraction: number): string {
  return `${(fraction * 100).toFixed(0)}%`;
}

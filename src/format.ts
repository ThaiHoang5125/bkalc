export const fmt = (n: number | null | undefined, d = 2) => (n === null || n === undefined || Number.isNaN(n) ? '—' : n.toFixed(d));
export const fmtDelta = (n: number, d = 3) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(d)}`;

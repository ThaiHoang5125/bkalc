/** Toán thống kê truy cập: dùng chung cho Pages Functions (functions/) và màn hình quản trị. Thời gian tính bằng giây (epoch). */
export const BUCKET_S = 300;
export const ONLINE_WINDOW_S = 150;
export const RANGES = { '24h': 86400, '7d': 604800, '30d': 2592000 } as const;
export type RangeKey = keyof typeof RANGES;
/** Bước gom điểm khi vẽ: 24 giờ → 5 phút, 7 ngày → 1 giờ, 30 ngày → 6 giờ. */
export const STEPS: Record<RangeKey, number> = { '24h': BUCKET_S, '7d': 3600, '30d': 21600 };

export interface Point { ts: number; peak: number }

export const bucketStart = (ts: number): number => ts - (ts % BUCKET_S);

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Một điểm cho mỗi ô 5 phút trong [from, to]; ô không có dữ liệu có peak = 0. */
export function fillGaps(points: Point[], from: number, to: number): Point[] {
  const byTs = new Map(points.map((p) => [p.ts, p.peak]));
  const out: Point[] = [];
  for (let ts = bucketStart(from); ts <= bucketStart(to); ts += BUCKET_S) out.push({ ts, peak: byTs.get(ts) ?? 0 });
  return out;
}

/** Gom các điểm vào ô `step` giây, lấy peak lớn nhất mỗi ô. `step` phải là bội của BUCKET_S. */
export function downsample(points: Point[], step: number): Point[] {
  const m = new Map<number, number>();
  for (const p of points) {
    const k = p.ts - (p.ts % step);
    m.set(k, Math.max(m.get(k) ?? 0, p.peak));
  }
  return [...m].sort((a, b) => a[0] - b[0]).map(([ts, peak]) => ({ ts, peak }));
}

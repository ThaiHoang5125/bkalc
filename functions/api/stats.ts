import { ONLINE_WINDOW_S, RANGES } from '../../src/stats';
import type { Point, RangeKey } from '../../src/stats';
import type { Ctx } from '../_lib/env';

const enc = new TextEncoder();
/** So sánh chuỗi với thời gian không phụ thuộc vị trí ký tự khác nhau. */
function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a), y = enc.encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return d === 0;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Số đang online + các điểm đỉnh theo ô 5 phút. Chỉ chủ dự án (Bearer ADMIN_TOKEN) được xem. */
export const onRequestGet = async ({ request, env }: Ctx): Promise<Response> => {
  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!env.ADMIN_TOKEN || !safeEqual(token, env.ADMIN_TOKEN)) return json({ error: 'unauthorized' }, 401);

  const key = new URL(request.url).searchParams.get('range') ?? '24h';
  if (!(key in RANGES)) return json({ error: 'bad range' }, 400);
  const now = Math.floor(Date.now() / 1000);
  const from = now - RANGES[key as RangeKey];
  const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM sessions WHERE seen > ?1').bind(now - ONLINE_WINDOW_S).first<{ n: number }>();
  const rows = await env.DB.prepare('SELECT ts, peak FROM buckets WHERE ts >= ?1 ORDER BY ts').bind(from).all<Point>();
  return json({ now, online: c?.n ?? 0, points: rows.results });
};

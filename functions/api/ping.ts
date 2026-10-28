import { ONLINE_WINDOW_S, UUID_RE, bucketStart } from '../../src/stats';
import type { Ctx } from '../_lib/env';

const KEEP_SESSION_S = 3600;
const KEEP_BUCKET_S = 90 * 86400;

/** Nhịp "đang truy cập" ẩn danh từ bản web: chỉ nhận mã phiên ngẫu nhiên, không lưu IP hay dữ liệu học tập. */
export const onRequestPost = async ({ request, env }: Ctx): Promise<Response> => {
  let sid = '';
  try { const b = (await request.json()) as { sid?: unknown }; if (typeof b.sid === 'string') sid = b.sid; } catch { /* body không hợp lệ */ }
  if (!UUID_RE.test(sid)) return new Response(null, { status: 400 });

  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare('INSERT INTO sessions (id, seen) VALUES (?1, ?2) ON CONFLICT(id) DO UPDATE SET seen = ?2').bind(sid, now).run();
  const c = await env.DB.prepare('SELECT COUNT(*) AS n FROM sessions WHERE seen > ?1').bind(now - ONLINE_WINDOW_S).first<{ n: number }>();
  const n = c?.n ?? 0;
  const ts = bucketStart(now);
  const cur = await env.DB.prepare('SELECT peak FROM buckets WHERE ts = ?1').bind(ts).first<{ peak: number }>();
  if (!cur || cur.peak < n) { // chỉ ghi khi đỉnh tăng để tiết kiệm lượt ghi của D1
    await env.DB.prepare('INSERT INTO buckets (ts, peak) VALUES (?1, ?2) ON CONFLICT(ts) DO UPDATE SET peak = ?2').bind(ts, n).run();
  }
  if (Math.random() < 0.05) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE seen < ?1').bind(now - KEEP_SESSION_S),
      env.DB.prepare('DELETE FROM buckets WHERE ts < ?1').bind(now - KEEP_BUCKET_S),
    ]);
  }
  return new Response(null, { status: 204 });
};

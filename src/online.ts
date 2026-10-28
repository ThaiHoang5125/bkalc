const SID_KEY = 'bkalc-sid';
const BEAT_MS = 90_000;

const makeSid = (): string => {
  try {
    let s = sessionStorage.getItem(SID_KEY);
    if (!s) { s = crypto.randomUUID(); sessionStorage.setItem(SID_KEY, s); }
    return s;
  } catch { return crypto.randomUUID(); }
};

/** Báo "đang truy cập" ẩn danh (mã phiên ngẫu nhiên theo tab) cho thống kê của chủ dự án. Chỉ chạy ở bản web đã build; .exe không gửi gì. Trả về hàm dừng. */
export function startPresence(): () => void {
  if (window.gpaApi || !import.meta.env.PROD || location.protocol === 'file:' || typeof crypto?.randomUUID !== 'function') return () => undefined;
  const beat = () => {
    if (document.visibilityState !== 'visible') return;
    void fetch('/api/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid: makeSid() }), keepalive: true }).catch(() => undefined);
  };
  beat();
  const id = window.setInterval(beat, BEAT_MS);
  document.addEventListener('visibilitychange', beat);
  return () => { window.clearInterval(id); document.removeEventListener('visibilitychange', beat); };
}

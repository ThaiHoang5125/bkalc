import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../i18n';
import { RANGES, STEPS, downsample, fillGaps } from '../stats';
import type { Point, RangeKey } from '../stats';

const TOKEN_KEY = 'bkalc-admin-token';
const REFRESH_MS = 60_000;
const readToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; } };
const writeToken = (v: string) => { try { if (v) sessionStorage.setItem(TOKEN_KEY, v); else sessionStorage.removeItem(TOKEN_KEY); } catch { /* bỏ qua */ } };

interface Stats { now: number; online: number; points: Point[] }
const LABELS: [RangeKey, string][] = [['24h', '24 giờ'], ['7d', '7 ngày'], ['30d', '30 ngày']];
const pad2 = (n: number) => String(n).padStart(2, '0');
const stamp = (ts: number, withTime: boolean) => { const d = new Date(ts * 1000); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}${withTime ? ` ${pad2(d.getHours())}:${pad2(d.getMinutes())}` : ''}`; };

const W = 640, H = 220, L = 36, R = 12, T = 12, B = 28;

function Chart({ points, from, to, range }: { points: Point[]; from: number; to: number; range: RangeKey }) {
  const data = useMemo(() => downsample(fillGaps(points, from, to), STEPS[range]), [points, from, to, range]);
  const top = Math.max(1, ...data.map((p) => p.peak));
  const yMax = top <= 4 ? top : Math.ceil(top / 2) * 2;
  const yTicks = yMax <= 4 ? Array.from({ length: yMax + 1 }, (_, i) => i) : [0, yMax / 2, yMax]; // luôn là số nguyên, không trùng nhãn
  const x = (i: number) => L + (data.length <= 1 ? 0 : (i / (data.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / yMax) * (H - T - B);
  const line = data.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.peak).toFixed(1)}`).join('');
  const area = data.length ? `${line}L${x(data.length - 1).toFixed(1)} ${y(0)}L${x(0).toFixed(1)} ${y(0)}Z` : '';
  const peak = data.reduce<Point | null>((m, p) => (!m || p.peak > m.peak ? p : m), null);
  const withTime = range === '24h';
  const ticks = [0, 0.5, 1].map((f) => data[Math.round(f * (data.length - 1))]).filter(Boolean);
  return (
    <figure className="adminchart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('Đồ thị số người truy cập cao nhất theo thời gian')}>
        {yTicks.map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" /><text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{v}</text></g>)}
        {area && <path d={area} fill="var(--accent-soft)" />}
        {line && <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />}
        {ticks.map((p, i) => <text key={p.ts} x={x(data.indexOf(p))} y={H - 8} textAnchor={i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'} fontSize="11" fill="var(--muted)">{stamp(p.ts, withTime)}</text>)}
      </svg>
      <figcaption>{peak && peak.peak > 0 ? `${t('Đỉnh')}: ${peak.peak} ${t('người')} · ${stamp(peak.ts, true)}` : t('Chưa có dữ liệu trong khoảng này')}</figcaption>
    </figure>
  );
}

/** Màn hình quản trị: số người đang truy cập bản web + đồ thị theo khoảng thời gian. Mở bằng Ctrl+Shift+F12, cần mã quản trị (ADMIN_TOKEN). */
export function AdminStats({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState(readToken);
  const [input, setInput] = useState('');
  const [range, setRange] = useState<RangeKey>('24h');
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`/api/stats?range=${range}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (r.status === 401) { writeToken(''); setToken(''); setStats(null); setError(t('Mã quản trị không đúng.')); return; }
      if (!r.ok) throw new Error(String(r.status));
      setStats((await r.json()) as Stats);
      setError('');
    } catch { setError(t('Không tải được thống kê. Kiểm tra kết nối hoặc cấu hình D1.')); }
  }, [token, range]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const submit = (e: React.FormEvent) => { e.preventDefault(); const v = input.trim(); if (!v) return; writeToken(v); setToken(v); setInput(''); setError(''); };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={t('Thống kê truy cập')} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modalbox adminbox">
        <h3>{t('Thống kê truy cập')}</h3>
        {!token ? (
          <form onSubmit={submit} className="adminform">
            <label>{t('Mã quản trị')}<input type="password" autoFocus autoComplete="off" value={input} onChange={(e) => setInput(e.target.value)} /></label>
            {error && <p className="err" role="alert">{error}</p>}
            <div className="btn-row"><button type="button" onClick={onClose}>{t('Đóng')}</button><button type="submit" className="primary">{t('Xem thống kê')}</button></div>
          </form>
        ) : (
          <>
            <div className="adminhead">
              <div className="adminonline"><b>{stats ? stats.online : '…'}</b><span>{t('đang truy cập')}</span></div>
              <div className="seg" role="group" aria-label={t('Khoảng thời gian')}>
                {LABELS.map(([k, label]) => <button key={k} type="button" className={range === k ? 'on' : ''} aria-pressed={range === k} onClick={() => setRange(k)}>{t(label)}</button>)}
              </div>
            </div>
            {error && <p className="err" role="alert">{error}</p>}
            {stats && <Chart points={stats.points} from={stats.now - RANGES[range]} to={stats.now} range={range} />}
            <div className="btn-row"><button type="button" onClick={() => { writeToken(''); setToken(''); setStats(null); }}>{t('Đăng xuất')}</button><button type="button" className="primary" onClick={onClose}>{t('Đóng')}</button></div>
          </>
        )}
      </div>
    </div>
  );
}

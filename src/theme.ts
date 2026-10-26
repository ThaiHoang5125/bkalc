import { useSyncExternalStore } from 'react';

/** Chế độ giao diện: Sáng / Tối / Theo hệ thống (mặc định). Lưu localStorage, áp bằng data-theme trên <html>. */
export type ThemePref = 'light' | 'dark' | 'system';
const KEY = 'hcmut-gpa-theme';

let pref: ThemePref = 'system';
try { const s = localStorage.getItem(KEY); if (s === 'light' || s === 'dark' || s === 'system') pref = s; } catch { /* bỏ qua */ }

const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
const subs = new Set<() => void>();

/** Chế độ đang thực sự áp dụng (đã quy đổi "theo hệ thống"). */
export const resolved = (): 'light' | 'dark' => (pref === 'system' ? (mq?.matches ? 'dark' : 'light') : pref);
export const getTheme = () => pref;

function apply() {
  if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', resolved());
  subs.forEach((f) => f());
}
export function setTheme(p: ThemePref) {
  pref = p;
  try { localStorage.setItem(KEY, p); } catch { /* bỏ qua */ }
  apply();
}
/** Nút chuyển nhanh: đảo giữa sáng và tối theo chế độ đang hiển thị. */
export const toggleTheme = () => setTheme(resolved() === 'dark' ? 'light' : 'dark');
mq?.addEventListener?.('change', () => { if (pref === 'system') apply(); });
apply();

const snapshot = () => pref + '|' + resolved();
export function useTheme(): { pref: ThemePref; mode: 'light' | 'dark' } {
  const s = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, snapshot, snapshot);
  const [p, m] = s.split('|');
  return { pref: p as ThemePref, mode: m as 'light' | 'dark' };
}

import { useSyncExternalStore } from 'react';

export type Lang = 'vi' | 'en';
export const LANGS: { id: Lang; label: string }[] = [{ id: 'vi', label: 'Tiếng Việt' }, { id: 'en', label: 'English' }];

/**
 * Khóa dịch là chính câu tiếng Việt gốc. `en` là bảng dịch sang tiếng Anh; thiếu khóa thì hiện tiếng Việt.
 * Tham số dạng {tên} được thay bằng giá trị truyền vào.
 */
const en: Record<string, string> = {};
export function registerEn(entries: Record<string, string>) { Object.assign(en, entries); }

const KEY = 'hcmut-gpa-lang';
let current: Lang = 'vi';
try { const s = localStorage.getItem(KEY); if (s === 'en' || s === 'vi') current = s;; } catch { /* bỏ qua */ }
const subs = new Set<() => void>();

export const getLang = () => current;
export function setLang(l: Lang) {
  current = l;
  try { localStorage.setItem(KEY, l); } catch { /* bỏ qua */ }
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  subs.forEach((f) => f());
}
export function useLang(): Lang {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, getLang, getLang);
}

type Vars = Record<string, string | number | null | undefined>;
/** Dịch một câu tiếng Việt gốc. Giá trị chữ truyền vào (vd. "Giỏi") cũng được dịch nếu có trong bảng. */
export function t(vi: string, vars?: Vars): string {
  const en_ = current === 'en';
  let s = en_ ? en[vi] ?? vi : vi;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => { if (!(k in vars)) return m; const v = vars[k]; return v === null || v === undefined ? '—' : en_ && typeof v === 'string' ? en[v] ?? v : String(v); });
  return s;
}
if (typeof document !== 'undefined') document.documentElement.lang = current;

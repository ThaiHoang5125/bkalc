import type { AppData } from '../engine';
import { COURSE_DB } from './programs';
import { ALL_COURSES } from './allCourses';

/** `abbr`: tên viết tắt từ danh sách tất cả các môn của trường, không đủ tin cậy để đối chiếu với tên người dùng nhập. */
export interface Entry { code: string; name: string; en?: string; credits?: number; origin: 'program' | 'transcript' | 'catalog'; abbr?: boolean }

/** Bỏ dấu, hạ chữ thường, gộp khoảng trắng: để tìm "giai tich" ra "Giải tích 1". */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export interface Lookup {
  entries: Entry[];
  nameOf(code: string): Entry | undefined;
  /** Môn có tên khớp hoàn toàn (không phân biệt dấu/hoa thường) */
  codeOf(name: string): Entry | undefined;
  search(q: string, limit?: number): Entry[];
  /** 'ok' khớp, 'mismatch' mã có nhưng tên khác hẳn, 'unknown' mã chưa có trong danh mục */
  check(code: string | undefined, name: string): { state: 'ok' | 'mismatch' | 'unknown'; expected?: Entry };
}

/** Gộp 4 nguồn theo thứ tự ưu tiên: chương trình đào tạo trong form Tiến độ > bảng điểm đã nhập > danh mục có sẵn (CTĐT Khoa Điện - Điện tử khóa 2023, 2024, 2026) > danh sách tất cả các môn của trường (chỉ bổ sung môn còn thiếu, tên viết tắt). */
export function buildLookup(data?: Pick<AppData, 'program' | 'attempts'>): Lookup {
  const map = new Map<string, Entry>();
  const put = (e: Entry) => { const k = e.code.toUpperCase(); if (!map.has(k)) map.set(k, { ...e, code: k }); };
  for (const g of data?.program?.groups ?? []) for (const c of g.courses) put({ code: c.code, name: c.name, credits: c.credits, origin: 'program' });
  for (const a of data?.attempts ?? []) if (a.code && a.name) put({ code: a.code, name: a.name, credits: a.credits, origin: 'transcript' });
  for (const [code, c] of Object.entries(COURSE_DB)) {
    const k = code.toUpperCase();
    const ex = map.get(k);
    if (ex) { if (!ex.en) ex.en = c.e; } else put({ code, name: c.n, en: c.e, credits: c.c, origin: 'catalog' });
  }
  for (const [code, [name, credits]] of Object.entries(ALL_COURSES)) put({ code, name, credits, origin: 'catalog', abbr: true });
  const entries = [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  const byName = new Map<string, Entry>();
  for (const e of entries) { const k = norm(e.name); if (!byName.has(k)) byName.set(k, e); }
  const nameOf = (code: string) => map.get(code.trim().toUpperCase());
  const codeOf = (name: string) => byName.get(norm(name));
  return {
    entries, nameOf, codeOf,
    search(q, limit = 8) {
      const n = norm(q);
      if (!n) return [];
      const score = (e: Entry) => {
        const c = norm(e.code), nm = norm(e.name), en = norm(e.en ?? '');
        if (c === n || nm === n) return 0;
        if (c.startsWith(n) || nm.startsWith(n)) return 1;
        if (nm.includes(n) || c.includes(n) || en.includes(n)) return 2;
        return 9;
      };
      return entries.map((e) => [score(e), e] as const).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0]).slice(0, limit).map(([, e]) => e);
    },
    check(code, name) {
      const e = code?.trim() ? nameOf(code) : undefined;
      if (!e || e.abbr) return { state: 'unknown' }; // tên viết tắt không dùng để báo lệch
      const a = norm(e.name), b = norm(name);
      if (!b || a === b || a.includes(b) || b.includes(a)) return { state: 'ok', expected: e };
      return { state: 'mismatch', expected: e };
    },
  };
}

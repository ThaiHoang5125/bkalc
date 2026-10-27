// Chương trình đào tạo do người dùng nhập thêm (ngành/khoa ngoài kho có sẵn trong programs.ts).
import type { ProgGroup, Program } from './programs';
import { COURSE_DB, PROGRAMS } from './programs';
import { parseCond } from './prereq';

export interface CourseName { n: string; e?: string; c: number }
/** Chương trình nhập thêm: cùng dạng với `Program` của kho, kèm tên môn (kho có sẵn để tên môn ở COURSE_DB). */
export interface CustomProgram extends Program { faculty?: string; names: Record<string, CourseName> }

export const MAX_CUSTOM = 30;

export const programsOf = (custom?: CustomProgram[]): Program[] => (custom?.length ? [...PROGRAMS, ...custom] : PROGRAMS);

/** Bảng tên môn gộp; tên trong kho có sẵn được ưu tiên. */
export const courseDbOf = (custom?: CustomProgram[]): Record<string, CourseName> =>
  custom?.length ? Object.assign({}, ...custom.map((p) => p.names), COURSE_DB) : COURSE_DB;

/** Tên môn theo chương trình đang xem: tên ghi trong chính chương trình đó được ưu tiên (tín chỉ có thể khác giữa các khoa). */
export const courseDbFor = (prog: Program | undefined, custom?: CustomProgram[]): Record<string, CourseName> => {
  const db = courseDbOf(custom);
  const own = (prog as CustomProgram | undefined)?.names;
  return own ? { ...db, ...own } : db;
};

export const isBuiltinId = (id: string) => PROGRAMS.some((p) => p.id === id);

const GROUP_KINDS = new Set(['bb', 'tc']);
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function cleanProgram(raw: unknown): CustomProgram | null {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== 'object') return null;
  const { id, year, major, majorName, credits, groups, courses, names } = o;
  if (typeof id !== 'string' || !id || typeof major !== 'string' || !major || typeof majorName !== 'string' || !majorName) return null;
  if (!num(year) || !Number.isInteger(year) || year < 2000 || year > 2100 || !num(credits) || credits <= 0 || credits > 400) return null;
  if (!Array.isArray(groups) || !groups.length || !Array.isArray(courses)) return null;
  const gs: ProgGroup[] = [];
  for (const g of groups as Record<string, unknown>[]) {
    if (!g || typeof g.t !== 'string' || !GROUP_KINDS.has(g.kind as string)) return null;
    gs.push({
      t: g.t, id: typeof g.id === 'string' ? g.id : '', lvl: num(g.lvl) && g.lvl >= 1 && g.lvl <= 4 ? Math.round(g.lvl) : 1, kind: g.kind as 'bb' | 'tc',
      ...(num(g.req) && g.req >= 0 ? { req: g.req, unit: g.unit === 'mon' ? ('mon' as const) : ('tc' as const) } : {}),
    });
  }
  const cs: [string, number, string][] = [];
  for (const c of courses as unknown[]) {
    if (!Array.isArray(c) || typeof c[0] !== 'string' || !c[0] || !num(c[1]) || !Number.isInteger(c[1]) || c[1] < 0 || c[1] >= gs.length) continue;
    cs.push([c[0], c[1], typeof c[2] === 'string' ? c[2] : '']);
  }
  const nm: Record<string, CourseName> = {};
  if (names && typeof names === 'object') {
    for (const [k, v] of Object.entries(names as Record<string, Record<string, unknown>>)) {
      if (v && typeof v.n === 'string' && num(v.c) && v.c >= 0 && v.c <= 50) nm[k] = { n: v.n, ...(typeof v.e === 'string' && v.e ? { e: v.e } : {}), c: v.c };
    }
  }
  return { id, year, major, majorName, credits, source: typeof o.source === 'string' ? o.source : '', groups: gs, courses: cs, names: nm, ...(typeof o.faculty === 'string' && o.faculty ? { faculty: o.faculty } : {}) };
}

/** Làm sạch danh sách đọc từ đĩa/JSON: bỏ mục hỏng, trùng mã, trùng với kho có sẵn. */
export function sanitizeCustomPrograms(raw: unknown): CustomProgram[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CustomProgram[] = [];
  for (const r of raw) {
    const p = cleanProgram(r);
    if (!p || seen.has(p.id) || isBuiltinId(p.id)) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length >= MAX_CUSTOM) break;
  }
  return out;
}

/** Cảnh báo (tiếng Việt) về chương trình vừa đọc, để người dùng xem trước khi lưu. */
export function validateProgram(p: CustomProgram): string[] {
  const w: string[] = [];
  const credOf = (code: string) => p.names[code]?.c ?? 0;
  const seen = new Map<string, number>();
  for (const [code, , cond] of p.courses) {
    seen.set(code, (seen.get(code) ?? 0) + 1);
    if (!p.names[code]) w.push(`Môn ${code} chưa có tên.`);
    if (cond && !parseCond(cond)) w.push(`Môn ${code}: không đọc được điều kiện đăng ký “${cond}”.`);
  }
  for (const [code, n] of seen) if (n > 1) w.push(`Mã ${code} xuất hiện ${n} lần.`);
  p.groups.forEach((g, gi) => {
    const cs = p.courses.filter((c) => c[1] === gi);
    const label = `${g.id ? g.id + '. ' : ''}${g.t}`;
    if (!cs.length) { w.push(`Nhóm “${label}” không có môn nào.`); return; }
    const sum = cs.reduce((s, c) => s + credOf(c[0]), 0);
    if (g.kind === 'bb' && g.req !== undefined && g.unit !== 'mon' && g.req !== sum) w.push(`Nhóm bắt buộc “${label}” yêu cầu ${g.req} TC nhưng tổng các môn là ${sum} TC.`);
    if (g.kind === 'tc' && g.req !== undefined && g.unit !== 'mon' && sum < g.req) w.push(`Nhóm tự chọn “${label}” yêu cầu ${g.req} TC nhưng chỉ liệt kê ${sum} TC.`);
  });
  const need = p.groups.reduce((s, g) => s + (g.unit === 'mon' ? 0 : g.req ?? 0), 0);
  if (need > p.credits) w.push(`Tổng tín chỉ yêu cầu của các nhóm (${need}) vượt tổng tín chỉ chương trình (${p.credits}).`);
  return w;
}

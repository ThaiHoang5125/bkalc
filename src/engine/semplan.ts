/**
 * Kế hoạch học tập 15 học kỳ sắp tới (mỗi năm học 2 học kỳ chính + 1 học kỳ hè), kiểm tra điều kiện
 * tiên quyết/học trước/song hành và tự xếp các môn bắt buộc còn lại.
 */
import { codesOf, parseCond } from '../data/prereq';
import type { Cond } from '../data/prereq';
import { nextSemester, semesterAt, semesterLabel, parseSemester } from './semester';

export interface PlanItem { code: string; name: string; credits: number }
export interface PlanData { sems: Record<string, PlanItem[]>; maxMain: number; maxSummer: number }
/** Số tín chỉ tối đa mỗi học kỳ chính / học kỳ hè (cố định). */
export const MAX_MAIN = 22;
export const MAX_SUMMER = 12;
export const DEFAULT_PLAN: PlanData = { sems: {}, maxMain: MAX_MAIN, maxSummer: MAX_SUMMER };
export const PLAN_SEMESTERS = 15;
/** Chuẩn 4 năm, tối đa 6 năm học */
export const STANDARD_YEARS = 4;
export const MAX_YEARS = 6;

/** Khóa nhập học từ 2 số đầu của MSSV: 2313095 → 2023. */
export function cohortOf(id?: string): number | null {
  const m = id?.trim().match(/^(\d{2})\d{4,}$/);
  return m ? 2000 + parseInt(m[1], 10) : null;
}

/** Các học kỳ từ HK đầu của khóa (HK{yy}1) đến hết `years` năm học, mỗi năm gồm HK1, HK2 và HK3 (hè). */
export function cohortSemesters(startYear: number, years = MAX_YEARS): string[] {
  const out: string[] = [];
  for (let y = 0; y < years; y++) for (const term of [1, 2, 3] as const) out.push(semesterLabel({ startYear: startYear + y, term }));
  return out;
}

/** Môn có thể xếp: lấy từ chương trình đào tạo. */
export interface PlanCourse { code: string; name: string; credits: number; cond: string; required: boolean; group?: string }

export function futureSemesters(now: Date = new Date(), n = PLAN_SEMESTERS): string[] {
  let s = semesterAt(now);
  const out: string[] = [];
  for (let i = 0; i < n; i++) { out.push(semesterLabel(s)); s = nextSemester(s); }
  return out;
}
export const isSummer = (label: string) => parseSemester(label)?.term === 3;
export const capOf = (label: string, _p?: PlanData) => (isSummer(label) ? MAX_SUMMER : MAX_MAIN);

export interface PlanCtx {
  /** Môn đã qua */
  passed: Set<string>;
  /** Môn đang học (xong vào cuối học kỳ hiện tại, chỉ số 0) */
  enrolled: Set<string>;
  /** Vị trí kỳ đã xếp: mã môn → chỉ số học kỳ */
  placed: Map<string, number>;
  /** Chỉ số học kỳ hiện tại trong danh sách học kỳ (mặc định 0) */
  nowIdx?: number;
  /** Tín chỉ đã tích lũy và đang học khi bắt đầu lập kế hoạch, cùng số tín chỉ tối thiểu để đăng ký thực tập ngoài trường (chuẩn C_TTNT); bỏ trống thì không kiểm tra */
  baseEarned?: number;
  internshipNeed?: number;
}

/** Năm môn chính trị phải học tuần tự (mỗi môn ở học kỳ sau môn trước); Pháp luật đại cương học chung với bất kỳ môn nào. */
export const POLITICAL_CHAIN: Record<string, string> = { SP1033: 'TQ[SP1031]', SP1035: 'TQ[SP1033]', SP1039: 'TQ[SP1035]', SP1037: 'TQ[SP1039]' };
export const withPolitical = (code: string, cond: string) => POLITICAL_CHAIN[code] ?? cond;

const HARD_BEFORE = new Set(['TQ', 'HT']);

function okLeaf(kind: string, code: string, idx: number, ctx: PlanCtx): boolean {
  if (kind === 'KN') return true;
  if (ctx.passed.has(code)) return true;
  const where = ctx.enrolled.has(code) ? (ctx.nowIdx ?? 0) : ctx.placed.get(code);
  if (where === undefined) return false;
  return HARD_BEFORE.has(kind) ? where < idx : where <= idx;
}

const evalCond = (c: Cond, idx: number, ctx: PlanCtx): boolean =>
  c.op === 'leaf' ? okLeaf(c.kind, c.code, idx, ctx) : c.op === 'OR' ? c.items.some((x) => evalCond(x, idx, ctx)) : c.items.every((x) => evalCond(x, idx, ctx));

/** Điều kiện còn thiếu khi học môn này ở học kỳ có chỉ số `idx` (rỗng = đủ). */
export function unmet(cond: string, idx: number, ctx: PlanCtx): string[] {
  const c = parseCond(cond);
  if (!c || evalCond(c, idx, ctx)) return [];
  const out: string[] = [];
  const walk = (x: Cond) => {
    if (x.op === 'leaf') { if (!okLeaf(x.kind, x.code, idx, ctx)) out.push(`${x.code} (${x.kind})`); return; }
    if (x.op === 'OR' && x.items.some((y) => evalCond(y, idx, ctx))) return;
    x.items.forEach(walk);
  };
  walk(c);
  return out;
}

/** Đồ án tốt nghiệp: được đăng ký ở cả kỳ hè, nhưng không trước các môn bắt buộc khác (Đồ án 2 phải ở kỳ trước), không tính Thực tập ngoài trường. Thực tập ngoài trường: đăng ký ở HK1 (đi thực tập HK2) hoặc HK2 (đi thực tập kỳ hè), không đăng ký ở kỳ hè. */
export const isThesis = (name: string) => /đồ án tốt nghiệp/i.test(name);
export const isInternship = (name: string) => /thực tập ngoài trường/i.test(name);
/** Môn giữ chỗ cho phần tự chọn / tự chọn tự do chưa chọn môn cụ thể (mã TCTD1, TCTD2…). */
export const PLACEHOLDER_NAME = 'Tự chọn (chưa chọn môn)';
export const isPlaceholder = (code: string) => /^TCTD\d+$/.test(code);

const hardCodes = (cond: string) => { const c = parseCond(cond); return c ? codesOf(c) : []; };

/** Mức tải mềm khi cân tải: kỳ chính tới 18 tín chỉ, kỳ hè 6 tín chỉ. */
export const SOFT_MAIN = 18;
export const SOFT_SUMMER = 6;

/**
 * Tự xếp các môn bắt buộc còn lại vào các học kỳ từ chỉ số `from`: môn nằm đầu chuỗi tiên quyết dài nhất được xếp trước
 * (rồi đến môn mở khóa nhiều môn khác), môn chỉ được xếp khi điều kiện đã đủ và học kỳ còn chỗ (theo số tín chỉ tối đa).
 * Ưu tiên cách xếp cân tải (kỳ chính ≤ SOFT_MAIN); nếu cách đó làm kế hoạch dài hơn hoặc không xếp hết thì dùng cách lấp đầy tới trần.
 */
export function autoPlan(courses: PlanCourse[], ctx: PlanCtx, labels: string[], plan: PlanData, from = 1): Record<string, PlanItem[]> {
  const lastUsed = (r: Record<string, PlanItem[]>) => labels.reduce((acc, l, i) => ((r[l] ?? []).length ? i : acc), -1);
  const full = autoPlanWith(courses, ctx, labels, plan, from, false);
  const soft = autoPlanWith(courses, ctx, labels, plan, from, true);
  const left = (r: Record<string, PlanItem[]>) => courses.filter((c) => c.required && !ctx.passed.has(c.code) && !ctx.enrolled.has(c.code) && !ctx.placed.has(c.code) && !labels.some((l) => (r[l] ?? []).some((x) => x.code === c.code))).length;
  return left(soft) <= left(full) && lastUsed(soft) <= lastUsed(full) ? soft : full;
}

function autoPlanWith(courses: PlanCourse[], ctx: PlanCtx, labels: string[], plan: PlanData, from: number, balanced: boolean): Record<string, PlanItem[]> {
  const sems: Record<string, PlanItem[]> = {};
  for (const l of labels) sems[l] = [...(plan.sems[l] ?? [])];
  const placed = new Map(ctx.placed);
  labels.forEach((l, i) => sems[l].forEach((it) => placed.set(it.code, i)));
  const todo = courses.filter((c) => c.required && !ctx.passed.has(c.code) && !ctx.enrolled.has(c.code) && !placed.has(c.code));
  const dependents = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const c of courses) for (const d of hardCodes(c.cond)) { dependents.set(d, (dependents.get(d) ?? 0) + 1); children.set(d, [...(children.get(d) ?? []), c.code]); }
  // độ dài chuỗi môn phải học nối tiếp sau môn này (đường găng); chặn vòng lặp điều kiện
  const height = new Map<string, number>();
  const heightOf = (code: string, seen: Set<string>): number => {
    const h = height.get(code);
    if (h !== undefined) return h;
    if (seen.has(code)) return 0;
    seen.add(code);
    const v = 1 + Math.max(0, ...(children.get(code) ?? []).map((k) => heightOf(k, seen)));
    seen.delete(code);
    height.set(code, v);
    return v;
  };
  todo.sort((a, b) => heightOf(b.code, new Set()) - heightOf(a.code, new Set()) || (dependents.get(b.code) ?? 0) - (dependents.get(a.code) ?? 0));
  for (let i = from; i < labels.length; i++) {
    const cap = Math.min(capOf(labels[i], plan), balanced ? (isSummer(labels[i]) ? SOFT_SUMMER : SOFT_MAIN) : Infinity);
    let used = sems[labels[i]].reduce((s, x) => s + x.credits, 0);
    let progress = true;
    while (progress) {
      progress = false;
      for (const c of todo) {
        if (placed.has(c.code) || used + c.credits > cap) continue;
        if (isThesis(c.name)) {
          const blocked = todo.some((o) => {
            if (o === c || isInternship(o.name)) return false;
            const at = placed.get(o.code);
            return at === undefined || at > i || (/đồ án 2/i.test(o.name) && at >= i);
          });
          if (blocked) continue;
        }
        if (isInternship(c.name) && isSummer(labels[i])) continue;
        if (isInternship(c.name) && ctx.internshipNeed !== undefined) {
          const before = (ctx.baseEarned ?? 0) + labels.slice(0, i).reduce((s, l) => s + sems[l].reduce((a, x) => a + x.credits, 0), 0);
          if (before < ctx.internshipNeed) continue;
        }
        if (unmet(c.cond, i, { ...ctx, placed }).length) continue;
        sems[labels[i]].push({ code: c.code, name: c.name, credits: c.credits });
        placed.set(c.code, i); used += c.credits; progress = true;
      }
    }
  }
  return sems;
}

/** Học kỳ (nhãn) mà tại đó tổng tín chỉ (đã có + kế hoạch từ `labels[0]` trở đi) đạt `total`, hoặc null nếu chưa đủ. */
export function graduationSemester(base: number, labels: string[], plan: PlanData, total: number): string | null {
  let sum = base;
  if (sum >= total) return labels[0] ?? null;
  for (const l of labels) {
    sum += (plan.sems[l] ?? []).reduce((s, x) => s + x.credits, 0);
    if (sum >= total) return l;
  }
  return null;
}

/**
 * Thêm các môn giữ chỗ (3 tín chỉ) vào các học kỳ chính còn chỗ, từ chỉ số `from`, cho đến khi bù đủ `shortfall` tín chỉ.
 * Dùng cho phần tự chọn và tự chọn tự do mà chương trình chỉ yêu cầu số tín chỉ chứ không chỉ định môn.
 */
export function fillPlaceholders(sems: Record<string, PlanItem[]>, labels: string[], from: number, shortfall: number, plan: PlanData = DEFAULT_PLAN, needs: ElectiveNeed[] = []): Record<string, PlanItem[]> {
  const out: Record<string, PlanItem[]> = {};
  for (const l of labels) out[l] = [...(sems[l] ?? [])];
  const used = new Set(Object.values(out).flat().map((x) => x.code));
  // mỗi phần giữ chỗ thuộc một nhóm tự chọn cụ thể (theo số tín chỉ nhóm còn thiếu); phần còn lại là tự chọn chung
  const queue: { name: string; left: number }[] = needs.filter((n) => n.credits > 0).map((n) => ({ name: n.name, left: n.credits }));
  const queued = queue.reduce((a, q) => a + q.left, 0);
  if (shortfall > queued) queue.push({ name: PLACEHOLDER_NAME, left: shortfall - queued });
  let n = 0;
  let left = shortfall;
  for (let i = from; i < labels.length && left > 0; i++) {
    const l = labels[i];
    if (isSummer(l)) continue;
    let load = out[l].reduce((s, x) => s + x.credits, 0);
    while (left > 0 && queue.length && load + 3 <= capOf(l, plan)) {
      let code = `TCTD${++n}`;
      while (used.has(code)) code = `TCTD${++n}`;
      const q = queue[0];
      const cr = Math.min(3, left, q.left);
      out[l].push({ code, name: q.name, credits: cr });
      used.add(code); load += cr; left -= cr; q.left -= cr;
      if (q.left <= 0) queue.shift();
    }
  }
  return out;
}

/** Số tín chỉ một nhóm tự chọn còn thiếu (chưa đạt, chưa đang học, chưa xếp môn cụ thể). */
export interface ElectiveNeed { name: string; credits: number }

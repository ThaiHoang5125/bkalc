import { bandOf, classify } from './scale';
import type { Attempt, RetakePolicy } from './types';
import { isValidCredits, isValidScore } from './validate';

export interface Summary {
  gpa: number | null; // thang 4
  avg10: number | null; // điểm TB hệ 10
  countedCredits: number; // TC tham gia tính GPA
  passedCredits: number; // TC tích lũy (đạt, kể cả điểm miễn MT)
  courses: number;
  qualityPoints: number; // Σ TC × điểm 4
  classification: string | null;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Khóa nhận diện "cùng một môn": ưu tiên mã môn. Môn nhập tay không có mã nhưng trùng tên với
 * môn đã có mã thì dùng mã đó, để học lại / cải thiện không bị đếm hai lần.
 */
export function keyer(all: Attempt[]) {
  const nameToCode = new Map<string, string>();
  for (const a of all) if (a.code) nameToCode.set(norm(a.name), a.code.trim().toUpperCase());
  return (a: Attempt) => (a.code ? a.code.trim().toUpperCase() : nameToCode.get(norm(a.name)) ?? norm(a.name));
}

/** Lần học có điểm số thật (0–10), không phải điểm đặc biệt, không bị loại trừ. Điểm ngoài [0, 10] bị bỏ qua. */
const numeric = (a: Attempt) => isValidScore(a.score) && !a.special && !a.excluded;
/** Tham gia tính GPA: có điểm số và có tín chỉ. */
const graded = (a: Attempt) => numeric(a) && isValidCredits(a.credits) && a.credits > 0;

function pick(list: Attempt[], policy: RetakePolicy): Attempt[] {
  if (policy === 'all' || list.length === 0) return list;
  let best = list[0];
  for (const a of list) {
    if (policy === 'latest') best = a;
    else if ((a.score as number) > (best.score as number)) best = a;
  }
  return [best];
}

/**
 * Các lần học được tính vào GPA sau khi áp quy tắc học lại / cải thiện:
 * mỗi môn chỉ lấy một lần (mặc định: điểm cao nhất).
 */
export function effectiveAttempts(all: Attempt[], policy: RetakePolicy): Attempt[] {
  const rows = all.filter(graded);
  if (policy === 'all') return rows;
  const k = keyer(all);
  const groups = new Map<string, Attempt[]>();
  for (const a of rows) groups.set(k(a), [...(groups.get(k(a)) ?? []), a]);
  const keep = new Set<Attempt>();
  for (const g of groups.values()) pick(g, policy).forEach((a) => keep.add(a));
  return rows.filter((a) => keep.has(a));
}

/**
 * Tín chỉ tích lũy: mỗi môn đạt được tính một lần.
 * Ưu tiên điểm số > điểm miễn (MT) > điểm đạt (DT), đúng thứ tự ưu tiên ghi trên form tiến độ.
 * Điểm miễn không tham gia GPA nhưng được cộng tín chỉ (nếu môn đó chưa có điểm số đạt).
 */
export function accumulatedCredits(all: Attempt[], policy: RetakePolicy): number {
  const k = keyer(all);
  const by = new Map<string, Attempt[]>();
  for (const a of all) if (!a.excluded) by.set(k(a), [...(by.get(k(a)) ?? []), a]);
  let total = 0;
  for (const list of by.values()) {
    const nums = list.filter((a) => isValidScore(a.score) && !a.special && isValidCredits(a.credits));
    const passed = pick(nums, policy).filter((a) => bandOf(a.score as number).passed);
    if (passed.length) { total += passed.reduce((s, a) => s + a.credits, 0); continue; }
    const mt = list.find((a) => a.special === 'MT');
    if (mt) { total += mt.credits; continue; }
    const dt = list.find((a) => a.special === 'DT');
    if (dt) total += dt.credits;
  }
  return total;
}

export function summarize(attempts: Attempt[], policy: RetakePolicy): Summary {
  const eff = effectiveAttempts(attempts, policy);
  let credits = 0, qp = 0, s10 = 0;
  for (const a of eff) {
    const b = bandOf(a.score as number);
    credits += a.credits;
    qp += a.credits * b.point;
    s10 += a.credits * (a.score as number);
  }
  const gpa = credits > 0 ? qp / credits : null;
  return {
    gpa,
    avg10: credits > 0 ? s10 / credits : null,
    countedCredits: credits,
    passedCredits: accumulatedCredits(attempts, policy),
    courses: eff.length,
    qualityPoints: qp,
    classification: gpa === null ? null : classify(gpa),
  };
}

/** Khóa sắp xếp của nhãn "Năm học 2025 - 2026 / Học kỳ 2"; null nếu nhãn tự đặt. */
export function semesterKey(label: string): number | null {
  const m = label.match(/(\d{4})\s*-\s*(\d{4}).*?(\d)\s*$/);
  return m ? parseInt(m[1], 10) * 10 + parseInt(m[3], 10) : null;
}

/** Thứ tự học kỳ theo thời gian; nếu có nhãn tự đặt thì giữ thứ tự nhập. */
export function orderSemesters(attempts: Attempt[]): string[] {
  const seen: string[] = [];
  for (const a of attempts) if (!seen.includes(a.semester)) seen.push(a.semester);
  const keys = seen.map(semesterKey);
  if (keys.some((k) => k === null)) return seen;
  return [...seen].sort((a, b) => (semesterKey(a) as number) - (semesterKey(b) as number));
}

export interface SemesterRow extends Summary {
  semester: string;
  /** TC đạt trong học kỳ (không tính điểm miễn), khớp dòng "Tích lũy học kỳ" của trường */
  semCredits: number;
  cumulativeGpa: number | null;
  cumulativeCredits: number;
}

/** GPA từng học kỳ + GPA và tín chỉ tích lũy đến hết học kỳ đó. */
export function bySemester(attempts: Attempt[], policy: RetakePolicy): SemesterRow[] {
  const order = orderSemesters(attempts);
  return order.map((sem, i) => {
    const inSem = attempts.filter((a) => a.semester === sem);
    const upto = attempts.filter((a) => order.indexOf(a.semester) <= i);
    const semSummary = summarize(inSem.filter((a) => !a.special), 'all');
    const cum = summarize(upto, policy);
    const semCredits = inSem
      .filter((a) => numeric(a) && bandOf(a.score as number).passed)
      .reduce((s, a) => s + a.credits, 0);
    return { semester: sem, ...semSummary, semCredits, cumulativeGpa: cum.gpa, cumulativeCredits: cum.passedCredits };
  });
}

export interface LetterRow { letter: string; credits: number; courses: number }

export function distribution(attempts: Attempt[], policy: RetakePolicy): LetterRow[] {
  const eff = effectiveAttempts(attempts, policy);
  const order = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'];
  return order.map((letter) => {
    const rows = eff.filter((a) => bandOf(a.score as number).letter === letter);
    return { letter, credits: rows.reduce((s, a) => s + a.credits, 0), courses: rows.length };
  });
}

/**
 * Ngưỡng tín chỉ rớt cho phép: 5% tổng số tín chỉ chương trình, lấy phần nguyên (132 TC → 6 TC).
 * Rớt tới 6 TC chưa bị hạ bằng; sang tín chỉ rớt thứ 7 thì bị hạ.
 */
export const FAIL_LIMIT_RATIO = 0.05;
export const failLimit = (totalCredits: number) => Math.floor(totalCredits * FAIL_LIMIT_RATIO + 1e-9);

/**
 * Tổng tín chỉ rớt: mọi lần học bị F (điểm < 4) đều được cộng, kể cả khi sau đó đã học lại và đạt.
 * Môn loại trừ, môn rút (RT) và môn chưa có điểm không tính.
 */
export function failedCredits(attempts: Attempt[]): number {
  return attempts.filter((a) => graded(a) && !bandOf(a.score as number).passed).reduce((s, a) => s + a.credits, 0);
}

const DOWNGRADE: Record<string, string> = { 'Xuất sắc': 'Giỏi', Giỏi: 'Khá' }; // Khá trở xuống không bị hạ

export interface DegreeClass {
  byGpa: string | null; // xếp loại theo GPA
  final: string | null; // xếp loại sau khi xét tín chỉ rớt
  failedCredits: number;
  limit: number;
  exceeded: boolean;
  downgraded: boolean;
}

/** Xếp loại bằng: GPA → hạ 1 bậc nếu tín chỉ rớt vượt 5% tổng TC (bằng Khá không bị hạ). */
export function degreeClass(attempts: Attempt[], gpa: number | null, totalCredits: number): DegreeClass {
  const failed = failedCredits(attempts);
  const limit = failLimit(totalCredits);
  const exceeded = failed > limit;
  const byGpa = gpa === null ? null : classify(gpa);
  const final = byGpa !== null && exceeded && DOWNGRADE[byGpa] ? DOWNGRADE[byGpa] : byGpa;
  return { byGpa, final, failedCredits: failed, limit, exceeded, downgraded: final !== byGpa };
}

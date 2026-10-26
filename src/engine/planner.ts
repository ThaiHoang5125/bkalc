import { t } from '../i18n';
import { GRADE_SCALE, bandOf, minScoreForLetter, pointOf } from './scale';
import type { Attempt, RetakePolicy } from './types';
import { effectiveAttempts, keyer, summarize } from './gpa';

/** Số tín chỉ nhỏ nhất của một môn: số tín chỉ điểm A được tách theo bội số này. */
export const STEP = 2;

export interface PlanOption {
  /** Mức điểm phổ biến thấp hơn trong cặp phối */
  lowLetter: string;
  highCredits: number; // số TC đạt điểm 4.0 (A/A+)
  lowCredits: number;
  note: string;
  /** GPA toàn khóa nếu phối điểm đúng như phương án */
  finalGpa: number;
}

export interface Plan {
  remainingCredits: number;
  requiredAvg: number | null; // điểm TB thang 4 cần đạt trên số TC còn lại
  feasible: boolean;
  status: 'achieved' | 'ok' | 'impossible' | 'no-credits';
  maxPossibleGpa: number | null;
  options: PlanOption[];
  /** N: tín chỉ đã tính GPA còn giữ đến cuối khóa (đã trừ môn F sẽ được học lại thay điểm) */
  base: number;
  /** S: Σ TC × điểm 4 của các tín chỉ đó */
  points: number;
}

/**
 * Tín chỉ của môn đang bị F (lần hiệu lực là F, chưa đạt bằng MT/DT): khi học lại, điểm mới thay điểm F
 * nên tín chỉ này nằm trong phần "còn lại", không được đếm thêm lần nữa ở mẫu số.
 * Quy tắc 'all' giữ mọi lần học trong GPA nên không trừ.
 */
export function pendingFailCredits(attempts: Attempt[], policy: RetakePolicy): number {
  if (policy === 'all') return 0;
  const k = keyer(attempts);
  const settled = new Set(attempts.filter((a) => !a.excluded && (a.special === 'MT' || a.special === 'DT')).map(k));
  return effectiveAttempts(attempts, policy).filter((a) => !bandOf(a.score as number).passed && !settled.has(k(a))).reduce((s, a) => s + a.credits, 0);
}

/**
 * Cần đạt GPA mục tiêu G sau khi học hết `remaining` TC nữa.
 * (S + R·x) / (N + R) >= G  →  x >= (G·(N+R) − S) / R
 * với N = TC đã tính GPA (trừ TC môn F sẽ học lại, xem `pendingFailCredits`), S = Σ TC × điểm 4.
 * Đây là dạng tổng quát của công thức "số TC A/B cần đạt" trong file Excel gốc.
 */
export function plan(
  attempts: Attempt[],
  policy: RetakePolicy,
  targetGpa: number,
  totalCredits: number,
  /** Tín chỉ đã tích lũy theo chương trình đào tạo (nếu đã nhập form tiến độ); mặc định lấy từ bảng điểm */
  earnedCredits?: number,
): Plan {
  const s = summarize(attempts, policy);
  const R = Math.max(0, totalCredits - (earnedCredits ?? s.passedCredits));
  const N = s.countedCredits - pendingFailCredits(attempts, policy);
  const S = s.qualityPoints;
  if (R === 0) {
    return { remainingCredits: 0, requiredAvg: null, feasible: s.gpa !== null && s.gpa >= targetGpa, status: 'no-credits', maxPossibleGpa: s.gpa, options: [], base: N, points: S };
  }
  const required = (targetGpa * (N + R) - S) / R;
  const maxGpa = (S + 4 * R) / (N + R);
  if (required <= 0) {
    return { remainingCredits: R, requiredAvg: required, feasible: true, status: 'achieved', maxPossibleGpa: maxGpa, options: [], base: N, points: S };
  }
  if (required > 4 + 1e-9) {
    return { remainingCredits: R, requiredAvg: required, feasible: false, status: 'impossible', maxPossibleGpa: maxGpa, options: [], base: N, points: S };
  }
  const options: PlanOption[] = [];
  const lows = GRADE_SCALE.filter((b) => ['B+', 'B', 'C+', 'C'].includes(b.letter));
  // Phương án "toàn bộ cùng một mức": mức thấp nhất mà vẫn đủ
  const enough = [...lows].reverse().find((b) => b.point >= required - 1e-9);
  if (enough) options.push({ lowLetter: enough.letter, highCredits: 0, lowCredits: R, note: t('Toàn bộ {R} tín chỉ chỉ cần {letter} là đủ', { R, letter: enough.letter }), finalGpa: (S + enough.point * R) / (N + R) });
  // Phương án phối A với một mức thấp hơn. Mỗi môn tối thiểu 2 tín chỉ nên số tín chỉ A được làm tròn lên theo bội của STEP.
  for (const low of lows) {
    if (low.point >= required - 1e-9) continue;
    const exact = ((required - low.point) / (4 - low.point)) * R;
    const x = Math.min(R, Math.ceil(exact / STEP - 1e-9) * STEP);
    if (x >= R) { if (!options.some((o) => o.lowCredits === 0 && o.highCredits === R)) options.push({ lowLetter: 'A', highCredits: R, lowCredits: 0, note: t('Cần toàn bộ {R} tín chỉ đạt điểm A', { R }), finalGpa: (S + 4 * R) / (N + R) }); continue; }
    options.push({ lowLetter: low.letter, highCredits: x, lowCredits: R - x, note: t('{x} tín chỉ điểm A + {y} tín chỉ điểm {letter}', { x, y: R - x, letter: low.letter }), finalGpa: (S + 4 * x + low.point * (R - x)) / (N + R) });
  }
  return { remainingCredits: R, requiredAvg: required, feasible: true, status: 'ok', maxPossibleGpa: maxGpa, options, base: N, points: S };
}

export interface Scenario { letter: string; point: number; gpa: number; delta: number }

/** GPA cuối nếu toàn bộ `remaining` TC còn lại cùng đạt một mức chữ. */
export function scenarios(attempts: Attempt[], policy: RetakePolicy, remaining: number): Scenario[] {
  const s = summarize(attempts, policy);
  if (s.gpa === null || remaining <= 0) return [];
  const N = s.countedCredits, S = s.qualityPoints;
  return [['A', 4], ['B+', 3.5], ['B', 3], ['C+', 2.5], ['C', 2], ['D+', 1.5], ['D', 1]].map(([letter, point]) => {
    const gpa = (S + (point as number) * remaining) / (N + remaining);
    return { letter: letter as string, point: point as number, gpa, delta: gpa - s.gpa! };
  });
}

export interface ImprovementSuggestion {
  attemptId: string;
  name: string;
  credits: number;
  currentLetter: string;
  targetLetter: string;
  gain: number; // GPA tăng thêm nếu chỉ cải thiện riêng môn này
}

/** Gợi ý môn đáng cải thiện nhất: GPA tăng bao nhiêu nếu nâng riêng môn đó lên mức `targetLetter`. */
export function improvementSuggestions(
  attempts: Attempt[],
  policy: RetakePolicy,
  targetLetter: string,
  limit = 8,
): ImprovementSuggestion[] {
  const tp = pointOf(minScoreForLetter(targetLetter) ?? 8);
  const base = summarize(attempts, policy);
  if (base.gpa === null) return [];
  const eff = effectiveAttempts(attempts, policy);
  const out: ImprovementSuggestion[] = [];
  for (const a of eff) {
    const cur = pointOf(a.score as number);
    if (cur >= tp) continue;
    const gain = (a.credits * (tp - cur)) / base.countedCredits;
    out.push({
      attemptId: a.id,
      name: a.name,
      credits: a.credits,
      currentLetter: GRADE_SCALE.find((b) => (a.score as number) >= b.min)!.letter,
      targetLetter,
      gain,
    });
  }
  return out.sort((x, y) => y.gain - x.gain).slice(0, limit);
}

export interface WhatIfChange { attemptId: string; newScore: number }

/** Giả lập: đổi điểm một số môn, trả GPA mới. Không sửa dữ liệu gốc. */
export function whatIf(attempts: Attempt[], policy: RetakePolicy, changes: WhatIfChange[]) {
  const map = new Map(changes.map((c) => [c.attemptId, c.newScore]));
  const modified = attempts.map((a) => (map.has(a.id) ? { ...a, score: map.get(a.id)! } : a));
  const before = summarize(attempts, policy);
  const after = summarize(modified, policy);
  return { before, after, delta: (after.gpa ?? 0) - (before.gpa ?? 0) };
}

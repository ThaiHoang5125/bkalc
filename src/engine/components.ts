import { t } from '../i18n';
import { GRADE_SCALE } from './scale';
import type { Component } from './types';

/** Điểm tổng kết được làm tròn tới 1 chữ số thập phân (Quy định học vụ, Điều 17.2). */
export const round1 = (x: number) => Math.round(x * 10 + 1e-9) / 10;

export const letterOfTotal = (total: number) => (GRADE_SCALE.find((b) => round1(total) >= b.min) ?? GRADE_SCALE[GRADE_SCALE.length - 1]).letter;

export interface ComponentSummary {
  weightSum: number;
  /** Điểm đã chắc chắn (Σ trọng số × điểm đã có), thang 10 */
  secured: number;
  /** Trọng số của các thành phần đã có điểm */
  doneWeight: number;
  /** Các thành phần chưa có điểm nhưng đã nhập điểm dự kiến */
  planned: Component[];
  /** Các thành phần chưa có điểm và chưa dự kiến → cần tính */
  free: Component[];
  freeWeight: number;
  /** Điểm tổng kết thấp nhất / cao nhất còn có thể đạt */
  minTotal: number;
  maxTotal: number;
  /** Thành phần bị 0 điểm (đã có hoặc dự kiến): quy tắc “có thành phần 0 điểm thì rớt môn” */
  zero: Component | null;
}

export function summarizeComponents(cs: Component[]): ComponentSummary {
  const done = cs.filter((c) => c.score !== null);
  const planned = cs.filter((c) => c.score === null && c.planned != null);
  const free = cs.filter((c) => c.score === null && c.planned == null);
  const sum = (xs: Component[], f: (c: Component) => number) => xs.reduce((s, c) => s + f(c), 0);
  const secured = sum(done, (c) => (c.weight * (c.score as number)) / 100) + sum(planned, (c) => (c.weight * (c.planned as number)) / 100);
  const freeWeight = sum(free, (c) => c.weight);
  return {
    weightSum: sum(cs, (c) => c.weight),
    secured,
    doneWeight: sum(done, (c) => c.weight),
    planned, free, freeWeight,
    minTotal: secured,
    maxTotal: secured + (freeWeight * 10) / 100,
    zero: cs.find((c) => c.score === 0 || (c.score === null && c.planned === 0)) ?? null,
  };
}

export type TargetState = 'done' | 'ok' | 'impossible' | 'failed';
export interface TargetResult {
  letter: string;
  /** Điểm tổng kết (đã làm tròn) tối thiểu để đạt mức chữ này */
  minTotal: number;
  state: TargetState;
  /** Điểm trung bình cần đạt trên các thành phần còn lại (hệ 10); null nếu không còn thành phần nào */
  needed: number | null;
  /** Làm tròn lên 0,5 (điểm thành phần được chấm theo bước 0,5) */
  neededStep: number | null;
  /** Đã đủ điểm dù các phần còn lại thấp, nhưng mỗi phần vẫn phải khác 0 (0 điểm là rớt môn) */
  positiveOnly?: boolean;
}

/** Cần bao nhiêu điểm ở các thành phần còn lại để tổng kết đạt `letter`. */
export function targetFor(cs: Component[], letter: string): TargetResult {
  const band = GRADE_SCALE.find((b) => b.letter === letter);
  const min = band ? band.min : 0;
  const s = summarizeComponents(cs);
  if (s.zero) return { letter, minTotal: min, state: 'failed', needed: null, neededStep: null };
  const need = min - 0.05 - s.secured; // phần điểm tổng kết còn thiếu (đã trừ biên làm tròn)
  if (s.freeWeight <= 0) {
    return { letter, minTotal: min, state: need <= 1e-9 ? 'done' : 'impossible', needed: null, neededStep: null };
  }
  const x = (need * 100) / s.freeWeight;
  if (x <= 1e-9) return { letter, minTotal: min, state: 'done', needed: 0, neededStep: 0, positiveOnly: true };
  const exact = Math.ceil(x * 10 - 1e-9) / 10;
  const step = Math.ceil(x * 2 - 1e-9) / 2;
  if (x > 10 + 1e-9) return { letter, minTotal: min, state: 'impossible', needed: exact, neededStep: step };
  return { letter, minTotal: min, state: 'ok', needed: exact, neededStep: Math.min(10, step) };
}

export interface TradeRow { a: number; b: number | null; ok: boolean; fail: boolean; positive: boolean }

/**
 * Với đúng hai thành phần chưa có điểm: nếu thành phần `given` được điểm a thì thành phần còn lại cần tối thiểu b.
 * `given` = 0 hoặc 1 (vị trí trong danh sách hai thành phần còn trống). Điểm 0 ở bất kỳ phần nào là rớt môn.
 */
export function tradeoff(cs: Component[], letter: string, step = 0.5, given: 0 | 1 = 0): TradeRow[] {
  const s = summarizeComponents(cs);
  if (s.free.length !== 2 || s.zero) return [];
  const g = s.free[given], o = s.free[1 - given];
  const min = GRADE_SCALE.find((b) => b.letter === letter)?.min ?? 0;
  const out: TradeRow[] = [];
  for (let v = 0; v <= 10 + 1e-9; v += step) {
    if (v === 0) { out.push({ a: 0, b: null, ok: false, fail: true, positive: false }); continue; }
    const need = ((min - 0.05 - s.secured - (g.weight * v) / 100) * 100) / o.weight;
    if (need > 10 + 1e-9) out.push({ a: v, b: null, ok: false, fail: false, positive: false });
    else if (need <= 0) out.push({ a: v, b: 0, ok: true, fail: false, positive: true });
    else out.push({ a: v, b: Math.min(10, Math.ceil(need * 2 - 1e-9) / 2), ok: true, fail: false, positive: false });
  }
  return out;
}

/** Ngưỡng đánh giá độ vừa sức: so điểm cần đạt (hệ 10) với điểm trung bình hệ 10 hiện tại (`base`). */
export const EFFORT_OFFSETS = { easy: -1, fit: 0.5, hard: 1.5 } as const;
export const EFFORT_FALLBACK_AVG = 7;

/** Mức độ "vừa sức" của điểm cần đạt, so với điểm trung bình hệ 10 của chính sinh viên. */
export function effort(needed: number | null, avg10: number | null): { label: string; level: 0 | 1 | 2 | 3 | 4 } {
  if (needed === null) return { label: '—', level: 0 };
  const base = avg10 ?? EFFORT_FALLBACK_AVG;
  if (needed > 10) return { label: 'Không khả thi', level: 4 };
  if (needed <= 0) return { label: 'Đã đủ', level: 0 };
  if (needed <= base + EFFORT_OFFSETS.easy) return { label: 'Dễ', level: 0 };
  if (needed <= base + EFFORT_OFFSETS.fit) return { label: 'Vừa sức', level: 1 };
  if (needed <= base + EFFORT_OFFSETS.hard) return { label: 'Cần cố gắng', level: 2 };
  return { label: 'Rất khó', level: 3 };
}

/** Mốc dùng để so điểm cần đạt của MỘT môn đang học (xem effortBase). */
export interface EffortBase {
  /** Mốc so sánh = α × P + (1 − α) × TB toàn bộ */
  base: number;
  /** P: trung bình có trọng số của các thành phần ĐÃ CÓ điểm thật của môn (null nếu chưa có) */
  p: number | null;
  /** α: tỷ lệ trọng số đã có điểm thật (0–1) */
  alpha: number;
  /** TB hệ 10 toàn bộ dùng làm nền (7 nếu chưa có điểm nào) */
  avg: number;
  fallback: boolean;
  /** Dữ liệu còn ít (dưới 2 thành phần hoặc dưới 40% trọng số) → ước lượng sơ bộ */
  rough: boolean;
  /** Chênh giữa thành phần cao nhất và thấp nhất đã có (null nếu dưới 2 thành phần) */
  spread: number | null;
}
export const ROUGH_ALPHA = 0.4;
export const SPREAD_WARN = 2.5;

/**
 * Mốc đánh giá độ vừa sức cho một môn: pha trộn điểm các thành phần đã có của chính môn đó (P)
 * với điểm trung bình hệ 10 toàn bộ, theo tỷ lệ trọng số đã có điểm (α). Càng có nhiều điểm thành phần
 * thì càng dựa vào môn đó; chưa có thì dùng trung bình toàn bộ. Điểm "dự kiến" không được tính.
 */
export function effortBase(cs: Component[], avg10: number | null): EffortBase {
  const avg = avg10 ?? EFFORT_FALLBACK_AVG;
  const done = cs.filter((c) => c.score !== null && c.weight > 0);
  const wDone = done.reduce((s, c) => s + c.weight, 0);
  const wAll = cs.reduce((s, c) => s + c.weight, 0);
  if (!done.length || wAll <= 0) return { base: avg, p: null, alpha: 0, avg, fallback: avg10 === null, rough: false, spread: null };
  const p = done.reduce((s, c) => s + c.weight * (c.score as number), 0) / wDone;
  const alpha = Math.min(1, wDone / wAll);
  const scores = done.map((c) => c.score as number);
  return {
    base: alpha * p + (1 - alpha) * avg, p, alpha, avg, fallback: avg10 === null,
    rough: done.length < 2 || alpha < ROUGH_ALPHA,
    spread: done.length >= 2 ? Math.max(...scores) - Math.min(...scores) : null,
  };
}

/** Ngưỡng đánh giá mức khó của điểm trung bình thang 4 cần đạt cho các tín chỉ còn lại. */
export const HARDNESS_STEPS: { max: number; label: string; cls: 'good' | 'warn' | 'bad' }[] = [
  { max: 2.0, label: 'Dễ', cls: 'good' },
  { max: 2.8, label: 'Vừa sức', cls: 'good' },
  { max: 3.4, label: 'Cần cố gắng', cls: 'warn' },
  { max: 3.75, label: 'Khó', cls: 'warn' },
  { max: 4.0, label: 'Rất khó', cls: 'bad' },
];
export function hardness(x: number): { label: string; cls: 'good' | 'warn' | 'bad' } {
  return HARDNESS_STEPS.find((h) => x <= h.max) ?? { label: 'Không thể', cls: 'bad' };
}

export type GoalMode = 'letter' | 'components' | 'score';
export const GOAL_LETTERS = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D'];

/** Đủ điều kiện lấy điểm trung bình thành phần: tổng trọng số 100% và mọi thành phần đều đã có điểm thật. */
export function componentsComplete(cs: Component[]): boolean {
  return cs.length > 0 && Math.abs(cs.reduce((s, c) => s + c.weight, 0) - 100) < 0.01 && cs.every((c) => c.score !== null);
}

export interface GoalResult {
  /** Điểm tổng kết (hệ 10) dùng để cộng vào GPA; null nếu chưa xác định được */
  score: number | null;
  letter: string | null;
  failed: boolean;
  /** Lý do chưa xác định được điểm */
  note?: string;
}

/**
 * Điểm giả định của một môn đang học khi tính vào GPA tích lũy chung, theo 3 cách:
 * - letter: đúng mức tối thiểu của mức chữ mong muốn (thành phần 0 điểm thì F; không thể đạt thì null);
 * - components: điểm trung bình các thành phần đã nhập (chỉ khi nhập đủ);
 * - score: điểm hệ 10 người dùng tự nhập.
 */
export function resolveGoal(a: { components?: Component[]; goal?: string; goalMode?: GoalMode; goalScore?: number }): GoalResult {
  const cs = a.components ?? [];
  const mode = a.goalMode ?? 'letter';
  const fromScore = (s: number): GoalResult => { const r = round1(s); return { score: r, letter: letterOfTotal(r), failed: r < 4 }; };
  if (mode === 'score') {
    return typeof a.goalScore === 'number' && a.goalScore >= 0 && a.goalScore <= 10 ? fromScore(a.goalScore) : { score: null, letter: null, failed: false, note: t('Chưa nhập điểm') };
  }
  if (mode === 'components') {
    if (!componentsComplete(cs)) return { score: null, letter: null, failed: false, note: t('Chưa nhập đủ điểm thành phần') };
    if (cs.some((c) => c.score === 0)) return { score: 0, letter: 'F', failed: true };
    return fromScore(summarizeComponents(cs).secured);
  }
  const letter = a.goal ?? 'B';
  const r = targetFor(cs, letter);
  if (r.state === 'failed') return { score: 0, letter: 'F', failed: true };
  if (r.state === 'impossible') return { score: null, letter, failed: false, note: t('Không thể đạt {letter}', { letter }) };
  return { score: r.minTotal, letter, failed: false };
}

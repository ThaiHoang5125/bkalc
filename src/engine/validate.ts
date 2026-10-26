import type { Attempt } from './types';

export const SCORE_MIN = 0;
export const SCORE_MAX = 10;

/** Điểm hệ 10 hợp lệ: số hữu hạn trong [0, 10]. */
export const isValidScore = (s: unknown): s is number => typeof s === 'number' && Number.isFinite(s) && s >= SCORE_MIN && s <= SCORE_MAX;

/** Số tín chỉ hợp lệ: số hữu hạn, không âm (0 được phép: môn chứng chỉ, sinh hoạt…). */
export const isValidCredits = (c: unknown): c is number => typeof c === 'number' && Number.isFinite(c) && c >= 0;

/** Các lỗi của một lần học (tiếng Việt, dùng để hiện cho người dùng); rỗng = hợp lệ. Điểm null = chưa có điểm, không phải lỗi. */
export function validateAttempt(a: Pick<Attempt, 'name' | 'credits' | 'score'>): string[] {
  const errs: string[] = [];
  if (!a.name || !a.name.trim()) errs.push('Nhập tên môn học.');
  if (!isValidCredits(a.credits)) errs.push('Số tín chỉ phải là số không âm.');
  if (a.score !== null && !isValidScore(a.score)) errs.push('Điểm phải trong khoảng 0–10.');
  return errs;
}

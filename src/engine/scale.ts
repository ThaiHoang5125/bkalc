import type { Classification, GradeBand } from './types';

/**
 * Thang điểm: điểm 4 theo bảng quy đổi trong file KD Study; điểm chữ đã đối chiếu với form bảng điểm của trường.
 * Giữ ở dạng dữ liệu để đổi quy chế mà không phải sửa logic.
 * Sắp xếp giảm dần theo `min`.
 */
export const GRADE_SCALE: GradeBand[] = [
  { min: 9.5, letter: 'A+', point: 4.0, passed: true }, // theo form trường: 9.4 → A, 9.5 → A+
  { min: 8.5, letter: 'A', point: 4.0, passed: true }, // A và A+ cùng 4.0
  { min: 8.0, letter: 'B+', point: 3.5, passed: true },
  { min: 7.0, letter: 'B', point: 3.0, passed: true },
  { min: 6.5, letter: 'C+', point: 2.5, passed: true },
  { min: 5.5, letter: 'C', point: 2.0, passed: true },
  { min: 5.0, letter: 'D+', point: 1.5, passed: true },
  { min: 4.0, letter: 'D', point: 1.0, passed: true },
  { min: 0, letter: 'F', point: 0, passed: false },
];

/** Xếp loại theo GPA thang 4 (dùng cho học lực / tốt nghiệp). */
export const CLASSIFICATIONS: Classification[] = [
  { min: 3.6, label: 'Xuất sắc' },
  { min: 3.2, label: 'Giỏi' },
  { min: 2.5, label: 'Khá' },
  { min: 2.0, label: 'Trung bình' },
  { min: 1.0, label: 'Yếu' },
  { min: 0, label: 'Kém' },
];

export function bandOf(score: number, scale: GradeBand[] = GRADE_SCALE): GradeBand {
  const s = Math.round(score * 100) / 100;
  return scale.find((b) => s >= b.min) ?? scale[scale.length - 1];
}

export const letterOf = (score: number) => bandOf(score).letter;
export const pointOf = (score: number) => bandOf(score).point;

export function classify(gpa: number): string {
  // Trường giữ GPA 2 chữ số thập phân và xếp loại theo dải điểm trên số đó (Giỏi 3,20–3,59; Khá 2,50–3,19), nên làm tròn 2 chữ số trước khi so mốc.
  const g = Math.round((gpa + 1e-9) * 100) / 100;
  return (CLASSIFICATIONS.find((c) => g >= c.min) ?? CLASSIFICATIONS[CLASSIFICATIONS.length - 1]).label;
}

/** Điểm 10 nhỏ nhất đạt được mức chữ cho trước. */
export function minScoreForLetter(letter: string): number | null {
  return GRADE_SCALE.find((b) => b.letter === letter)?.min ?? null;
}

export const SPECIAL_CODES: Record<string, string> = {
  CT: 'Cấm thi', VT: 'Vắng thi', CH: 'Chưa có điểm', RT: 'Rút môn học', KD: 'Không đạt',
  VP: 'Vắng thi có phép', DT: 'Điểm đạt', HT: 'Hoãn thi', MT: 'Điểm miễn',
};

/** Trên form của trường, điểm đặc biệt được in kèm mã số: MT = 12, RT = 17, DT = 21. */
export const SPECIAL_NUMERIC: Record<number, 'MT' | 'RT' | 'DT'> = { 12: 'MT', 17: 'RT', 21: 'DT' };

export const isSpecialCode = (s: string): s is keyof typeof SPECIAL_CODES => s in SPECIAL_CODES;

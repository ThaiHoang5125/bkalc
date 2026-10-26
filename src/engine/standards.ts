/**
 * Các “chuẩn” của trường (Bảng tổng hợp quy định các chuẩn, áp dụng từ HK1/2026-2027, mybk.hcmut.edu.vn).
 * App chỉ kiểm tra phần tự tính được từ dữ liệu có sẵn và CHỈ cảnh báo khi dữ liệu cho thấy chắc chắn thiếu;
 * thiếu dữ liệu thì im lặng. Không còn mục nào người dùng phải tự nhập hay tích xác nhận.
 */

import type { AppData } from './types';
import { bandOf } from './scale';

/** Dữ liệu chuẩn lưu trong hồ sơ: chỉ còn mã các chuẩn 0 tín chỉ đọc từ bảng điểm (CCGDTC, SA4001, ENG_GC_600…). */
export interface StandardsData {
  certs?: string[];
}
export const DEFAULT_STANDARDS: StandardsData = {};

/** Mô tả các mã chuẩn 0 tín chỉ xuất hiện trong bảng điểm và tiến độ */
export const CERT_INFO: { re: RegExp; label: string }[] = [
  { re: /^CCGDTC$/, label: 'Chứng chỉ Giáo dục thể chất (CCGDTC)' },
  { re: /^SA4001$/, label: 'Hoạt động sinh viên (SA4001)' },
  { re: /^ENG_GC/, label: 'Điều kiện tiếng Anh tốt nghiệp (ENG_GC)' },
];
export const isCertCode = (code: string) => CERT_INFO.some((c) => c.re.test(code.toUpperCase()));

/** Tín chỉ tích lũy tối thiểu để đăng ký môn thuộc năm 2, 3, 4 (SV_N2, SV_N3, SV_N4). */
export const LEVEL_CREDITS: Record<number, number> = { 2: 28, 3: 56, 4: 56 };
/** Tỷ lệ tín chỉ chương trình để đăng ký thực tập ngoài trường (C_TTNT) và đồ án chuyên ngành / Đồ án 2 (C_ĐACN). */
export const TTNT_PCT = 65;
export const DACN_PCT = 70;
/** Điểm trung bình tích lũy tối thiểu để đăng ký đồ án và học phần tốt nghiệp. */
export const MIN_GPA = 2;

/** Trình độ năm mà mã môn đòi hỏi: chữ số đầu của phần số (1xxx → 1, 3xxx → 3). */
export const courseLevel = (code: string): number => { const m = /^[A-Za-z]{2}(\d)/.exec(code); return m ? Math.min(4, +m[1]) : 1; };

export const ENGLISH_CODES = ['LA1003', 'LA1005', 'LA1007', 'LA1009'];
/** Số môn Anh văn (từ LA1003) cần có cho chuẩn trình độ năm: năm 2 → 1; năm 3 → 3 (khóa từ 2024 là 4); năm 4 → 4. */
export function englishNeeded(level: number, cohort: number | null): number {
  if (level <= 1) return 0;
  if (level === 2) return 1;
  if (level === 3) return (cohort ?? 0) >= 2024 ? 4 : 3;
  return 4;
}
/** Số tín chỉ cần có (làm tròn lên) cho chuẩn theo tỷ lệ phần trăm tín chỉ chương trình. */
export const needCredits = (pct: number, required: number) => Math.ceil((pct * required) / 100 - 1e-9);

/**
 * Mã môn đã đạt, đọc từ bảng điểm: có điểm đạt (kể cả môn đánh dấu “không tính GPA” như GDQP, GDTC), điểm miễn MT / đạt DT,
 * và các chuẩn 0 tín chỉ không in trên bảng điểm.
 */
export function passedCodes(data: AppData): Set<string> {
  const out = new Set<string>();
  for (const a of data.attempts) {
    if (!a.code) continue;
    if (a.special === 'MT' || a.special === 'DT' || (a.score !== null && !a.special && bandOf(a.score).passed)) out.add(a.code.toUpperCase());
  }
  for (const c of data.standards?.certs ?? []) out.add(c.toUpperCase());
  return out;
}

/** Mã môn mà dữ liệu có nhắc tới (dòng trong bảng điểm hoặc môn trong chương trình đào tạo): cơ sở để biết một môn “thật sự chưa đạt”. */
export function seenCodes(data: AppData): Set<string> {
  const out = new Set<string>();
  for (const a of data.attempts) if (a.code) out.add(a.code.toUpperCase());
  for (const g of data.program?.groups ?? []) for (const c of g.courses) out.add(c.code.toUpperCase());
  return out;
}

export interface LevelCtx {
  cohort: number | null;
  /** Có dữ liệu bảng điểm hay chưa (chưa có thì không cảnh báo gì) */
  hasData: boolean;
  /** Tín chỉ tích lũy dự kiến trước kỳ xét (đã tích lũy + đang học + đã xếp ở các kỳ trước) */
  credits: number;
  /** Mã môn đã đạt, đang học hoặc đã xếp ở kỳ trước */
  done: Set<string>;
  /** Mã môn mà dữ liệu có nhắc tới */
  seen: Set<string>;
}
export type LevelIssue =
  | { kind: 'credits'; have: number; need: number }
  | { kind: 'english'; n: number; missing: string[] }
  | { kind: 'gdqp' }
  | { kind: 'gdtc' };

/**
 * Các điều kiện còn thiếu cho chuẩn trình độ năm `level` (2, 3, 4):
 * tín chỉ tích lũy dự kiến, Anh văn (kể cả điểm miễn), và từ năm 3 là GDQP, GDTC.
 * Chỉ báo mục thật sự thiếu theo dữ liệu; không xét CNTTCB, CTXH, chuyên đề.
 */
export function levelIssues(level: number, c: LevelCtx): LevelIssue[] {
  if (level < 2 || !c.hasData) return [];
  const out: LevelIssue[] = [];
  const need = LEVEL_CREDITS[Math.min(level, 4)];
  if (c.credits < need) out.push({ kind: 'credits', have: c.credits, need });
  const n = englishNeeded(level, c.cohort);
  const missing = ENGLISH_CODES.slice(0, n).filter((x) => !c.done.has(x) && c.seen.has(x));
  if (missing.length) out.push({ kind: 'english', n, missing });
  if (level >= 3) {
    if (!c.done.has('MI1003') && !c.done.has('CCGDQP') && c.seen.has('MI1003')) out.push({ kind: 'gdqp' });
    const pe = ['PE1001', 'PE1002'];
    if (!c.done.has('CCGDTC') && pe.some((x) => !c.done.has(x) && c.seen.has(x))) out.push({ kind: 'gdtc' });
  }
  return out;
}

const round2 = (v: number) => Math.round((v + 1e-9) * 100) / 100;
/** Điểm trung bình tích lũy chắc chắn dưới 2.0 (chưa có điểm thì không kết luận). */
export const gpaTooLow = (gpa: number | null) => gpa !== null && round2(gpa) < MIN_GPA;

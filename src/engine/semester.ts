/**
 * Quy ước học kỳ (theo lịch năm học HCMUT, do người dùng cung cấp):
 *   HK1: 24/08 → 31/12 của năm bắt đầu năm học      (ví dụ 2026-2027 HK1 = HK261)
 *   HK2: 01/01 → 31/05 của năm kết thúc năm học     (HK262)
 *   HK3 (học kỳ hè): 01/06 → 23/08                  (HK263)
 * Chỉ mốc 24/08 → 31/12 của HK1 là do người dùng nêu; mốc HK2/HK3 là suy ra, sửa ở đây nếu lịch trường khác.
 */
import { t } from '../i18n';

export interface SemesterId { startYear: number; term: 1 | 2 | 3 }

export const semesterLabel = (s: SemesterId) => `Năm học ${s.startYear} - ${s.startYear + 1} / Học kỳ ${s.term}`;
export const semesterCode = (s: SemesterId) => `HK${String(s.startYear).slice(-2)}${s.term}`;

/** Học kỳ đang diễn ra tại `date` (giờ địa phương). */
export function semesterAt(date: Date = new Date()): SemesterId {
  const y = date.getFullYear();
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  if (md >= 824) return { startYear: y, term: 1 };
  if (md <= 531) return { startYear: y - 1, term: 2 };
  return { startYear: y - 1, term: 3 };
}

export function nextSemester(s: SemesterId): SemesterId {
  return s.term === 1 ? { startYear: s.startYear, term: 2 } : s.term === 2 ? { startYear: s.startYear, term: 3 } : { startYear: s.startYear + 1, term: 1 };
}

/** Đọc nhãn "Năm học 2025 - 2026 / Học kỳ 2" (có thể kèm " (HK252)"). */
export function parseSemester(label: string): SemesterId | null {
  const m = label.match(/(\d{4})\s*-\s*(\d{4})\s*\/?\s*H[oọ]c\s*k[yỳ]\s*(\d)/i);
  if (!m) return null;
  const term = parseInt(m[3], 10);
  return term >= 1 && term <= 3 ? { startYear: parseInt(m[1], 10), term: term as 1 | 2 | 3 } : null;
}

/** Nhãn chuẩn để lưu và so khớp (bỏ phần “(HK252)” nếu có). */
export const canonSemester = (label: string) => {
  const p = parseSemester(label);
  return p ? semesterLabel(p) : label.trim();
};

/** Nhãn để hiển thị: “Năm học 2026 - 2027 / Học kỳ 1 (HK261)”. */
export const semesterDisplay = (label: string) => {
  const p = parseSemester(label);
  return p ? `${t('Năm học {a} - {b} / Học kỳ {term}', { a: p.startYear, b: p.startYear + 1, term: p.term })} (${semesterCode(p)})` : label;
};

/** Mã ngắn “HK261” (dùng ở chỗ hẹp như trục biểu đồ); nhãn tự đặt giữ nguyên. */
export const semesterShort = (label: string) => {
  const p = parseSemester(label);
  return p ? semesterCode(p) : label;
};

/** Danh sách học kỳ để chọn: các học kỳ đã có + học kỳ hiện tại + học kỳ kế tiếp, mới nhất ở trên. */
export function semesterChoices(existing: string[], now: Date = new Date()): { value: string; label: string; current: boolean }[] {
  const cur = semesterAt(now);
  const curLabel = semesterLabel(cur);
  const set = new Set<string>(existing.map(canonSemester));
  set.add(curLabel); set.add(semesterLabel(nextSemester(cur)));
  const key = (l: string) => { const p = parseSemester(l); return p ? p.startYear * 10 + p.term : -1; };
  return [...set].sort((a, b) => key(b) - key(a)).map((value) => ({ value, label: semesterDisplay(value) + (value === curLabel ? t(' · hiện tại') : ''), current: value === curLabel }));
}

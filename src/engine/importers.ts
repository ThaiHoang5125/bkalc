import type { Attempt } from './types';

let seq = 0;
export const newId = () => `a${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const num = (s: string) => {
  const v = parseFloat(s.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
};

/**
 * Dán nhiều dòng từ Excel / bảng điểm. Mỗi dòng: Tên môn <tab|;|,> Số TC <tab|;|,> Điểm 10 [<tab> Học kỳ].
 * Dòng không hợp lệ được trả về trong `errors` (kèm số dòng) thay vì bỏ qua âm thầm.
 */
export function parsePasted(text: string, defaultSemester: string) {
  const attempts: Attempt[] = [];
  const errors: { line: number; text: string; reason: string }[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/[\r\n]+$/, '').replace(/^ +/, ''); // giữ tab cuối: ô điểm trống = môn đang học
    if (!line.trim()) return;
    const parts = (line.includes('\t') ? line.split('\t') : line.split(/[;|]/)).map((p) => p.trim());
    if (parts.length < 3) return void errors.push({ line: i + 1, text: raw, reason: 'Cần ít nhất 3 cột: tên, số tín chỉ, điểm' });
    const credits = num(parts[1]);
    const score = parts[2] === '' ? null : num(parts[2]);
    if (!parts[0]) return void errors.push({ line: i + 1, text: raw, reason: 'Thiếu tên môn' });
    if (credits === null || credits <= 0 || credits > 20) return void errors.push({ line: i + 1, text: raw, reason: 'Số tín chỉ không hợp lệ' });
    if (parts[2] !== '' && (score === null || score < 0 || score > 10)) return void errors.push({ line: i + 1, text: raw, reason: 'Điểm phải trong khoảng 0–10' });
    attempts.push({ id: newId(), name: parts[0], credits, score, semester: parts[3] || defaultSemester, source: 'paste' });
  });
  return { attempts, errors };
}

/** Chuyển ma trận ô (từ ExcelJS) của sheet "Kết quả học tập" thành danh sách môn. */
export function fromKdStudyRows(rows: { name: unknown; credits: unknown; score: unknown }[], semester = 'Đã nhập từ Excel') {
  const attempts: Attempt[] = [];
  for (const r of rows) {
    const name = typeof r.name === 'string' ? r.name.trim() : '';
    const credits = typeof r.credits === 'number' ? r.credits : NaN;
    const score = typeof r.score === 'number' ? r.score : NaN;
    if (!name || !(credits > 0) || !(score >= 0 && score <= 10)) continue;
    attempts.push({ id: newId(), name, credits, score, semester, source: 'excel' });
  }
  return attempts;
}

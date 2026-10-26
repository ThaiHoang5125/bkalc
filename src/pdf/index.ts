import { buildLines } from './lines';
import type { Item, Line } from './lines';
import { parseProgress } from './progress';
import type { ProgressResult } from './progress';
import { parseTranscript } from './transcript';
import type { TranscriptResult } from './transcript';

export type { Item, Line } from './lines';
export type { ProgressResult } from './progress';
export type { TranscriptResult } from './transcript';
export { buildLines };

export type PdfResult = TranscriptResult | ProgressResult;

/** Nhận dạng form theo tiêu đề rồi phân tích tương ứng. */
export function parsePdfLines(lines: Line[]): PdfResult {
  const all = lines.map((l) => l.text).join('\n');
  const progressScore = [/Tiến độ hoàn thành chương trình đào tạo/i, /Số tín chỉ tích lũy:\s*\d+\s*\/\s*\d+/, /Điểm TBTL hệ\s*(10|4)/, /Áp dụng từ năm/, /Ngành:/, /Độ ưu tiên thứ tự khi xét hoàn thành/, /Khối kiến thức/].filter((r) => r.test(all)).length;
  const transScore = [/BẢNG ĐIỂM|Bảng điểm môn học/i, /Tích lũy (chung|học kỳ)/, /Năm học\s*\d{4}\s*-\s*\d{4}/, /Học kỳ\s*\d/, /Các điểm đặc biệt|Danh mục các điểm khác/i].filter((r) => r.test(all)).length;
  if (progressScore >= 3 && progressScore >= transScore) return parseProgress(lines);
  if (transScore >= 2) return parseTranscript(lines);
  if (progressScore >= 2) return parseProgress(lines);
  throw new Error('Không nhận ra đây là form "Bảng điểm" hay "Tiến độ hoàn thành chương trình đào tạo" của HCMUT.');
}

export const parsePdfItems = (pages: Item[][]) => parsePdfLines(buildLines(pages));

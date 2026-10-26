import { buildLines } from './pdf';
import { extractItems } from './pdf/extract';
import { ocrAvailable, ocrOne } from './ocr/read';
import type { OcrPage } from './ocr/layout';
import { t } from './i18n';

/** Gom các từ OCR thành dòng chữ (theo tâm dọc, từ trái sang phải). */
export function ocrToLines(page: OcrPage): string[] {
  const words = [...page.words].filter((w) => w.text.trim()).sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
  const hs = words.map((w) => w.y1 - w.y0).sort((a, b) => a - b);
  const tol = (hs[Math.floor(hs.length / 2)] ?? 10) * 0.6;
  const rows: typeof words[] = [];
  for (const w of words) {
    const last = rows[rows.length - 1];
    const cy = (w.y0 + w.y1) / 2;
    if (last && Math.abs((last[0].y0 + last[0].y1) / 2 - cy) <= tol) last.push(w); else rows.push([w]);
  }
  return rows.map((r) => r.sort((a, b) => a.x0 - b.x0).map((w) => w.text).join(' '));
}

/** Đọc một file (PDF, ảnh, văn bản) thành các dòng chữ để phân tích thời khóa biểu. Mọi xử lý diễn ra trên máy. */
export async function readTimetableLines(f: File): Promise<{ lines: string[]; ocr: boolean }> {
  if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') {
    const pages = await extractItems(await f.arrayBuffer());
    const lines = buildLines(pages).map((l) => l.text);
    if (!lines.length) throw new Error(t('PDF không có chữ (có thể là bản quét). Hãy chụp màn hình rồi nhập bằng ảnh.'));
    return { lines, ocr: false };
  }
  if (/^image\//.test(f.type) || /\.(png|jpe?g|bmp|webp)$/i.test(f.name)) {
    if (!ocrAvailable()) throw new Error(t('Đọc ảnh chỉ có trong bản cài trên máy tính (file .exe), không có khi mở bằng trình duyệt.'));
    return { lines: ocrToLines(await ocrOne(f)), ocr: true };
  }
  return { lines: (await f.text()).split(/\r?\n/), ocr: false };
}

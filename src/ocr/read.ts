import type { AppData } from '../engine';
import { buildLookup } from '../data/lookup';
import { detectKind, parseOcr } from './layout';
import type { OcrPage, OcrResult } from './layout';
import { t } from '../i18n';

/** Có thể đọc ảnh không (chỉ bản Electron cài trên máy, vì OCR chạy offline trong tiến trình chính). */
export const ocrAvailable = () => typeof window !== 'undefined' && typeof window.gpaApi?.ocr === 'function';

/** Vẽ ảnh ra canvas (chuyển xám, nền trắng) ở tỉ lệ `scale` và trả về PNG: tesseract chỉ đọc được png/jpg/bmp nên webp cũng đi qua đây. */
export async function prepare(file: File, scale = 1): Promise<Uint8Array> {
  const bmp = await createImageBitmap(file);
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
  ctx.filter = 'grayscale(1)';
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob: Blob = await new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error(t('Không xử lý được ảnh')))), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
/** Chiều cao chữ trung vị (px) và độ tin cậy trung bình của một trang OCR. */
const stats = (pg: OcrPage) => {
  const ws = pg.words.filter((w) => w.text.length >= 2);
  return { h: median(ws.map((w) => w.y1 - w.y0)), conf: ws.length ? ws.reduce((t, w) => t + w.conf, 0) / ws.length : 0 };
};
const TARGET_H = 26; // chiều cao chữ (px) mà tesseract đọc tốt nhất

export async function ocrOne(f: File): Promise<OcrPage> {
  const api = window.gpaApi!;
  const run = async (scale: number) => { const r = await api.ocr(await prepare(f, scale)); if (!r.ok) throw new Error(r.error); return r.page; };
  const first = await run(1);
  const st = stats(first);
  // Ảnh chụp màn hình thường có chữ nhỏ (~14 px): phóng lên để chữ cỡ ~26 px rồi đọc lại, lấy lần đọc tin cậy hơn
  if (st.h > 0 && st.h < 20) {
    const second = await run(Math.min(3.5, TARGET_H / st.h));
    if (stats(second).conf >= st.conf - 1) return second;
  }
  return first;
}

export interface OcrOutcome { label: string; result?: OcrResult; error?: string }

/**
 * Đọc nhiều ảnh: các ảnh cùng loại form được ghép lại theo thứ tự chọn thành một bảng
 * (ví dụ nhiều ảnh cuộn trang của Bảng điểm), khác loại thì tách thành kết quả riêng.
 */
export async function readImages(files: File[], data: Pick<AppData, 'program' | 'attempts'>, onProgress?: (done: number, total: number) => void): Promise<OcrOutcome[]> {
  const pages: { page: OcrPage; name: string }[] = [];
  const out: OcrOutcome[] = [];
  let done = 0;
  for (const f of files) {
    try {
      pages.push({ page: await ocrOne(f), name: f.name });
    } catch (e) { out.push({ label: f.name, error: t('Không đọc được ảnh: {v1}', { v1: (e as Error).message }) }); }
    onProgress?.(++done, files.length);
  }
  const lk = buildLookup(data);
  const fix = (c: string) => { const e = lk.nameOf(c); return e ? { name: e.name, credits: e.credits } : undefined; };
  const codes = lk.entries.map((e) => [e.code, e.name] as [string, string]);
  const groups = new Map<string, { page: OcrPage; name: string }[]>();
  const unknown: string[] = [];
  for (const p of pages) {
    const k = detectKind([p.page]);
    if (!k) unknown.push(p.name); else groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  // Một ảnh chỉ chứa phần giữa của bảng (không có tiêu đề) vẫn được nhận nếu đã có ảnh cùng loại; ảnh còn lại báo lỗi.
  const known = [...groups.keys()];
  if (unknown.length && known.length === 1) { groups.get(known[0])!.push(...pages.filter((p) => unknown.includes(p.name))); unknown.length = 0; }
  for (const n of unknown) out.push({ label: n, error: t('Không nhận ra đây là ảnh “Bảng điểm” hay “Tiến độ hoàn thành chương trình đào tạo”. Hãy chụp rõ cả bảng (kèm tiêu đề ở ảnh đầu), chữ không bị cắt.') });
  for (const [, g] of groups) {
    const label = g.length === 1 ? g[0].name : t('{n} ảnh', { n: g.length });
    try { out.push({ label, result: parseOcr(g.map((x) => x.page), fix, codes) }); }
    catch (e) { out.push({ label, error: (e as Error).message }); }
  }
  return out;
}

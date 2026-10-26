import type { Item } from './lines';

/** Đọc PDF bằng pdf.js ngay trong ứng dụng (không gửi file đi đâu), trả về các mảnh chữ kèm toạ độ. */
export async function extractItems(data: ArrayBuffer): Promise<Item[][]> {
  const pdfjs = await import('pdfjs-dist');
  // Chạy "worker" ngay trong luồng chính: Electron mở trang từ file:// nên Web Worker module không dùng được.
  const { WorkerMessageHandler } = await import('pdfjs-dist/build/pdf.worker.min.mjs');
  (globalThis as unknown as { pdfjsWorker: unknown }).pdfjsWorker = { WorkerMessageHandler };
  pdfjs.GlobalWorkerOptions.workerSrc ||= 'pdf.worker.min.mjs';
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data), useSystemFonts: true }).promise;
  const pages: Item[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    pages.push(tc.items.flatMap((i) => ('str' in i ? [{ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width }] : [])));
  }
  await doc.destroy();
  return pages;
}

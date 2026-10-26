const KEY = 'hcmut-gpa-data-v1';

/** Đọc / ghi file dữ liệu của ứng dụng (Electron: thư mục userData; trình duyệt: localStorage). */
export async function readStored(): Promise<string | null> {
  if (window.gpaApi) return window.gpaApi.load();
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export async function writeStored(text: string): Promise<void> {
  if (window.gpaApi) { await window.gpaApi.save(text); return; }
  try { localStorage.setItem(KEY, text); } catch { /* chế độ riêng tư: bỏ qua */ }
}

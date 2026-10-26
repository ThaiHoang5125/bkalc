/** Nhắc sao lưu: lần đầu có dữ liệu chỉ bắt đầu đếm ngày, sau 30 ngày thì nhắc. */
export const BACKUP_KEY = 'hcmut-gpa-last-backup';
export const DAY = 86400000;
export const readBackup = () => { try { return Number(localStorage.getItem(BACKUP_KEY)) || 0; } catch { return 0; } };
export const writeBackup = (v: number) => { try { localStorage.setItem(BACKUP_KEY, String(v)); } catch { /* bỏ qua */ } };
/** Số ngày kể từ lần sao lưu gần nhất (0 nếu chưa có mốc hoặc chưa có dữ liệu). */
export function backupDays(hasData: boolean): number {
  const last = readBackup();
  if (!last) { if (hasData) writeBackup(Date.now()); return 0; }
  return hasData ? Math.floor((Date.now() - last) / DAY) : 0;
}
/** Nhắc lại sau 1 tuần: lùi mốc để còn 7 ngày nữa mới đủ 30 ngày. */
export const snoozeBackup = () => writeBackup(Date.now() - 23 * DAY);

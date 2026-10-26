import type { AppData } from './engine';
import { parseStored, unlockAccount } from './accounts';
import type { VaultAccount } from './accounts';
import { readStored, writeStored } from './storage';
import { emptyData, sanitize } from './store';

/** `locked`: file còn tài khoản mã hóa của bản cũ, cần mật khẩu để chuyển; ngược lại `data` là dữ liệu đã đọc (đã qua sanitize). */
export type Loaded = { locked: VaultAccount[]; data: null } | { locked: null; data: AppData };

let chain: Promise<void> = Promise.resolve();
/** Ghi dữ liệu ra file / localStorage; các lần ghi được xếp hàng để không ghi chồng nhau. */
export const saveData = (d: AppData): Promise<void> => {
  const text = JSON.stringify(d);
  chain = chain.then(() => writeStored(text)).catch(() => undefined);
  return chain;
};

export async function loadData(): Promise<Loaded> {
  const s = parseStored(await readStored());
  if (s.kind === 'locked') return { locked: s.accounts, data: null };
  let data = emptyData();
  if (s.json) { try { data = sanitize(JSON.parse(s.json)); } catch { /* dữ liệu hỏng → trống */ } }
  return { locked: null, data };
}

/** Giải mã dữ liệu của một tài khoản cũ. Mật khẩu sai thì ném lỗi `wrong-password`. */
export async function unlockLegacy(a: VaultAccount, password: string): Promise<AppData> {
  const json = await unlockAccount(a, password);
  try { return sanitize(JSON.parse(json)); } catch { return emptyData(); }
}

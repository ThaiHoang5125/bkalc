/**
 * Dữ liệu cũ dạng tài khoản cục bộ (accounts-v1): mỗi tài khoản được mã hóa AES-GCM bằng khóa suy ra từ mật khẩu (PBKDF2-SHA256).
 * App đã bỏ tài khoản; mã ở đây chỉ còn để mở khóa dữ liệu cũ một lần rồi chuyển sang dạng lưu thường.
 */
export interface VaultAccount { id: string; name: string; salt: string; iter: number; iv: string; ct: string; created: number; updated: number }
/** `plain`: dữ liệu lưu thường (hoặc chưa có gì); `locked`: file còn tài khoản mã hóa cần mật khẩu để chuyển. */
export type Stored = { kind: 'plain'; json: string | null } | { kind: 'locked'; accounts: VaultAccount[] };

const dec = new TextDecoder();
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function parseStored(text: string | null): Stored {
  if (!text) return { kind: 'plain', json: null };
  try {
    const o = JSON.parse(text) as Record<string, unknown>;
    if (o && o.format === 'accounts-v1' && Array.isArray(o.accounts)) {
      const accounts = (o.accounts as Record<string, unknown>[]).filter((a) => a && typeof a.id === 'string' && typeof a.name === 'string' && typeof a.salt === 'string' && typeof a.iv === 'string' && typeof a.ct === 'string' && typeof a.iter === 'number')
        .map((a) => ({ id: a.id as string, name: a.name as string, salt: a.salt as string, iter: a.iter as number, iv: a.iv as string, ct: a.ct as string, created: Number(a.created) || 0, updated: Number(a.updated) || 0 }));
      return accounts.length ? { kind: 'locked', accounts } : { kind: 'plain', json: null };
    }
    if (o && Array.isArray(o.attempts)) return { kind: 'plain', json: text };
  } catch { /* file hỏng */ }
  return { kind: 'plain', json: null };
}

/** Mở tài khoản cũ; mật khẩu sai thì ném lỗi `wrong-password`. */
export async function unlockAccount(a: VaultAccount, password: string): Promise<string> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: fromB64(a.salt) as BufferSource, iterations: a.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  try {
    return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(a.iv) as BufferSource }, key, fromB64(a.ct) as BufferSource));
  } catch { throw new Error('wrong-password'); }
}

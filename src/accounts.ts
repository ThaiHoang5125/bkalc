/**
 * Tài khoản cục bộ: nhiều tài khoản trong một ứng dụng, dữ liệu của mỗi tài khoản được mã hóa AES-GCM bằng khóa suy ra từ mật khẩu (PBKDF2-SHA256).
 * Mọi thứ chỉ nằm trong file dữ liệu của ứng dụng trên máy này; không có mã nào gửi dữ liệu ra ngoài.
 * Quên mật khẩu thì không khôi phục được (chỉ xóa tài khoản và tạo lại, hoặc nạp từ file sao lưu).
 */
export interface VaultAccount { id: string; name: string; salt: string; iter: number; iv: string; ct: string; created: number; updated: number }
export interface Vault { format: 'accounts-v1'; accounts: VaultAccount[]; last?: string }
export interface Parsed { vault: Vault; /** Dữ liệu cũ (trước khi có tài khoản), chưa mã hóa */ legacy: string | null }

export const ITERATIONS = 200_000;
const enc = new TextEncoder(), dec = new TextDecoder();

const toB64 = (b: Uint8Array) => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n));

export const emptyVault = (): Vault => ({ format: 'accounts-v1', accounts: [] });

export function parseStored(text: string | null): Parsed {
  if (!text) return { vault: emptyVault(), legacy: null };
  try {
    const o = JSON.parse(text) as Record<string, unknown>;
    if (o && o.format === 'accounts-v1' && Array.isArray(o.accounts)) {
      const accounts = (o.accounts as Record<string, unknown>[]).filter((a) => a && typeof a.id === 'string' && typeof a.name === 'string' && typeof a.salt === 'string' && typeof a.iv === 'string' && typeof a.ct === 'string' && typeof a.iter === 'number')
        .map((a) => ({ id: a.id as string, name: a.name as string, salt: a.salt as string, iter: a.iter as number, iv: a.iv as string, ct: a.ct as string, created: Number(a.created) || 0, updated: Number(a.updated) || 0 }));
      return { vault: { format: 'accounts-v1', accounts, ...(typeof o.last === 'string' ? { last: o.last } : {}) }, legacy: null };
    }
    if (o && Array.isArray(o.attempts)) return { vault: emptyVault(), legacy: text };
  } catch { /* file hỏng */ }
  return { vault: emptyVault(), legacy: null };
}

async function deriveKey(password: string, salt: Uint8Array, iter: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(key: CryptoKey, json: string) {
  const iv = rand(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, enc.encode(json)));
  return { iv: toB64(iv), ct: toB64(ct) };
}

export const normName = (s: string) => s.trim().replace(/\s+/g, ' ');
export const nameTaken = (v: Vault, name: string, exceptId?: string) => v.accounts.some((a) => a.id !== exceptId && normName(a.name).toLowerCase() === normName(name).toLowerCase());

export async function createAccount(name: string, password: string, json: string): Promise<{ account: VaultAccount; key: CryptoKey }> {
  const salt = rand(16);
  const key = await deriveKey(password, salt, ITERATIONS);
  const now = Date.now();
  return { account: { id: toB64(rand(9)).replace(/[+/=]/g, 'x'), name: normName(name), salt: toB64(salt), iter: ITERATIONS, ...(await seal(key, json)), created: now, updated: now }, key };
}

/** Mở tài khoản; mật khẩu sai thì ném lỗi. */
export async function unlockAccount(a: VaultAccount, password: string): Promise<{ json: string; key: CryptoKey }> {
  const key = await deriveKey(password, fromB64(a.salt), a.iter);
  try {
    const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(a.iv) as BufferSource }, key, fromB64(a.ct) as BufferSource);
    return { json: dec.decode(buf), key };
  } catch { throw new Error('wrong-password'); }
}

export async function sealAccount(a: VaultAccount, key: CryptoKey, json: string): Promise<VaultAccount> {
  return { ...a, ...(await seal(key, json)), updated: Date.now() };
}

export async function changePassword(a: VaultAccount, oldPw: string, newPw: string): Promise<{ account: VaultAccount; key: CryptoKey }> {
  const { json } = await unlockAccount(a, oldPw);
  const salt = rand(16);
  const key = await deriveKey(newPw, salt, ITERATIONS);
  return { account: { ...a, salt: toB64(salt), iter: ITERATIONS, ...(await seal(key, json)), updated: Date.now() }, key };
}

export const serialize = (v: Vault) => JSON.stringify(v);

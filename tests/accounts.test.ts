import { describe, expect, it } from 'vitest';
import { parseStored, unlockAccount } from '../src/accounts';
import type { VaultAccount } from '../src/accounts';
import { unlockLegacy } from '../src/persist';

const enc = new TextEncoder();
const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));

/** Tạo một tài khoản đúng định dạng accounts-v1 của bản cũ (AES-GCM, khóa PBKDF2-SHA256), để kiểm thử việc chuyển dữ liệu. */
async function legacyAccount(name: string, password: string, json: string, iter = 1000): Promise<VaultAccount> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(json)));
  return { id: 'a1', name, salt: b64(salt), iter, iv: b64(iv), ct: b64(ct), created: 1, updated: 1 };
}

describe('chuyển dữ liệu từ tài khoản cũ (mã hóa)', () => {
  it('mở đúng mật khẩu, từ chối sai mật khẩu', async () => {
    const acc = await legacyAccount('A', 'matkhau1', '{"x":1}');
    expect(atob(acc.ct)).not.toContain('"x"'); // không lộ dữ liệu thô (so trên byte đã giải base64)
    expect(await unlockAccount(acc, 'matkhau1')).toBe('{"x":1}');
    await expect(unlockAccount(acc, 'sai')).rejects.toThrow('wrong-password');
  });
  it('unlockLegacy trả dữ liệu đã qua sanitize; dữ liệu hỏng thì trả dữ liệu trống', async () => {
    const good = await legacyAccount('A', 'abcd', JSON.stringify({ version: 2, attempts: [], settings: {} }));
    expect((await unlockLegacy(good, 'abcd')).attempts).toEqual([]);
    const bad = await legacyAccount('B', 'abcd', 'khong phai json');
    expect((await unlockLegacy(bad, 'abcd')).attempts).toEqual([]);
    await expect(unlockLegacy(good, 'sai')).rejects.toThrow('wrong-password');
  });
  it('đọc file: trống, dữ liệu thường, vault cũ, vault rỗng, file hỏng', async () => {
    expect(parseStored(null)).toEqual({ kind: 'plain', json: null });
    const plain = JSON.stringify({ version: 2, attempts: [], settings: {} });
    expect(parseStored(plain)).toEqual({ kind: 'plain', json: plain });
    const acc = await legacyAccount('A', 'abcd', '{}');
    const locked = parseStored(JSON.stringify({ format: 'accounts-v1', accounts: [acc], last: 'a1' }));
    expect(locked.kind === 'locked' && locked.accounts).toHaveLength(1);
    expect(parseStored(JSON.stringify({ format: 'accounts-v1', accounts: [] }))).toEqual({ kind: 'plain', json: null });
    expect(parseStored('{khong phai json')).toEqual({ kind: 'plain', json: null });
  });
});

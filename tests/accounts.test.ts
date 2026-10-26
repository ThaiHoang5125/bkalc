import { describe, expect, it } from 'vitest';
import { changePassword, createAccount, emptyVault, nameTaken, parseStored, sealAccount, serialize, unlockAccount } from '../src/accounts';

describe('tài khoản cục bộ (mã hóa)', () => {
  it('tạo, mở đúng mật khẩu, từ chối sai mật khẩu', async () => {
    const { account } = await createAccount('  Nguyễn  A ', 'matkhau1', '{"x":1}');
    expect(account.name).toBe('Nguyễn A');
    expect(account.ct).not.toContain('"x"'); // không lộ dữ liệu thô
    expect((await unlockAccount(account, 'matkhau1')).json).toBe('{"x":1}');
    await expect(unlockAccount(account, 'sai')).rejects.toThrow('wrong-password');
  });
  it('ghi lại dùng IV mới, vẫn mở được', async () => {
    const { account, key } = await createAccount('A', 'abcd', '{"a":1}');
    const next = await sealAccount(account, key, '{"a":2}');
    expect(next.iv).not.toBe(account.iv);
    expect((await unlockAccount(next, 'abcd')).json).toBe('{"a":2}');
  });
  it('đổi mật khẩu: mật khẩu cũ hết hiệu lực', async () => {
    const { account } = await createAccount('A', 'abcd', '{"a":1}');
    const { account: n } = await changePassword(account, 'abcd', 'efgh');
    await expect(unlockAccount(n, 'abcd')).rejects.toThrow();
    expect((await unlockAccount(n, 'efgh')).json).toBe('{"a":1}');
    await expect(changePassword(account, 'sai', 'zzzz')).rejects.toThrow();
  });
  it('đọc file: dữ liệu cũ, vault mới, file hỏng', async () => {
    expect(parseStored(null).legacy).toBeNull();
    const old = JSON.stringify({ version: 2, attempts: [], settings: {} });
    expect(parseStored(old).legacy).toBe(old);
    const { account } = await createAccount('A', 'abcd', '{}');
    const v = { ...emptyVault(), accounts: [account] };
    const p = parseStored(serialize(v));
    expect(p.vault.accounts).toHaveLength(1);
    expect(p.legacy).toBeNull();
    expect(nameTaken(p.vault, ' a ')).toBe(true);
    expect(parseStored('{khong phai json').vault.accounts).toHaveLength(0);
  });
});

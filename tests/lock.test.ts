import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

const { hashCode, check, createGuard } = createRequire(import.meta.url)('../electron/lock.cjs');

const salt = '00112233445566778899aabbccddeeff';
const hash = hashCode('mã-thử-nghiệm-1', salt);

describe('khóa bảo trì', () => {
  it('chỉ chấp nhận đúng mã', () => {
    expect(check('mã-thử-nghiệm-1', salt, hash)).toBe(true);
    expect(check('mã-thử-nghiệm-2', salt, hash)).toBe(false);
    expect(check('', salt, hash)).toBe(false);
  });
  it('chưa cấu hình mã thì từ chối mọi mã', () => {
    expect(check('bất kỳ', '', '')).toBe(false);
  });
  it('sai đủ số lần thì khóa tạm rồi tự mở lại', () => {
    let t = 1000;
    const g = createGuard({ salt, hash, maxTries: 3, lockMs: 5000, now: () => t });
    expect(g.attempt('sai').triesLeft).toBe(2);
    expect(g.attempt('sai').triesLeft).toBe(1);
    expect(g.attempt('sai').locked).toBe(true);
    expect(g.attempt('mã-thử-nghiệm-1').ok).toBe(false); // đang khóa, kể cả nhập đúng
    t += 5001;
    expect(g.attempt('mã-thử-nghiệm-1').ok).toBe(true);
  });
  it('mã đã cấu hình trong app là băm hợp lệ, không phải chuỗi rỗng', () => {
    const src = require('node:fs').readFileSync('electron/lock.cjs', 'utf8');
    expect(src).toMatch(/const SALT = '[0-9a-f]{32}';/);
    expect(src).toMatch(/const HASH = '[0-9a-f]{64}';/);
  });
});

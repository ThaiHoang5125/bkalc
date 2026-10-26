import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const { resolveUserDataDir } = createRequire(import.meta.url)('../electron/userdata.cjs');

const roots: string[] = [];
const setup = () => {
  const root = mkdtempSync(join(tmpdir(), 'bkalc-ud-'));
  roots.push(root);
  return { oldDir: join(root, 'HCMUT GPA'), newDir: join(root, 'BKalc') };
};
afterEach(() => { while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true }); });

describe('chuyển thư mục dữ liệu HCMUT GPA → BKalc', () => {
  it('máy mới: dùng thư mục BKalc, không tạo gì thêm', () => {
    const { oldDir, newDir } = setup();
    expect(resolveUserDataDir(oldDir, newDir)).toBe(newDir);
    expect(existsSync(newDir)).toBe(false);
  });
  it('có dữ liệu cũ: sao chép sang BKalc, giữ nguyên bản cũ', () => {
    const { oldDir, newDir } = setup();
    mkdirSync(join(oldDir, 'Local Storage'), { recursive: true });
    writeFileSync(join(oldDir, 'gpa-data.json'), '{"v":1}');
    writeFileSync(join(oldDir, 'Local Storage', 'x'), 'y');
    expect(resolveUserDataDir(oldDir, newDir)).toBe(newDir);
    expect(readFileSync(join(newDir, 'gpa-data.json'), 'utf8')).toBe('{"v":1}');
    expect(readFileSync(join(newDir, 'Local Storage', 'x'), 'utf8')).toBe('y');
    expect(readFileSync(join(oldDir, 'gpa-data.json'), 'utf8')).toBe('{"v":1}');
  });
  it('BKalc đã có dữ liệu: không ghi đè bằng bản cũ', () => {
    const { oldDir, newDir } = setup();
    mkdirSync(oldDir, { recursive: true }); mkdirSync(newDir, { recursive: true });
    writeFileSync(join(oldDir, 'gpa-data.json'), 'cu');
    writeFileSync(join(newDir, 'gpa-data.json'), 'moi');
    expect(resolveUserDataDir(oldDir, newDir)).toBe(newDir);
    expect(readFileSync(join(newDir, 'gpa-data.json'), 'utf8')).toBe('moi');
  });
  it('sao chép lỗi: quay về thư mục cũ, không mất dữ liệu', () => {
    const { oldDir } = setup();
    mkdirSync(oldDir, { recursive: true });
    writeFileSync(join(oldDir, 'gpa-data.json'), '{}');
    const blocked = join(oldDir, 'gpa-data.json', 'khong-the-tao'); // cha là file nên không tạo được
    expect(resolveUserDataDir(oldDir, blocked)).toBe(oldDir);
  });
});

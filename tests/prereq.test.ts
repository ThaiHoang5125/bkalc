import { describe, expect, it } from 'vitest';
import { codesOf, describeCond, parseCond } from '../src/data/prereq';
import { COURSE_DB, PROGRAMS } from '../src/data/programs';

describe('điều kiện đăng ký học phần', () => {
  it('đọc biểu thức lồng AND/OR của khóa 2026', () => {
    const c = parseCond('AND(OR(TQ[MT1003], TQ[MT1011]), OR(KN[EE2031], KN[EE2033]))')!;
    expect(c.op).toBe('AND');
    expect(codesOf(c)).toEqual(['MT1003', 'MT1011', 'EE2031', 'EE2033']);
    expect(describeCond(c)).toBe('(MT1003 (tiên quyết) hoặc MT1011 (tiên quyết)) và (EE2031 (khuyến nghị) hoặc EE2033 (khuyến nghị))');
  });
  it('đọc điều kiện đơn và danh sách', () => {
    expect(describeCond(parseCond('SHT[EE1009]')!)).toBe('EE1009 (song hành hoặc đã học trước)');
    expect(describeCond(parseCond('LIST(KN[A1000], SH[B2000])')!)).toBe('A1000 (khuyến nghị); B2000 (song hành)');
    expect(parseCond('AND(TQ[X1')).toBeNull();
    expect(parseCond('')).toBeNull();
  });
  it('mọi điều kiện trong chương trình đều đọc được và trỏ tới mã có trong danh mục', () => {
    for (const p of PROGRAMS) for (const [code, , pre] of p.courses) {
      if (!pre) continue;
      const c = parseCond(pre);
      expect(c, `${p.id} ${code}: ${pre}`).not.toBeNull();
    }
  });
  it('mỗi ngành đủ 132 tín chỉ theo cấu trúc: nhóm bắt buộc + tự chọn khớp yêu cầu', () => {
    const p = PROGRAMS.find((x) => x.id === '2026-DTH')!;
    const sum = (g: number) => p.courses.filter((c) => c[1] === g).reduce((s, c) => s + COURSE_DB[c[0]].c, 0);
    const bb = p.groups.map((g, i) => ({ g, i })).filter(({ g }) => g.kind === 'bb' && g.req !== undefined && g.unit === 'tc');
    for (const { g, i } of bb) expect(sum(i), g.t).toBe(g.req);
  });
});

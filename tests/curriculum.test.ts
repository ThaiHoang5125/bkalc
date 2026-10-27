import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/curriculum.json';
import { parseCurriculum, assignRuns, fixCaps } from '../src/pdf/curriculum';
import type { Item } from '../src/pdf';
import { COURSE_DB, PROGRAMS } from '../src/data/programs';
import { courseDbFor, programsOf, sanitizeCustomPrograms, validateProgram } from '../src/data/curriculum';
import type { CustomProgram } from '../src/data/curriculum';
import { emptyData, sanitize } from '../src/store';

const parse = (k: 'DTH' | 'TKVM') => parseCurriculum(fixtures[k] as Item[][]);

// Hai file mẫu (Điều khiển & Tự động hóa, Thiết kế vi mạch khóa 2024) có cỡ trang và vị trí cột khác nhau;
// kết quả phải khớp chương trình đã có sẵn trong kho (sinh từ cùng các PDF đó).
describe.each([['DTH', '2024-DTH'], ['TKVM', '2024-TKVM']] as const)('đọc PDF chương trình đào tạo %s', (k, id) => {
  const { program: p, warnings } = parse(k);
  const ref = PROGRAMS.find((x) => x.id === id)!;
  it('đọc đúng khóa, khoa, tổng tín chỉ và không có cảnh báo', () => {
    expect(p.year).toBe(2024);
    expect(p.credits).toBe(132);
    expect(p.faculty).toMatch(/ĐIỆN/);
    expect(warnings).toEqual([]);
  });
  it('nhóm kiến thức: mã, số tín chỉ yêu cầu và loại khớp kho', () => {
    expect(p.groups.map((g) => [g.id, g.req, g.kind])).toEqual(ref.groups.map((g) => [g.id, g.req, g.kind]));
  });
  it('danh sách môn, nhóm và điều kiện đăng ký khớp kho', () => {
    expect(p.courses.map(([c, g, k2]) => [c, ref.groups[ref.courses.find((x) => x[0] === c)![1]].id === p.groups[g].id, k2]))
      .toEqual(ref.courses.map(([c, , k2]) => [c, true, k2]));
  });
  it('tín chỉ và tên tiếng Anh khớp kho', () => {
    for (const [c] of p.courses) {
      expect(p.names[c].c, c).toBe(COURSE_DB[c].c);
      if (p.names[c].e) expect(p.names[c].e!.toLowerCase(), c).toBe(COURSE_DB[c].e?.toLowerCase());
      expect(p.names[c].n.toLowerCase(), c).toBe(COURSE_DB[c].n.toLowerCase());
    }
  });
  it('ngoài nhóm tự chọn tự do và điều kiện tốt nghiệp không bỏ sót môn nào', () => {
    expect(validateProgram(p).filter((w) => /chưa có tên|không đọc được|xuất hiện/.test(w))).toEqual([]);
  });
});

describe('PDF không đúng mẫu', () => {
  it('báo lỗi tiếng Việt thay vì trả chương trình rỗng', () => {
    expect(() => parseCurriculum([[{ str: 'Bảng điểm', x: 10, y: 10, w: 40 }]])).toThrow(/Không nhận ra mẫu/);
  });
});

describe('assignRuns / fixCaps', () => {
  it('mỗi dòng điều kiện đúng tâm môn thì gán riêng, không gộp theo tâm trùng tình cờ', () => {
    expect(assignRuns([177, 150, 123], [177, 150, 123], false)).toEqual([1, 1, 1]);
  });
  it('khối nhiều dòng căn giữa gán cho môn ở giữa', () => {
    expect(assignRuns([163, 150, 137], [190, 150, 110], false)).toEqual([0, 3, 0]);
  });
  it('sửa chữ hoa giữa từ của font PDF, giữ IoT', () => {
    expect(fixCaps('Numerical MeThods')).toBe('Numerical Methods');
    expect(fixCaps('VieTNamese AThletics')).toBe('Vietnamese Athletics');
    expect(fixCaps('IoT PLC')).toBe('IoT PLC');
  });
});

describe('chương trình tự nhập trong dữ liệu', () => {
  const base = parse('DTH').program;
  const mine: CustomProgram = { ...base, id: '2024-KHAC', major: 'KHAC', majorName: 'Ngành khác', faculty: 'Khoa khác' };
  it('sanitize bỏ mục hỏng, trùng mã, trùng kho có sẵn; giữ mục hợp lệ', () => {
    const out = sanitizeCustomPrograms([mine, mine, { ...mine, id: '2024-DTH' }, { id: 1 }, null, { ...mine, id: 'x', credits: -3 }, { ...mine, id: 'y', groups: [{ t: 1 }] }]);
    expect(out.map((p) => p.id)).toEqual(['2024-KHAC']);
  });
  it('sanitize dữ liệu app: chương trình hỏng không làm app sập', () => {
    expect(sanitize({ ...emptyData(), customPrograms: 'rác' }).customPrograms).toBeUndefined();
    expect(sanitize({ ...emptyData(), customPrograms: [mine] }).customPrograms).toHaveLength(1);
    expect(sanitize({ ...emptyData(), customPrograms: [{ ...mine, courses: [['EE1001', 99, ''], ['EE1007', 0, 5]] }] }).customPrograms![0].courses).toEqual([['EE1007', 0, '']]);
  });
  it('programsOf gộp kho có sẵn và chương trình nhập thêm; courseDbFor ưu tiên tên của chính chương trình', () => {
    expect(programsOf([mine]).length).toBe(PROGRAMS.length + 1);
    expect(programsOf()).toBe(PROGRAMS);
    const other = { ...mine, names: { ...mine.names, EE1001: { n: 'Tên khác', c: 9 } } };
    expect(courseDbFor(other, [other]).EE1001).toEqual({ n: 'Tên khác', c: 9 });
    expect(courseDbFor(PROGRAMS[0], [other]).EE1001.c).toBe(COURSE_DB.EE1001.c);
  });
  it('validateProgram cảnh báo nhóm thiếu tín chỉ, nhóm rỗng và điều kiện hỏng', () => {
    const bad: CustomProgram = { ...mine, groups: [...mine.groups, { t: 'Rỗng', id: 'Z', lvl: 1, kind: 'bb' }], courses: mine.courses.map((c, i) => (i === 0 ? [c[0], c[1], 'xyz['] : c)) };
    const w = validateProgram(bad);
    expect(w.some((x) => /Nhóm “Z. Rỗng” không có môn/.test(x))).toBe(true);
    expect(w.some((x) => /không đọc được điều kiện/.test(x))).toBe(true);
  });
});

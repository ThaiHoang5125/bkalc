import { describe, expect, it } from 'vitest';
import { buildLookup, norm } from '../src/data/lookup';
import { COURSE_DB, PROGRAMS } from '../src/data/programs';
import { ALL_COURSES } from '../src/data/allCourses';
import { sanitize } from '../src/store';

describe('tra cứu mã ⇄ tên', () => {
  const lk = buildLookup();
  it('danh mục không trùng mã và mã đúng dạng', () => {
    for (const code of Object.keys(COURSE_DB)) expect(code).toMatch(/^[A-Z]{2,3}\d{4}$/);
    for (const p of PROGRAMS) {
      expect(new Set(p.courses.map((c) => c[0])).size).toBe(p.courses.length);
      for (const c of p.courses) { expect(COURSE_DB[c[0]]).toBeTruthy(); expect(p.groups[c[1]]).toBeTruthy(); }
    }
  });
  it('mã → tên và tên → mã (không phân biệt dấu/hoa thường)', () => {
    expect(lk.nameOf('ee3017')?.name).toBe('Đo lường và điều khiển bằng máy tính');
    expect(lk.codeOf('giai tich 1')?.code).toBe('MT1003');
    expect(norm('Đại số')).toBe('dai so');
  });
  it('tìm kiếm theo từng phần', () => {
    expect(lk.search('robot')[0].code).toBe('EE3065');
    expect(lk.search('control').length).toBeGreaterThan(0);
  });
  it('phát hiện mã và tên không khớp', () => {
    expect(lk.check('MT1003', 'Giải tích 1').state).toBe('ok');
    expect(lk.check('MT1003', 'Vật lý 1').state).toBe('mismatch');
    expect(lk.check('ZZ9999', 'x').state).toBe('unknown');
  });
  it('danh sách tất cả các môn: đủ mã, không ghi đè tên đầy đủ, không báo lệch theo tên viết tắt', () => {
    expect(Object.keys(ALL_COURSES)).toHaveLength(1714);
    for (const code of Object.keys(ALL_COURSES)) expect(lk.nameOf(code)).toBeTruthy();
    expect(lk.nameOf('CH43A3')?.credits).toBeDefined();
    // môn đã có trong danh mục: giữ tên đầy đủ, không lấy tên viết tắt (trong file là "Kỹthuật hệthống viễnthôg")
    expect(lk.nameOf('EE3015')?.name).toBe('Kỹ thuật hệ thống viễn thông');
    expect(lk.nameOf('EE3015')?.abbr).toBeUndefined();
    // môn chỉ có trong danh sách mới: tra được mã và tín chỉ, nhưng tên viết tắt không dùng để đối chiếu
    expect(lk.nameOf('AS2009')).toMatchObject({ credits: 3, origin: 'catalog', abbr: true });
    expect(lk.check('AS2009', 'Cơ sở cơ học lượng tử').state).toBe('unknown');
    expect(lk.search('AS2009')[0].code).toBe('AS2009');
  });
  it('dữ liệu của người dùng được ưu tiên hơn danh mục', () => {
    const l2 = buildLookup({ attempts: [{ id: '1', code: 'MT1003', name: 'Calculus I', credits: 4, score: 8, semester: 's' }], program: undefined });
    expect(l2.nameOf('MT1003')?.name).toBe('Calculus I');
  });
});

describe('tích vào GPA chung', () => {
  it('lưu và làm sạch inCumulative / goal', () => {
    const d = sanitize({ attempts: [{ name: 'A', credits: 3, score: null, semester: 'x', inCumulative: true, goal: 'A' }, { name: 'B', credits: 3, score: null, semester: 'x', goal: 'Z' }] });
    expect(d.attempts[0].inCumulative).toBe(true);
    expect(d.attempts[0].goal).toBe('A');
    expect(d.attempts[1].goal).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, alternatives, findConflicts, parseSections, parseWeeks, rearrange, sectionsConflict, suggestAdd } from '../src/engine/timetable';
import type { Section } from '../src/engine/timetable';

const sec = (code: string, group: string, day: number, start: number, len: number, weeks?: number[]): Section => ({ id: `${code}${group}`, code, name: code, credits: 3, group, slots: [{ day, start, len, ...(weeks ? { weeks } : {}) }] });

describe('timetable', () => {
  it('xung đột theo thứ, tiết và tuần', () => {
    expect(sectionsConflict(sec('A', 'L01', 2, 2, 3), sec('B', 'L01', 2, 4, 2))).toBe(true);
    expect(sectionsConflict(sec('A', 'L01', 2, 2, 3), sec('B', 'L01', 2, 5, 2))).toBe(false);
    expect(sectionsConflict(sec('A', 'L01', 2, 2, 3, [1, 2]), sec('B', 'L01', 2, 2, 3, [3, 4]))).toBe(false);
    expect(findConflicts([sec('A', 'L01', 2, 2, 3), sec('B', 'L01', 2, 3, 1)])).toHaveLength(1);
  });
  it('parseWeeks', () => { expect(parseWeeks('1-3,5')).toEqual([1, 2, 3, 5]); });
  it('xếp lại: chuyển môn sang khung giờ mong muốn và đổi môn khác tránh trùng', () => {
    const current = [sec('MT1003', 'L01', 2, 2, 3), sec('PH1003', 'L01', 4, 2, 3)];
    const catalog = [
      sec('MT1003', 'L01', 2, 2, 3), sec('MT1003', 'L02', 4, 2, 3), sec('MT1003', 'L03', 5, 8, 3),
      sec('PH1003', 'L01', 4, 2, 3), sec('PH1003', 'L02', 6, 2, 3),
    ];
    const r = rearrange(current, catalog, { code: 'MT1003', day: 4, start: 2 }, DEFAULT_PREFS);
    expect(r.length).toBeGreaterThan(0);
    expect(findConflicts(r[0].sections)).toHaveLength(0);
    expect(r[0].sections.find((s) => s.code === 'MT1003')!.group).toBe('L02');
    expect(r[0].moves.map((m) => m.code).sort()).toEqual(['MT1003', 'PH1003']);
  });
  it('xếp lại: tôn trọng mong muốn bắt đầu từ 9h (tiết 4)', () => {
    const current = [sec('MT1003', 'L01', 2, 2, 3)];
    const catalog = [sec('MT1003', 'L01', 2, 2, 3), sec('MT1003', 'L02', 3, 4, 3)];
    const r = rearrange(current, catalog, { code: 'MT1003' }, { ...DEFAULT_PREFS, earliest: 4 });
    expect(r[0].sections[0].group).toBe('L02');
    expect(r[0].violations).toBe(0);
  });
  it('gợi ý thêm môn không trùng giờ', () => {
    const r = suggestAdd([sec('A', 'L01', 2, 2, 3)], [sec('B', 'L01', 2, 3, 2), sec('B', 'L02', 3, 3, 2)], DEFAULT_PREFS);
    expect(r.map((x) => x.section.group)).toEqual(['L02']);
    expect(alternatives([sec('A', 'L01', 2, 2, 3), sec('B', 'L01', 3, 2, 3)], [sec('A', 'L02', 3, 3, 1)], 'A', DEFAULT_PREFS)[0].conflicts).toHaveLength(1);
  });
  it('đọc dòng thời khóa biểu', () => {
    const r = parseSections([
      'MT1003 Giải tích 1 L01 4 2 2-4 H1-201 BK1 Tuần 1-9,11-18',
      'MT1003 Giải tích 1 L01 4 5 8-9 H2-301',
      'MT1003 Giải tích 1 L02 4 Thứ 3, tiết 6-8 H1-101',
      'PH1003 Vật lý 1 L05 4 7 2,3,4',
    ]);
    expect(r.sections).toHaveLength(3);
    const l01 = r.sections.find((s) => s.group === 'L01')!;
    expect(l01.slots).toHaveLength(2);
    expect(l01.slots[0]).toMatchObject({ day: 2, start: 2, len: 3, room: 'H1-201' });
    expect(l01.slots[0].weeks).toContain(11);
    expect(l01.name).toBe('Giải tích 1');
    expect(l01.credits).toBe(4);
    expect(r.sections.find((s) => s.group === 'L02')!.slots[0]).toMatchObject({ day: 3, start: 6, len: 3 });
    expect(r.sections.find((s) => s.code === 'PH1003')!.slots[0]).toMatchObject({ day: 7, start: 2, len: 3 });
  });
});

import { prefWarnings } from '../src/engine/timetable';
describe('cảnh báo khung giờ', () => {
  const sec = (code: string, group: string, day: number, start: number, len = 3) => ({ id: `${code}${group}`, code, name: code, credits: 3, group, slots: [{ day, start, len }] });
  it('môn chỉ 1 lớp vi phạm khung giờ, và môn chỉ dạy 1 ngày trùng ngày nghỉ', () => {
    const all = [sec('A', 'L01', 2, 1), sec('B', 'L01', 3, 4), sec('B', 'L02', 3, 7), sec('C', 'L01', 4, 4), sec('C', 'L02', 5, 4)];
    const w = prefWarnings(all, { ...DEFAULT_PREFS, earliest: 4, daysOff: [3] });
    expect(w.map((x) => `${x.code}:${x.kind}`).sort()).toEqual(['A:single', 'B:oneday']);
    expect(prefWarnings(all, DEFAULT_PREFS)).toEqual([]);
  });
});

import { campusOk, violations as viol } from '../src/engine/timetable';
describe('lớp L/A, né 11h–13h, buổi theo độ dài', () => {
  it('chỉ lấy lớp nhóm L hoặc A; chọn cơ sở lọc thêm', () => {
    expect(campusOk({ group: 'L01_L04' }, 'all')).toBe(true);
    expect(campusOk({ group: 'A10' }, 'all')).toBe(true);
    expect(campusOk({ group: 'CC01' }, 'all')).toBe(false);
    expect(campusOk({ group: 'A10' }, 'L')).toBe(false);
    expect(campusOk({ group: 'L02' }, 'A')).toBe(false);
    expect(campusOk({ group: '' }, 'L')).toBe(true);
  });
  it('né 11h–13h tính tiết 6–7', () => {
    const sec = { id: 'x', code: 'X', name: 'X', credits: 3, group: 'L01', slots: [{ day: 2, start: 5, len: 2 }] };
    expect(viol(sec, { ...DEFAULT_PREFS, avoidLunch: true })).toBe(1);
    expect(viol({ ...sec, slots: [{ day: 2, start: 8, len: 2 }] }, { ...DEFAULT_PREFS, avoidLunch: true })).toBe(0);
    expect(viol(sec, DEFAULT_PREFS)).toBe(0);
  });
  it('rearrange chỉ xét buổi có đúng số tiết', () => {
    const cur = { id: 'c', code: 'M', name: 'M', credits: 3, group: 'L01_L02', slots: [{ day: 4, start: 8, len: 5 }, { day: 5, start: 4, len: 2 }] };
    const alt = { id: 'a', code: 'M', name: 'M', credits: 3, group: 'L03_L04', slots: [{ day: 2, start: 4, len: 2 }, { day: 6, start: 8, len: 5 }] };
    expect(rearrange([cur], [alt], { code: 'M', day: 2, start: 4, len: 2 }, DEFAULT_PREFS, 1)).toHaveLength(1);
    expect(rearrange([cur], [alt], { code: 'M', day: 2, start: 4, len: 5 }, DEFAULT_PREFS, 1)).toHaveLength(0);
  });
});

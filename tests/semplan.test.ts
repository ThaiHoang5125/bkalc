import { describe, expect, it } from 'vitest';
import { DEFAULT_PLAN, autoPlan, fillPlaceholders, futureSemesters, unmet } from '../src/engine/semplan';
import type { PlanCourse } from '../src/engine/semplan';

describe('semplan', () => {
  it('15 kỳ liên tiếp, bắt đầu từ kỳ hiện tại (22/10/2026 = HK261)', () => {
    const l = futureSemesters(new Date(2026, 9, 22));
    expect(l).toHaveLength(15);
    expect(l[0]).toBe('Năm học 2026 - 2027 / Học kỳ 1');
    expect(l[2]).toBe('Năm học 2026 - 2027 / Học kỳ 3');
    expect(l[3]).toBe('Năm học 2027 - 2028 / Học kỳ 1');
  });
  it('kiểm tra tiên quyết và song hành', () => {
    const ctx = { passed: new Set(['A']), enrolled: new Set<string>(), placed: new Map([['B', 1]]) };
    expect(unmet('TQ[A]', 1, ctx)).toEqual([]);
    expect(unmet('TQ[B]', 1, ctx)).toEqual(['B (TQ)']);
    expect(unmet('TQ[B]', 2, ctx)).toEqual([]);
    expect(unmet('SH[B]', 1, ctx)).toEqual([]);
    expect(unmet('OR(TQ[X],TQ[A])', 1, ctx)).toEqual([]);
    expect(unmet('KN[Z]', 1, ctx)).toEqual([]);
  });
  it('tự xếp theo điều kiện và trần tín chỉ', () => {
    const mk = (code: string, credits: number, cond = ''): PlanCourse => ({ code, name: code, credits, cond, required: true });
    const courses = [mk('A', 3), mk('B', 3, 'TQ[A]'), mk('C', 3, 'TQ[B]'), mk('D', 3)];
    const labels = futureSemesters(new Date(2026, 9, 22), 5);
    const r = autoPlan(courses, { passed: new Set(), enrolled: new Set(), placed: new Map() }, labels, DEFAULT_PLAN, 0);
    const where = (c: string) => labels.findIndex((l) => r[l].some((x) => x.code === c));
    expect(where('A')).toBe(0); expect(where('B')).toBeGreaterThan(where('A')); expect(where('C')).toBeGreaterThan(where('B'));
    expect(labels.every((l) => r[l].reduce((s, x) => s + x.credits, 0) <= (l.endsWith('3') ? 3 : 6))).toBe(true);
  });
});

import { cohortOf, cohortSemesters, graduationSemester, MAX_MAIN, MAX_SUMMER, capOf } from '../src/engine/semplan';
describe('khóa theo MSSV', () => {
  it('2 số đầu MSSV → khóa', () => { expect(cohortOf('2313095')).toBe(2023); expect(cohortOf('2410001')).toBe(2024); expect(cohortOf('abc')).toBeNull(); expect(cohortOf(undefined)).toBeNull(); });
  it('18 học kỳ từ HK đầu của khóa', () => {
    const l = cohortSemesters(2023);
    expect(l).toHaveLength(18);
    expect(l[0]).toBe('Năm học 2023 - 2024 / Học kỳ 1');
    expect(l[17]).toBe('Năm học 2028 - 2029 / Học kỳ 3');
  });
  it('trần tín chỉ 25 / 15 và kỳ tốt nghiệp', () => {
    const l = cohortSemesters(2023);
    expect(capOf(l[0])).toBe(MAX_MAIN); expect(MAX_MAIN).toBe(22);
    expect(capOf(l[2])).toBe(MAX_SUMMER); expect(MAX_SUMMER).toBe(12);
    expect(graduationSemester(120, l.slice(9), { sems: { [l[10]]: [{ code: 'A', name: 'A', credits: 12 }] }, maxMain: 25, maxSummer: 15 }, 132)).toBe(l[10]);
    expect(graduationSemester(100, l.slice(9), { sems: {}, maxMain: 25, maxSummer: 15 }, 132)).toBeNull();
  });
  it('Đồ án tốt nghiệp sau các môn khác (kể cả kỳ hè); thực tập ngoài trường chỉ đăng ký ở kỳ chính', () => {
    const mk = (code: string, name: string, credits: number): PlanCourse => ({ code, name, credits, cond: '', required: true });
    const courses = [mk('DA2', 'Đồ án 2', 2), mk('TT', 'Thực tập ngoài trường', 2), mk('DATN', 'Đồ án tốt nghiệp', 4), mk('X', 'Môn X', 4)];
    const labels = futureSemesters(new Date(2026, 9, 22), 7); // HK261, 262, 263 (hè), 271, 272, 273 (hè), 281
    const r = autoPlan(courses, { passed: new Set(), enrolled: new Set(), placed: new Map() }, labels, DEFAULT_PLAN, 1);
    const where = (c: string) => labels.findIndex((l) => r[l].some((x) => x.code === c));
    expect(labels[where('TT')].endsWith('3')).toBe(false); // không đăng ký thực tập ở kỳ hè
    expect(where('DATN')).toBeGreaterThan(where('DA2'));
    expect(where('DATN')).toBeGreaterThanOrEqual(where('X'));
  });
  it('fillPlaceholders bù đủ tín chỉ còn thiếu, chỉ vào kỳ chính và không vượt trần', () => {
    const labels = futureSemesters(new Date(2026, 9, 22), 6);
    const r = fillPlaceholders({}, labels, 1, 9);
    const all = labels.flatMap((l) => r[l]);
    expect(all.reduce((s, x) => s + x.credits, 0)).toBe(9);
    expect(new Set(all.map((x) => x.code)).size).toBe(all.length);
    expect(r[labels[2]]).toHaveLength(0); // kỳ hè trống
    expect(labels.every((l) => r[l].reduce((s, x) => s + x.credits, 0) <= (l.endsWith('3') ? 15 : 25))).toBe(true);
    expect(Object.values(fillPlaceholders({}, labels, 1, 8)).flat().reduce((s, x) => s + x.credits, 0)).toBe(8);
  });
  it('thực tập ngoài trường chỉ xếp khi đủ chuẩn tín chỉ tích lũy (C_TTNT)', () => {
    const mk = (code: string, name: string, credits: number): PlanCourse => ({ code, name, credits, cond: '', required: true });
    const courses = [mk('TT', 'Thực tập ngoài trường', 2), mk('X', 'Môn X', 20), mk('Y', 'Môn Y', 20)];
    const labels = futureSemesters(new Date(2026, 9, 22), 7);
    const r = autoPlan(courses, { passed: new Set(), enrolled: new Set(), placed: new Map(), baseEarned: 50, internshipNeed: 86 }, labels, DEFAULT_PLAN, 1);
    const where = (c: string) => labels.findIndex((l) => r[l].some((x) => x.code === c));
    // 50 + 40 = 90 ≥ 86 chỉ sau khi X, Y đã xếp
    expect(where('TT')).toBeGreaterThan(Math.max(where('X'), where('Y')) - 1);
    const before = 50 + labels.slice(0, where('TT')).reduce((s2, l) => s2 + r[l].reduce((a, x) => a + x.credits, 0), 0);
    expect(before).toBeGreaterThanOrEqual(86);
  });
});

import { withPolitical } from '../src/engine/semplan';
describe('chính trị tuần tự', () => {
  it('Triết → KTCT → CNXHKH → Lịch sử Đảng → TTHCM, mỗi môn ở kỳ sau môn trước', () => {
    const ctx = { passed: new Set<string>(), enrolled: new Set<string>(), placed: new Map([['SP1031', 0], ['SP1033', 1]]) };
    expect(unmet(withPolitical('SP1033', ''), 1, ctx)).toEqual([]);
    expect(unmet(withPolitical('SP1033', ''), 0, ctx)).toHaveLength(1);
    expect(unmet(withPolitical('SP1035', ''), 1, ctx)).toHaveLength(1);
    expect(unmet(withPolitical('SP1035', ''), 2, ctx)).toEqual([]);
    expect(withPolitical('SP1007', '')).toBe('');
  });
});

describe('tự xếp: đường găng và cân tải', () => {
  const mk = (code: string, credits: number, cond = ''): PlanCourse => ({ code, name: code, credits, cond, required: true });
  const labels = futureSemesters(new Date(2026, 9, 22), 12);
  const run = (courses: PlanCourse[]) => autoPlan(courses, { passed: new Set(), enrolled: new Set(), placed: new Map() }, labels, DEFAULT_PLAN, 0);
  const where = (r: Record<string, { code: string }[]>, c: string) => labels.findIndex((l) => r[l].some((x) => x.code === c));
  it('môn đầu chuỗi tiên quyết dài được xếp trước dù ít môn phụ thuộc trực tiếp', () => {
    // chuỗi dài X1→X2→X3→X4; Y có 2 môn phụ thuộc trực tiếp nhưng chuỗi ngắn. Kỳ đầu chỉ đủ chỗ cho một trong hai.
    const courses = [mk('Y', 20), mk('X1', 20), mk('X2', 3, 'TQ[X1]'), mk('X3', 3, 'TQ[X2]'), mk('X4', 3, 'TQ[X3]'), mk('Y1', 3, 'TQ[Y]'), mk('Y2', 3, 'TQ[Y]')];
    const r = run(courses);
    expect(where(r, 'X1')).toBeLessThan(where(r, 'Y'));
  });
  it('cân tải: không dồn kỳ chính lên tới trần 22 khi vẫn không kéo dài kế hoạch', () => {
    const courses = Array.from({ length: 8 }, (_, i) => mk(`C${i}`, 4));
    const r = run(courses);
    const loads = labels.map((l) => r[l].reduce((s, x) => s + x.credits, 0));
    expect(Math.max(...loads)).toBeLessThanOrEqual(18);
    expect(courses.every((c) => where(r, c.code) >= 0)).toBe(true);
  });
  it('vẫn xếp hết khi cân tải làm kế hoạch dài hơn (dùng cách lấp đầy)', () => {
    const few = labels.slice(0, 2);
    const courses = Array.from({ length: 5 }, (_, i) => mk(`D${i}`, 8));
    const r = autoPlan(courses, { passed: new Set(), enrolled: new Set(), placed: new Map() }, few, DEFAULT_PLAN, 0);
    expect(few.flatMap((l) => r[l]).length).toBeGreaterThanOrEqual(2);
  });
});

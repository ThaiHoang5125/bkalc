import { describe, expect, it } from 'vitest';
import type { AppData, Attempt } from '../src/engine';
import { courseLevel, englishNeeded, levelIssues, needCredits, passedCodes, seenCodes, planWarnings, overCapSemesters } from '../src/engine';
import { emptyData } from '../src/store';

const ALL_AV = ['LA1003', 'LA1005', 'LA1007', 'LA1009'];
const ctx = (over: Partial<Parameters<typeof levelIssues>[1]> = {}) => ({
  cohort: 2023, hasData: true, credits: 105, done: new Set([...ALL_AV, 'MI1003', 'PE1001', 'PE1002']), seen: new Set([...ALL_AV, 'MI1003', 'PE1001', 'PE1002']), ...over,
});

describe('chuẩn trình độ năm theo mã môn', () => {
  it('mã môn 1xxx–4xxx', () => {
    expect(courseLevel('EE1009')).toBe(1); expect(courseLevel('EE3065')).toBe(3); expect(courseLevel('SP1037')).toBe(1); expect(courseLevel('EE4001')).toBe(4);
  });
  it('số tín chỉ tối thiểu: 28 / 56 / 56', () => {
    expect(levelIssues(2, ctx({ credits: 27 }))).toEqual([{ kind: 'credits', have: 27, need: 28 }]);
    expect(levelIssues(2, ctx({ credits: 28 }))).toEqual([]);
    expect(levelIssues(3, ctx({ credits: 48 }))).toEqual([{ kind: 'credits', have: 48, need: 56 }]);
    expect(levelIssues(4, ctx({ credits: 55 }))).toEqual([{ kind: 'credits', have: 55, need: 56 }]);
  });
  it('Anh văn: năm 2 cần LA1003; năm 3 cần LA1003–1007 (khóa ≥ 2024: đến LA1009); năm 4 cần LA1003–1009', () => {
    expect(englishNeeded(2, 2023)).toBe(1); expect(englishNeeded(3, 2023)).toBe(3); expect(englishNeeded(3, 2024)).toBe(4); expect(englishNeeded(4, 2023)).toBe(4);
    const done = new Set(['LA1003', 'LA1005', 'LA1007', 'MI1003', 'PE1001', 'PE1002']);
    const seen = new Set([...done, 'LA1009']);
    expect(levelIssues(3, ctx({ cohort: 2023, done, seen }))).toEqual([]);
    expect(levelIssues(3, ctx({ cohort: 2024, done, seen }))).toEqual([{ kind: 'english', n: 4, missing: ['LA1009'] }]);
    expect(levelIssues(4, ctx({ cohort: 2023, done, seen }))).toEqual([{ kind: 'english', n: 4, missing: ['LA1009'] }]);
    expect(levelIssues(2, ctx({ done: new Set(), seen: new Set(['LA1003']) }))).toEqual([{ kind: 'english', n: 1, missing: ['LA1003'] }]);
  });
  it('thiếu dữ liệu thì im lặng: môn chưa hề xuất hiện trong bảng điểm / chương trình không bị coi là chưa đạt', () => {
    expect(levelIssues(4, ctx({ done: new Set(), seen: new Set() }))).toEqual([]);
    expect(levelIssues(3, ctx({ hasData: false, credits: 0 }))).toEqual([]);
    expect(levelIssues(1, ctx({ credits: 0 }))).toEqual([]);
  });
  it('GDQP và GDTC chỉ xét từ năm 3; CCGDTC thay cho PE1001 + PE1002', () => {
    const seen = new Set([...ALL_AV, 'MI1003', 'PE1001', 'PE1002']);
    const done = new Set(ALL_AV);
    expect(levelIssues(2, ctx({ done, seen }))).toEqual([]);
    expect(levelIssues(3, ctx({ done, seen }))).toEqual([{ kind: 'gdqp' }, { kind: 'gdtc' }]);
    expect(levelIssues(3, ctx({ done: new Set([...ALL_AV, 'MI1003', 'PE1001']), seen }))).toEqual([{ kind: 'gdtc' }]);
    expect(levelIssues(4, ctx({ done: new Set([...ALL_AV, 'MI1003', 'CCGDTC']), seen }))).toEqual([]);
  });
  it('làm tròn lên số tín chỉ theo tỷ lệ phần trăm: 65% và 70% của 132', () => {
    expect(needCredits(65, 132)).toBe(86); expect(needCredits(70, 132)).toBe(93);
  });
});

const att = (code: string, credits: number, score: number | null, extra: Partial<Attempt> = {}): Attempt => ({ id: code + String(score) + (extra.semester ?? ''), code, name: code, credits, score, semester: 'Năm học 2025 - 2026 / Học kỳ 1', ...extra });
const mk = (attempts: Attempt[], extra: Partial<AppData> = {}): AppData => ({ ...emptyData(), attempts, ...extra });

describe('đọc mã đã đạt từ bảng điểm', () => {
  it('tính cả môn không tính GPA, điểm miễn MT, đạt DT và chuẩn 0 tín chỉ', () => {
    const d = mk([att('MI1003', 0, 8, { excluded: true }), att('LA1003', 0, null, { special: 'MT' }), att('PE1001', 0, null, { special: 'DT' }), att('EE1009', 3, 3.5), att('EE1011', 3, null)], { standards: { certs: ['CCGDTC'] } });
    const p = passedCodes(d);
    expect([...p].sort()).toEqual(['CCGDTC', 'LA1003', 'MI1003', 'PE1001']);
    expect(seenCodes(d).has('EE1011')).toBe(true);
  });
});

describe('cảnh báo trong Kế hoạch', () => {
  const now = new Date(2026, 9, 23); // HK1 2026-2027
  const cur = 'Năm học 2026 - 2027 / Học kỳ 1';
  const next = 'Năm học 2026 - 2027 / Học kỳ 2';
  const base = [att('LA1003', 0, 8), att('MI1003', 0, 7), att('EE1009', 28, 7)];
  const student = { id: '2300000', name: 'A' };
  const plan = (sems: Record<string, { code: string; name: string; credits: number }[]>) => ({ sems, maxMain: 22, maxSummer: 12 });
  it('môn 3xxx báo thiếu tín chỉ, kèm số dự kiến', () => {
    const d = mk(base, { student, plan: plan({ [next]: [{ code: 'EE3065', name: 'Kỹ thuật robot', credits: 3 }] }) });
    const w = planWarnings(d, now);
    expect(w.map((x) => x.kind)).toContain('level-credits');
    const c = w.find((x) => x.kind === 'level-credits');
    expect(c).toMatchObject({ code: 'EE3065', sem: next, level: 3, have: 28, need: 56 });
  });
  it('tín chỉ xếp ở kỳ trước được tính vào số dự kiến', () => {
    const d = mk(base, { student, plan: plan({ [cur]: [{ code: 'EE2001', name: 'A', credits: 15 }, { code: 'EE2002', name: 'B', credits: 15 }], [next]: [{ code: 'EE3065', name: 'Kỹ thuật robot', credits: 3 }] }) });
    expect(planWarnings(d, now).filter((x) => x.code === 'EE3065' && x.kind === 'level-credits')).toEqual([]);
  });
  it('chưa có bảng điểm thì không cảnh báo gì', () => {
    const d = mk([], { student, plan: plan({ [next]: [{ code: 'EE3065', name: 'Kỹ thuật robot', credits: 3 }] }) });
    expect(planWarnings(d, now)).toEqual([]);
  });
  it('thực tập ngoài trường cần 65%, đồ án 2 cần 70% và GPA ≥ 2.0, đồ án tốt nghiệp cần GPA ≥ 2.0', () => {
    const low = [att('EE1009', 80, 7), att('LA1003', 0, 8)];
    const d = mk(low, { student, plan: plan({ [next]: [{ code: 'EE4001', name: 'Thực tập ngoài trường', credits: 2 }, { code: 'EE4002', name: 'Đồ án 2', credits: 2 }, { code: 'EE4003', name: 'Đồ án tốt nghiệp', credits: 4 }] }) });
    const w = planWarnings(d, now);
    expect(w.find((x) => x.kind === 'pct' && x.std === 'C_TTNT')).toMatchObject({ need: 86, have: 80, pct: 65 });
    expect(w.find((x) => x.kind === 'pct' && x.std === 'C_ĐACN')).toMatchObject({ need: 93, have: 80, pct: 70 });
    expect(w.some((x) => x.kind === 'gpa')).toBe(false);
  });
  it('GPA dưới 2.0 chặn đồ án; thiếu điểm thì im lặng', () => {
    const poor = mk([att('EE1009', 100, 3.9)], { student, plan: plan({ [next]: [{ code: 'EE4002', name: 'Đồ án 2', credits: 2 }, { code: 'EE4003', name: 'Đồ án tốt nghiệp', credits: 4 }] }) });
    const w = planWarnings(poor, now).filter((x) => x.kind === 'gpa');
    expect(w.map((x) => (x as { std: string }).std).sort()).toEqual(['C_LVTN', 'C_ĐACN']);
    const none = mk([att('EE1009', 3, null)], { student, plan: plan({ [next]: [{ code: 'EE4003', name: 'Đồ án tốt nghiệp', credits: 4 }] }) });
    expect(planWarnings(none, now).filter((x) => x.kind === 'gpa')).toEqual([]);
  });
  it('kỳ vượt trần tín chỉ', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ code: 'EE20' + i + '0', name: 'M' + i, credits: 3 }));
    const d = mk(base, { student, plan: plan({ [next]: items }) });
    expect(overCapSemesters(d, now)).toEqual([{ sem: next, credits: 24, cap: 22 }]);
  });
});

import { sanitize } from '../src/store';
describe('dữ liệu cũ có mục chuẩn do người dùng nhập', () => {
  it('sanitize bỏ các trường đã gỡ, chỉ giữ chứng chỉ 0 tín chỉ', () => {
    const d = sanitize({ attempts: [], standards: { program: 'ttnt', ctxhDays: 5, certs: ['CCGDTC', 7], manual: { cnttcb: true } } });
    expect(d.standards).toEqual({ certs: ['CCGDTC'] });
  });
});

import { describe, expect, it } from 'vitest';
import { effort, effortBase, letterOfTotal, plan, round1, scenarios, summarizeComponents, targetFor, tradeoff } from '../src/engine';
import type { Attempt, Component } from '../src/engine';
import { sanitize } from '../src/store';

const c = (name: string, weight: number, score: number | null, planned?: number): Component => ({ id: name, name, weight, score, ...(planned !== undefined ? { planned } : {}) });
// Ví dụ của người dùng: giữa kỳ 30% được 6; thí nghiệm 30% và cuối kỳ 40% chưa có
const ex = [c('GK', 30, 6), c('TN', 30, null), c('CK', 40, null)];

describe('điểm thành phần', () => {
  it('tổng hợp: điểm chắc chắn, khoảng điểm còn có thể đạt', () => {
    const s = summarizeComponents(ex);
    expect(s.weightSum).toBe(100);
    expect(s.secured).toBeCloseTo(1.8, 9);
    expect(s.freeWeight).toBe(70);
    expect(s.minTotal).toBeCloseTo(1.8, 9);
    expect(s.maxTotal).toBeCloseTo(8.8, 9);
    expect(letterOfTotal(s.maxTotal)).toBe('A');
  });
  it('điểm cần đạt ở các phần còn lại cho B, B+, A, A+', () => {
    const b = targetFor(ex, 'B'), bp = targetFor(ex, 'B+'), a = targetFor(ex, 'A'), ap = targetFor(ex, 'A+');
    expect([b.needed, b.neededStep, b.state]).toEqual([7.4, 7.5, 'ok']); // (7.0−0.05−1.8)/0.7 = 7.357
    expect([bp.needed, bp.neededStep]).toEqual([8.8, 9]);
    expect([a.needed, a.neededStep, a.state]).toEqual([9.5, 9.5, 'ok']);
    expect(ap.state).toBe('impossible');
  });
  it('làm tròn điểm tổng kết 1 chữ số: 7.95 vẫn được 8.0', () => {
    expect(round1(7.95)).toBe(8);
    expect(round1(7.949)).toBe(7.9);
    expect(letterOfTotal(7.95)).toBe('B+');
    expect(letterOfTotal(8.45)).toBe('A');
    expect(letterOfTotal(9.45)).toBe('A+');
    // dùng đúng ngưỡng: cần 7.95 ở phần cuối để tổng kết 8.0
    const t = targetFor([c('GK', 50, 8), c('CK', 50, null)], 'B+');
    expect(t.needed).toBe(7.9); // (8−0.05−4)/0.5 = 7.9
  });
  it('đã chắc chắn / không thể khi hết thành phần', () => {
    expect(targetFor([c('GK', 50, 9), c('CK', 50, 9)], 'A').state).toBe('done');
    expect(targetFor([c('GK', 50, 6), c('CK', 50, 6)], 'A').state).toBe('impossible');
    expect(targetFor([c('GK', 50, 9.5), c('CK', 50, null)], 'D').state).toBe('done');
  });
  it('điểm dự kiến được tính như đã có, phần còn lại cần ít hơn', () => {
    const withPlan = [c('GK', 30, 6), c('TN', 30, null, 8), c('CK', 40, null)];
    const s = summarizeComponents(withPlan);
    expect(s.free.map((x) => x.name)).toEqual(['CK']);
    expect(s.secured).toBeCloseTo(4.2, 9);
    expect(targetFor(withPlan, 'B').needed).toBe(6.9); // (7−0.05−4.2)/0.4 = 6.875
    expect(targetFor(withPlan, 'B').neededStep).toBe(7);
  });
  it('bảng cân đối giữa hai thành phần còn lại', () => {
    const rows = tradeoff(ex, 'B', 1);
    const at = (a: number) => rows.find((r) => r.a === a)!;
    expect(at(10).b).toBe(5.5); // TN=10: (6.95−1.8−3.0)/0.4 = 5.375 → làm tròn lên 0,5
    expect(at(0).ok).toBe(false); // TN=0: CK phải (6.95−1.8)/0.4 = 12.9 > 10
  });
  it('có thành phần 0 điểm thì rớt môn ngay, kể cả điểm dự kiến 0', () => {
    expect(targetFor([c('GK', 30, 0), c('CK', 70, null)], 'D').state).toBe('failed');
    expect(targetFor([c('GK', 30, 10), c('CK', 70, 0)], 'D').state).toBe('failed');
    expect(targetFor([c('GK', 30, null, 0), c('CK', 70, null)], 'D').state).toBe('failed');
    expect(summarizeComponents([c('GK', 30, 0), c('CK', 70, null)]).zero?.name).toBe('GK');
    expect(summarizeComponents(ex).zero).toBeNull();
    expect(tradeoff([c('GK', 30, 0), c('CK', 40, null), c('TN', 30, null)], 'B')).toEqual([]);
  });
  it('đã đủ điểm nhưng các phần còn lại vẫn phải khác 0', () => {
    const t = targetFor([c('GK', 70, 10), c('CK', 30, null)], 'B');
    expect([t.state, t.positiveOnly]).toEqual(['done', true]);
  });
  it('bảng ngược: biết điểm thành phần thứ hai thì thành phần thứ nhất cần bao nhiêu', () => {
    const rev = tradeoff(ex, 'B', 1, 1);
    const at = (a: number) => rev.find((r) => r.a === a)!;
    expect(at(0).fail).toBe(true);
    // CK=10 → TN cần (6.95−1.8−4.0)/0.3 = 3.83 → 4.0
    expect(at(10).b).toBe(4);
    expect(at(1).ok).toBe(false);
  });
  it('bảng có điểm lẻ X.5 và đánh dấu 0 là rớt', () => {
    const rows = tradeoff(ex, 'B', 0.5, 0);
    expect(rows.some((r) => r.a === 7.5)).toBe(true);
    expect(rows[0]).toMatchObject({ a: 0, fail: true, ok: false });
  });
  it('độ vừa sức so với điểm trung bình của chính sinh viên', () => {
    expect(effort(5.5, 7.5).label).toBe('Dễ');
    expect(effort(7.5, 7.5).label).toBe('Vừa sức');
    expect(effort(8.8, 7.5).label).toBe('Cần cố gắng');
    expect(effort(9.5, 7.5).label).toBe('Rất khó');
    expect(effort(10.5, 7.5).label).toBe('Không khả thi');
  });
  it('lưu và đọc lại điểm thành phần, bỏ dữ liệu hỏng', () => {
    const a: Attempt = { id: 'x', name: 'Môn', credits: 3, score: null, semester: 'Năm học 2026 - 2027 / Học kỳ 1', components: [c('GK', 30, 6), { id: 'bad', name: 'x', weight: 500, score: null }, c('TN', 30, null, 8)] };
    const back = sanitize(JSON.parse(JSON.stringify({ attempts: [a] }))).attempts[0];
    expect(back.components?.map((x) => [x.name, x.weight, x.score, x.planned ?? null])).toEqual([['GK', 30, 6, null], ['TN', 30, null, 8]]);
  });
});

describe('mục tiêu: phối điểm và kịch bản', () => {
  const at = (id: string, credits: number, score: number): Attempt => ({ id, name: id, credits, score, semester: 'Năm học 2025 - 2026 / Học kỳ 1' });
  const base = [at('a', 50, 8.5), at('b', 50, 7.0)]; // 100 TC: GPA = (200+150)/100 = 3.5
  it('mỗi phương án có GPA cuối đạt mục tiêu', () => {
    const p = plan(base, 'highest', 3.55, 120);
    expect(p.status).toBe('ok');
    for (const o of p.options) expect(o.finalGpa).toBeGreaterThanOrEqual(3.55 - 1e-9);
  });
  it('kịch bản “toàn bộ TC còn lại cùng một mức”', () => {
    const s = scenarios(base, 'highest', 20);
    expect(s.find((x) => x.letter === 'A')!.gpa).toBeCloseTo((350 + 80) / 120, 9);
    expect(s.find((x) => x.letter === 'B')!.gpa).toBeCloseTo((350 + 60) / 120, 9);
    expect(s[0].delta).toBeGreaterThan(0);
  });
});

describe('mốc đánh giá độ vừa sức theo điểm thành phần', () => {
  const mk = (id: string, w: number, sc: number | null): Component => ({ id, name: id, weight: w, score: sc });
  it('chưa có điểm thành phần → dùng TB toàn bộ', () => {
    const b = effortBase([mk('a', 30, null), mk('b', 70, null)], 7.7);
    expect(b.base).toBeCloseTo(7.7); expect(b.p).toBeNull();
  });
  it('2 thành phần (TN 20% = 8, GK 30% = 6): α = 0,5, P = 6,8, mốc = 7,25', () => {
    const b = effortBase([mk('tn', 20, 8), mk('gk', 30, 6), mk('ck', 50, null)], 7.7);
    expect(b.alpha).toBeCloseTo(0.5); expect(b.p).toBeCloseTo(6.8); expect(b.base).toBeCloseTo(7.25); expect(b.rough).toBe(false);
  });
  it('chỉ 1 thành phần (GK 30% = 6): mốc 7,19 và báo ước lượng sơ bộ', () => {
    const b = effortBase([mk('gk', 30, 6), mk('ck', 70, null)], 7.7);
    expect(b.base).toBeCloseTo(7.19); expect(b.rough).toBe(true); expect(b.spread).toBeNull();
  });
  it('điểm dự kiến không tính; chưa có TB thì tạm lấy 7; chênh lệch được báo', () => {
    const b = effortBase([{ ...mk('a', 50, null), planned: 10 }, mk('b', 50, null)], null);
    expect(b.base).toBe(7); expect(b.fallback).toBe(true);
    expect(effortBase([mk('a', 30, 9.5), mk('b', 30, 6), mk('c', 40, null)], 7).spread).toBeCloseTo(3.5);
  });
});

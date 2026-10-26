import { describe, expect, it } from 'vitest';
import { componentsComplete, resolveGoal, effectiveAttempts, summarize, whatIf } from '../src/engine';
import type { Attempt } from '../src/engine';
import { weightOptions } from '../src/components/Courses';
import { guessFreeMajor, FREE_MAJORS } from '../src/data/freeElectives';

const comp = (name: string, weight: number, score: number | null) => ({ id: name, name, weight, score });

describe('resolveGoal: 3 cách lấy điểm', () => {
  it('theo mức chữ: đúng điểm tối thiểu của mức đó', () => {
    const g = resolveGoal({ components: [comp('GK', 30, 6), comp('CK', 70, null)], goal: 'B' });
    expect(g.score).toBe(7);
    expect(g.letter).toBe('B');
  });
  it('mức chữ không thể đạt thì null', () => {
    const g = resolveGoal({ components: [comp('GK', 90, 1), comp('CK', 10, null)], goal: 'A' });
    expect(g.score).toBeNull();
  });
  it('trung bình thành phần: chỉ khi nhập đủ', () => {
    const half = [comp('GK', 30, 6), comp('CK', 70, null)];
    expect(componentsComplete(half)).toBe(false);
    expect(resolveGoal({ components: half, goalMode: 'components' }).score).toBeNull();
    const full = [comp('GK', 30, 6), comp('CK', 70, 8)];
    expect(componentsComplete(full)).toBe(true);
    const g = resolveGoal({ components: full, goalMode: 'components' });
    expect(g.score).toBe(7.4);
    expect(g.letter).toBe('B');
  });
  it('thành phần 0 điểm thì F', () => {
    const g = resolveGoal({ components: [comp('GK', 30, 0), comp('CK', 70, 9)], goalMode: 'components' });
    expect(g).toMatchObject({ score: 0, letter: 'F', failed: true });
  });
  it('điểm tự nhập, làm tròn 1 chữ số, từ chối ngoài 0-10', () => {
    expect(resolveGoal({ goalMode: 'score', goalScore: 7.95 }).score).toBe(8);
    expect(resolveGoal({ goalMode: 'score' }).score).toBeNull();
    expect(resolveGoal({ goalMode: 'score', goalScore: 11 }).score).toBeNull();
  });
});

describe('học cải thiện trong tab Đang học', () => {
  const old: Attempt = { id: 'o', code: 'EE2009', name: 'Hệ thống máy tính', credits: 3, score: 6, semester: 'Năm học 2024 - 2025 / Học kỳ 1' };
  const cur: Attempt = { id: 'n', code: 'EE2009', name: 'Hệ thống máy tính', credits: 3, score: null, semester: 'Năm học 2026 - 2027 / Học kỳ 1' };
  const other: Attempt = { id: 'x', code: 'MT1003', name: 'Giải tích 1', credits: 4, score: 8, semester: 'Năm học 2024 - 2025 / Học kỳ 1' };
  it('điểm cũ được thay bằng điểm mới, không cộng trùng tín chỉ', () => {
    const r = whatIf([old, cur, other], 'highest', [{ attemptId: 'n', newScore: 9 }]);
    expect(r.after.countedCredits).toBe(r.before.countedCredits);
    expect(effectiveAttempts([old, { ...cur, score: 9 }, other], 'highest').map((a) => a.id)).not.toContain('o');
    expect(r.after.gpa!).toBeGreaterThan(r.before.gpa!);
  });
  it('điểm mới thấp hơn thì giữ điểm cũ', () => {
    const r = whatIf([old, cur, other], 'highest', [{ attemptId: 'n', newScore: 5 }]);
    expect(r.delta).toBeCloseTo(0, 9);
  });
  it('môn mới thật sự (không trùng) thì cộng thêm tín chỉ', () => {
    const fresh: Attempt = { ...cur, id: 'f', code: 'EE3069', name: 'PLC' };
    const r = whatIf([old, fresh, other], 'highest', [{ attemptId: 'f', newScore: 9 }]);
    expect(r.after.countedCredits).toBe(summarize([old, other], 'highest').countedCredits + 3);
  });
});

describe('gợi ý % theo thành phần', () => {
  it('đúng khoảng người dùng yêu cầu', () => {
    expect(weightOptions('Quiz')).toEqual([5, 10, 15, 20]);
    expect(weightOptions('Bài tập')).toEqual([5, 10, 15, 20]);
    expect(weightOptions('Thí nghiệm')).toEqual([10, 15, 20, 25, 30]);
    expect(weightOptions('Giữa kỳ')).toEqual([10, 15, 20, 25, 30]);
    expect(weightOptions('Bài tập lớn')).toEqual([10, 15, 20, 25, 30, 35, 40, 45, 50]);
    expect(weightOptions('Cuối kỳ')).toEqual([30, 35, 40, 45, 50, 55, 60, 65, 70]);
  });
});

describe('danh sách tự chọn tự do', () => {
  it('nhận ra ngành và có dữ liệu', () => {
    expect(guessFreeMajor('Kỹ thuật Điều khiển và Tự động hóa')).toBe('Kỹ thuật điều khiển và TĐH');
    expect(guessFreeMajor(undefined, 'DD23DTH3')).toBe('Kỹ thuật điều khiển và TĐH');
    const m = FREE_MAJORS.find((x) => x.key === 'Kỹ thuật điều khiển và TĐH')!;
    expect(m.courses.length).toBeGreaterThan(90);
    expect(m.courses.find((c) => c[0] === 'CO1003')?.[2]).toBe('excluded');
    expect(m.courses.find((c) => c[0] === 'EE3069')?.[2]).toBe('once');
    expect(new Set(m.courses.map((c) => c[0])).size).toBe(m.courses.length);
  });
});

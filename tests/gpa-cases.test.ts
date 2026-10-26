import { describe, expect, it } from 'vitest';
import { accumulatedCredits, bandOf, classify, degreeClass, failedCredits, failLimit, summarize } from '../src/engine';
import type { Attempt } from '../src/engine';
import { sanitize } from '../src/store';
import { validateAttempt } from '../src/engine';

// 10 trường hợp ở mục 7.1 của tài liệu hướng dẫn. Ngưỡng rớt = 6 TC (5% của 132, lấy phần nguyên); TC rớt thứ 7 trở đi thì hạ bằng.
let n = 0;
const mk = (code: string, credits: number, score: number | null, extra: Partial<Attempt> = {}): Attempt => ({
  id: `a${n++}`, code, name: code, credits, score, semester: 'HK1', ...extra,
});

describe('7.1 – logic GPA / tín chỉ / xếp loại / hạ bậc', () => {
  it('1. bảng điểm rỗng: không crash, GPA = null (chưa có dữ liệu)', () => {
    const s = summarize([], 'highest');
    expect(s.gpa).toBeNull();
    expect(s.classification).toBeNull();
    expect(s.countedCredits).toBe(0);
    expect(s.passedCredits).toBe(0);
    expect(failedCredits([])).toBe(0);
    const d = degreeClass([], s.gpa, 132);
    expect(d.final).toBeNull();
    expect(d.exceeded).toBe(false);
  });

  it('2. vài môn, tín chỉ khác nhau: GPA = Σ(điểm4 × TC) / Σ TC', () => {
    // 3TC×A(4.0) + 2TC×B(3.0) + 4TC×C+(2.5) + 1TC×D(1.0) = 12+6+10+1 = 29 / 10 TC
    const r = [mk('M1', 3, 9), mk('M2', 2, 7.2), mk('M3', 4, 6.5), mk('M4', 1, 4.5)];
    const s = summarize(r, 'highest');
    expect(s.gpa).toBeCloseTo(2.9, 10);
    expect(s.qualityPoints).toBeCloseTo(29, 10);
    expect(s.countedCredits).toBe(10);
    expect(s.avg10).toBeCloseTo((3 * 9 + 2 * 7.2 + 4 * 6.5 + 1 * 4.5) / 10, 10);
    expect(s.classification).toBe('Khá');
  });

  it('3. học cải thiện, lần sau thấp hơn: lấy điểm cao nhất, TC tính một lần', () => {
    const r = [mk('EE1', 3, 9), mk('EE1', 3, 6, { semester: 'HK2' }), mk('EE2', 3, 7)];
    const s = summarize(r, 'highest');
    expect(s.countedCredits).toBe(6); // EE1 chỉ một lần
    expect(s.courses).toBe(2);
    expect(s.gpa).toBeCloseTo((3 * 4 + 3 * 3) / 6, 10);
    expect(s.passedCredits).toBe(6);
    expect(accumulatedCredits(r, 'highest')).toBe(6);
  });

  it('4. rớt rồi học lại đạt: GPA lấy lần đạt, nhưng TC rớt vẫn được cộng', () => {
    const r = [mk('EE1', 3, 2), mk('EE1', 3, 7, { semester: 'HK2' }), mk('EE2', 4, 8)];
    expect(failedCredits(r)).toBe(3);
    const s = summarize(r, 'highest');
    expect(s.countedCredits).toBe(7);
    expect(s.passedCredits).toBe(7);
    expect(s.gpa).toBeCloseTo((3 * 3 + 4 * 3.5) / 7, 10);
    // rớt hai lần cũng cộng hai lần
    expect(failedCredits([...r, mk('EE1', 3, 1, { semester: 'HK3' })])).toBe(6);
  });

  it('5. TC rớt đúng 6 (ngưỡng của 132 TC): chưa bị hạ; sang TC rớt thứ 7 thì hạ', () => {
    expect(failLimit(132)).toBe(6);
    const mkCase = (failCr: number) => [
      mk('F1', failCr, 2), mk('F1', failCr, 8, { semester: 'HK2' }), // rớt rồi học lại đạt
      mk('X1', 50, 9), mk('X2', 50, 7.5),
    ];
    const at6 = mkCase(6), at7 = mkCase(7);
    const gpa6 = summarize(at6, 'highest').gpa;
    expect(classify(gpa6 as number)).toBe('Giỏi');
    expect(failedCredits(at6)).toBe(6);
    const d6 = degreeClass(at6, gpa6, 132);
    expect(d6.exceeded).toBe(false);
    expect(d6.downgraded).toBe(false);
    expect(d6.final).toBe('Giỏi');
    // rớt gộp từ nhiều môn: 3 + 3 = 6 vẫn chưa hạ, thêm 1 TC nữa là hạ
    const split = [mk('A', 3, 2), mk('B', 3, 1), mk('X', 100, 9)];
    expect(degreeClass(split, 4, 132).exceeded).toBe(false);
    expect(degreeClass([...split, mk('C', 1, 3)], 4, 132).exceeded).toBe(true);
    const d7 = degreeClass(at7, summarize(at7, 'highest').gpa, 132);
    expect(d7.failedCredits).toBe(7);
    expect(d7.exceeded).toBe(true);
    expect(d7.final).toBe('Khá');
  });

  it('6. TC rớt > 6 (7 TC), GPA Giỏi: hạ xuống Khá', () => {
    const r = [mk('F1', 7, 2), mk('F1', 7, 8, { semester: 'HK2' }), mk('X1', 50, 9), mk('X2', 50, 7.5)];
    const gpa = summarize(r, 'highest').gpa as number;
    expect(classify(gpa)).toBe('Giỏi');
    const d = degreeClass(r, gpa, 132);
    expect(d.failedCredits).toBe(7);
    expect(d.exceeded).toBe(true);
    expect(d.byGpa).toBe('Giỏi');
    expect(d.final).toBe('Khá');
    expect(d.downgraded).toBe(true);
  });

  it('7. TC rớt > 6, GPA Khá: vẫn giữ Khá', () => {
    const r = [mk('F1', 8, 2), mk('F1', 8, 8, { semester: 'HK2' }), mk('X1', 100, 7)];
    const gpa = summarize(r, 'highest').gpa as number;
    expect(classify(gpa)).toBe('Khá');
    const d = degreeClass(r, gpa, 132);
    expect(d.exceeded).toBe(true);
    expect(d.final).toBe('Khá');
    expect(d.downgraded).toBe(false);
  });

  it('8. môn không tính GPA (loại trừ, miễn MT, rút RT, chưa có điểm): không ảnh hưởng GPA', () => {
    const base = [mk('A', 3, 8), mk('B', 3, 6)];
    const g0 = summarize(base, 'highest');
    const extra = [
      ...base,
      mk('GDTC', 3, 2, { excluded: true }), // loại trừ, kể cả điểm F
      mk('MI', 3, null, { special: 'MT' }),
      mk('RT1', 3, null, { special: 'RT' }),
      mk('DANG', 3, null),
      mk('ZERO', 0, 4),
    ];
    const g1 = summarize(extra, 'highest');
    expect(g1.gpa).toBeCloseTo(g0.gpa as number, 10);
    expect(g1.countedCredits).toBe(6);
    expect(failedCredits(extra)).toBe(0);
    expect(g1.passedCredits).toBe(g0.passedCredits + 3); // MT cộng TC tích lũy nhưng không vào GPA
  });

  it('9. điểm biên giữa hai mức quy đổi', () => {
    const edges: [number, string, number][] = [
      [9.5, 'A+', 4], [9.49, 'A', 4], [8.5, 'A', 4], [8.49, 'B+', 3.5], [8, 'B+', 3.5], [7.99, 'B', 3],
      [7, 'B', 3], [6.99, 'C+', 2.5], [6.5, 'C+', 2.5], [6.49, 'C', 2], [5.5, 'C', 2], [5.49, 'D+', 1.5],
      [5, 'D+', 1.5], [4.99, 'D', 1], [4, 'D', 1], [3.99, 'F', 0],
    ];
    for (const [score, letter, point] of edges) {
      expect(bandOf(score).letter, `điểm ${score}`).toBe(letter);
      expect(bandOf(score).point, `điểm ${score}`).toBe(point);
    }
    // mốc xếp loại theo GPA
    expect([3.6, 3.59, 3.2, 3.19, 2.5, 2.49, 2.0, 1.99].map(classify))
      .toEqual(['Xuất sắc', 'Giỏi', 'Giỏi', 'Khá', 'Khá', 'Trung bình', 'Trung bình', 'Yếu']);
  });

  it('10. dữ liệu sai (điểm âm, > 10, TC = 0): không crash, không sinh NaN, không lọt vào GPA', () => {
    const bad = [mk('N', 3, -1), mk('H', 3, 11), mk('Z', 0, 8), mk('OK', 3, 8)];
    let s!: ReturnType<typeof summarize>;
    expect(() => { s = summarize(bad, 'highest'); degreeClass(bad, s.gpa, 132); failedCredits(bad); }).not.toThrow();
    expect(Number.isFinite(s.gpa as number)).toBe(true);
    // chỉ môn hợp lệ (OK) được tính
    expect(s.countedCredits).toBe(3);
    expect(s.gpa).toBeCloseTo(3.5, 10);

    // validateAttempt báo lỗi rõ ràng (TC = 0 là hợp lệ: môn chứng chỉ không tín chỉ)
    expect(validateAttempt(mk('N', 3, -1))).toEqual(['Điểm phải trong khoảng 0–10.']);
    expect(validateAttempt(mk('H', 3, 11))).toEqual(['Điểm phải trong khoảng 0–10.']);
    expect(validateAttempt(mk('C', -3, 8))).toEqual(['Số tín chỉ phải là số không âm.']);
    expect(validateAttempt(mk('C', NaN, 8))).toEqual(['Số tín chỉ phải là số không âm.']);
    expect(validateAttempt({ name: ' ', credits: 3, score: 5 })).toEqual(['Nhập tên môn học.']);
    expect(validateAttempt(mk('Z', 0, 8))).toEqual([]);
    expect(validateAttempt(mk('D', 3, null))).toEqual([]);
    expect(validateAttempt(mk('OK', 3, 10))).toEqual([]);

    // dữ liệu nạp từ file / nhập tay đi qua sanitize: điểm ngoài [0,10] bị bỏ, TC âm bị loại
    const clean = sanitize({
      attempts: [
        { name: 'neg', credits: 3, score: -1, semester: 'HK1' },
        { name: 'big', credits: 3, score: 11, semester: 'HK1' },
        { name: 'negcr', credits: -3, score: 8, semester: 'HK1' },
        { name: 'str', credits: '3', score: 8, semester: 'HK1' },
        { name: 'ok', credits: 3, score: 8, semester: 'HK1' },
      ],
    });
    const byName = Object.fromEntries(clean.attempts.map((a) => [a.name, a]));
    expect(byName.neg.score).toBeNull();
    expect(byName.big.score).toBeNull();
    expect(byName.negcr).toBeUndefined();
    expect(byName.str).toBeUndefined();
    expect(summarize(clean.attempts, 'highest').countedCredits).toBe(3);
  });
});

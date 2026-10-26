import { describe, expect, it } from 'vitest';
import sample from './sample37.json';
import {
  bySemester, classify, degreeClass, failedCredits, failLimit, distribution, effectiveAttempts, improvementSuggestions, letterOf,
  parsePasted, plan, pointOf, summarize, whatIf,
} from '../src/engine';
import type { Attempt } from '../src/engine';

const data = sample as Attempt[];
const mk = (name: string, credits: number, score: number | null, semester = 'HK1', excluded = false): Attempt => ({
  id: name + score + semester, name, credits, score, semester, excluded,
});

describe('thang điểm', () => {
  it.each([
    [10, 'A+', 4], [9.5, 'A+', 4], [9.4, 'A', 4], [9, 'A', 4], [8.9, 'A', 4], [8.5, 'A', 4], [8.4, 'B+', 3.5], [8, 'B+', 3.5],
    [7.9, 'B', 3], [7, 'B', 3], [6.9, 'C+', 2.5], [6.5, 'C+', 2.5], [6.4, 'C', 2], [5.5, 'C', 2],
    [5.4, 'D+', 1.5], [5, 'D+', 1.5], [4.9, 'D', 1], [4, 'D', 1], [3.9, 'F', 0], [0, 'F', 0],
  ])('%s → %s / %s', (s, l, p) => {
    expect(letterOf(s)).toBe(l);
    expect(pointOf(s)).toBe(p);
  });
  it('xếp loại', () => {
    expect(classify(3.6)).toBe('Xuất sắc');
    expect(classify(3.59)).toBe('Giỏi');
    expect(classify(3.19)).toBe('Khá'); // thiếu 0,01 để chạm Giỏi
    expect(classify(3.2)).toBe('Giỏi');
    expect(classify(3.1949)).toBe('Khá');
    expect(classify(2.0)).toBe('Trung bình');
    expect(classify(1.99)).toBe('Yếu');
    expect(classify(1.0)).toBe('Yếu');
    expect(classify(0.99)).toBe('Kém');
  });
});

describe('đối chiếu với file KD Study (37 môn, 101 TC)', () => {
  const s = summarize(data, 'highest');
  it('GPA và điểm TB hệ 10 khớp Excel', () => {
    expect(s.countedCredits).toBe(101);
    expect(s.courses).toBe(37);
    expect(s.gpa!).toBeCloseTo(3.01980198019802, 12);
    expect(s.avg10!).toBeCloseTo(7.552475247524754, 12);
  });
  it('phân bố điểm chữ (theo TC)', () => {
    const d = Object.fromEntries(distribution(data, 'highest').map((r) => [r.letter, r.credits]));
    expect(d).toMatchObject({ 'A+': 8, A: 12, 'B+': 17, B: 34, 'C+': 13, C: 14, D: 3, F: 0 });
  });
  it('xếp loại Khá', () => expect(s.classification).toBe('Khá'));
});

describe('học lại / cải thiện', () => {
  const rows = [mk('Giải tích 1', 4, 3.5, 'HK1'), mk('giải tích 1 ', 4, 6, 'HK2'), mk('Vật lí', 3, 8, 'HK1')];
  it('highest: lấy điểm cao nhất, không đếm 2 lần', () => {
    const s = summarize(rows, 'highest');
    expect(s.countedCredits).toBe(7);
    expect(s.gpa!).toBeCloseTo((4 * 2 + 3 * 3.5) / 7, 12);
  });
  it('latest: lấy lần học sau cùng kể cả thấp hơn', () => {
    const r = [mk('A', 3, 8, 'HK1'), mk('A', 3, 5, 'HK2')];
    expect(summarize(r, 'latest').gpa).toBe(1.5);
    expect(summarize(r, 'highest').gpa).toBe(3.5);
  });
  it('all: tính mọi lần học', () => expect(summarize(rows, 'all').countedCredits).toBe(11));
  it('môn đang học và môn loại trừ không tính', () => {
    const r = [mk('A', 3, 8), mk('B', 3, null), mk('GDTC', 2, 4, 'HK1', true)];
    expect(effectiveAttempts(r, 'highest')).toHaveLength(1);
    expect(summarize(r, 'highest').countedCredits).toBe(3);
  });
  it('môn F tính vào GPA nhưng không tính TC tích lũy', () => {
    const s = summarize([mk('A', 3, 8), mk('B', 3, 2)], 'highest');
    expect(s.countedCredits).toBe(6);
    expect(s.passedCredits).toBe(3);
    expect(s.gpa).toBe(1.75);
  });
  it('rỗng → null, không NaN', () => expect(summarize([], 'highest').gpa).toBeNull());
});

describe('GPA theo học kỳ', () => {
  it('tích lũy tăng dần', () => {
    const r = [mk('A', 3, 9, 'HK1'), mk('B', 3, 5, 'HK2')];
    const rows = bySemester(r, 'highest');
    expect(rows.map((x) => x.gpa)).toEqual([4, 1.5]);
    expect(rows.map((x) => x.cumulativeGpa)).toEqual([4, 2.75]);
  });
});

describe('lập kế hoạch GPA mục tiêu', () => {
  it('khớp công thức Excel: 130 TC, mục tiêu 3.2 → 24 TC A + 5 TC B', () => {
    const p = plan(data, 'highest', 3.2, 130);
    expect(p.status).toBe('ok');
    expect(p.remainingCredits).toBe(29);
    expect(p.requiredAvg!).toBeCloseTo(111 / 29, 9);
    const ab = p.options.find((o) => o.lowLetter === 'B')!;
    expect(ab.highCredits).toBe(24);
    expect(ab.lowCredits).toBe(5);
  });
  it('mỗi phương án phối thực sự đạt mục tiêu', () => {
    const p = plan(data, 'highest', 3.2, 130);
    const S = 101 * 3.0198019801980198;
    const pts: Record<string, number> = { 'B+': 3.5, B: 3, 'C+': 2.5, C: 2 };
    for (const o of p.options) {
      const gpa = (S + 4 * o.highCredits + pts[o.lowLetter] * o.lowCredits) / 130;
      expect(gpa).toBeGreaterThanOrEqual(3.2 - 1e-9);
    }
  });
  it('mục tiêu bất khả thi', () => {
    const p = plan(data, 'highest', 3.9, 130);
    expect(p.status).toBe('impossible');
    expect(p.feasible).toBe(false);
    expect(p.maxPossibleGpa!).toBeCloseTo((101 * 3.0198019801980198 + 4 * 29) / 130, 9);
  });
  it('đã đạt mục tiêu', () => expect(plan(data, 'highest', 2.0, 130).status).toBe('achieved'));
  it('hết tín chỉ', () => expect(plan(data, 'highest', 3.2, 101).status).toBe('no-credits'));
  describe('môn F chưa học lại không bị đếm hai lần ở mẫu số', () => {
    // 100 TC đạt GPA 3.0 + 1 môn F 4 TC; tổng 132 → còn 32 TC (gồm cả 4 TC học lại)
    const passed = Array.from({ length: 25 }, (_, i) => ({ ...mk('M' + i, 4, 7.5), code: 'M' + i }));
    const fail = { ...mk('F1', 4, 2), code: 'F1' };
    it('mục tiêu 3.2: cần (3.2·132 − 300) / 32, không phải /136', () => {
      const p = plan([...passed, fail], 'highest', 3.2, 132);
      expect(p.remainingCredits).toBe(32);
      expect(p.base).toBe(100);
      expect(p.status).toBe('ok');
      expect(p.requiredAvg!).toBeCloseTo((3.2 * 132 - 300) / 32, 9);
      expect(p.maxPossibleGpa!).toBeCloseTo((300 + 4 * 32) / 132, 9);
    });
    it('đã học lại đạt: không còn F treo', () => {
      const p = plan([...passed, fail, { ...mk('F1', 4, 8), code: 'F1', id: 'retake' }], 'highest', 3.2, 132);
      expect(p.base).toBe(104);
      expect(p.remainingCredits).toBe(28);
      expect(p.requiredAvg!).toBeCloseTo((3.2 * 132 - (300 + 14)) / 28, 9);
    });
    it('không có F: kết quả như cũ', () => {
      const p = plan(passed, 'highest', 3.2, 132);
      expect(p.base).toBe(100);
      expect(p.requiredAvg!).toBeCloseTo((3.2 * 132 - 300) / 32, 9);
    });
    it("quy tắc 'all' giữ điểm F trong GPA nên không trừ", () => {
      expect(plan([...passed, fail], 'all', 3.2, 132).base).toBe(104);
    });
  });
});

describe('giả lập & gợi ý cải thiện', () => {
  it('nâng Kĩ thuật số 4.4 → 7.0 (D→B, +2 điểm × 3 TC / 101)', () => {
    const id = data.find((a) => a.name === 'Kĩ thuật số')!.id;
    const r = whatIf(data, 'highest', [{ attemptId: id, newScore: 7 }]);
    expect(r.delta).toBeCloseTo((3 * 2) / 101, 9);
    expect(summarize(data, 'highest').gpa!).toBeCloseTo(3.0198019801980198, 12); // không sửa dữ liệu gốc
  });
  it('gợi ý xếp theo mức tăng GPA giảm dần', () => {
    const s = improvementSuggestions(data, 'highest', 'B');
    expect(s[0].name).toBe('Kĩ thuật số');
    for (let i = 1; i < s.length; i++) expect(s[i - 1].gain).toBeGreaterThanOrEqual(s[i].gain);
  });
});

describe('nhập dữ liệu dán', () => {
  it('đọc tab và báo lỗi theo dòng', () => {
    const r = parsePasted('Giải tích 1\t4\t8,4\nSai\t0\t5\nThiếu cột\nVật lí\t3\t11\nOK\t2\t', 'HK1');
    expect(r.attempts.map((a) => [a.name, a.credits, a.score])).toEqual([['Giải tích 1', 4, 8.4], ['OK', 2, null]]);
    expect(r.errors.map((e) => e.line)).toEqual([2, 3, 4]);
  });
});

describe('tín chỉ rớt & hạ bằng (quy tắc 5% / 132 TC)', () => {
  const good = [mk('A', 100, 9.5)]; // GPA 4.0 → Xuất sắc
  const withFail = (credits: number, extra: Attempt[] = []) => [...good, mk('F-course', credits, 3, 'HK1'), ...extra];
  it('ngưỡng = 6 TC (5% của 132 = 6.6, lấy phần nguyên)', () => expect(failLimit(132)).toBe(6));
  it('rớt 6 TC chưa vượt → giữ nguyên', () => {
    const r = withFail(6); const s = summarize(r, 'highest');
    const d = degreeClass(r, s.gpa, 132);
    expect(d.failedCredits).toBe(6); expect(d.exceeded).toBe(false); expect(d.final).toBe(d.byGpa);
  });
  it('rớt 7 TC vượt → Xuất sắc hạ Giỏi', () => {
    const r = [mk('A', 125, 9.5), mk('X', 7, 3)];
    const d = degreeClass(r, summarize(r, 'highest').gpa, 132);
    expect(d.byGpa).toBe('Xuất sắc'); expect(d.exceeded).toBe(true); expect(d.final).toBe('Giỏi'); expect(d.downgraded).toBe(true);
  });
  it('Giỏi hạ Khá', () => {
    const r = [mk('A', 96, 8.5), mk('B', 25, 7.5), mk('X', 7, 3)]; // (800+... ) → vẫn Giỏi theo GPA
    const g = summarize(r, 'highest').gpa!;
    expect(classify(g)).toBe('Giỏi');
    expect(degreeClass(r, g, 132).final).toBe('Khá');
  });
  it('Khá không bị hạ xuống Trung bình', () => {
    const r = [mk('A', 100, 7.5), mk('X', 10, 3)];
    const g = summarize(r, 'highest').gpa!;
    const d = degreeClass(r, g, 132);
    expect(d.byGpa).toBe('Khá'); expect(d.exceeded).toBe(true); expect(d.final).toBe('Khá'); expect(d.downgraded).toBe(false);
  });
  it('lần rớt đã học lại vẫn được cộng vào tín chỉ rớt, nhưng GPA lấy lần cao nhất', () => {
    const r = [mk('Giải tích', 4, 3, 'HK1'), mk('Giải tích', 4, 6, 'HK2'), mk('Vật lí', 4, 3, 'HK1'), mk('Vật lí', 4, 7, 'HK2')];
    expect(failedCredits(r)).toBe(8);
    expect(summarize(r, 'highest').countedCredits).toBe(8);
    expect(degreeClass(r, summarize(r, 'highest').gpa, 132).exceeded).toBe(true);
  });
  it('môn loại trừ và môn chưa có điểm không tính rớt', () => {
    expect(failedCredits([mk('GDTC', 3, 2, 'HK1', true), mk('Đang học', 3, null)])).toBe(0);
  });
  it('tổng TC 120 → ngưỡng 6 → rớt 6 TC chưa vượt, 7 TC vượt', () => {
    const a = [mk('A', 100, 9.5), mk('X', 6, 3)];
    expect(degreeClass(a, 4, 120).exceeded).toBe(false);
    expect(degreeClass([mk('A', 100, 9.5), mk('X', 7, 3)], 4, 120).exceeded).toBe(true);
  });
});

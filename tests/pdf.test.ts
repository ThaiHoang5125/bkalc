import { describe, expect, it } from 'vitest';
import transcript from './fixtures/transcript.json';
import progress from './fixtures/progress.json';
import {
  accumulatedCredits, bandOf, bySemester, computeProgress, degreeClass, failedCredits, plan, programTotal,
  summarize, verify,
} from '../src/engine';
import type { Attempt, Official, Program } from '../src/engine';
import { buildLines, parsePdfItems } from '../src/pdf';
import type { Item } from '../src/pdf';

const attempts = transcript.attempts as Attempt[];
const official = transcript.official as Official;
const program = progress.program as Program;

describe('đối chiếu với bảng điểm ví dụ theo form của trường (47 dòng, 7 học kỳ; điểm là số giả lập)', () => {
  it('mọi con số tích lũy / học kỳ khớp form của trường', () => {
    const checks = verify(attempts, 'highest', official);
    expect(checks).toHaveLength(2 + 1 + 14); // GPA, tín chỉ, điểm chữ, 7 học kỳ × 2
    expect(checks.filter((c) => !c.ok)).toEqual([]);
  });
  it('điểm chữ tính từ điểm số khớp điểm chữ in trên form của trường (kể cả 9.4 → A, 9.5 → A+)', () => {
    const lettered = attempts.filter((a) => a.officialLetter);
    expect(lettered.length).toBeGreaterThan(35);
    expect(lettered.filter((a) => bandOf(a.score as number).letter !== a.officialLetter)).toEqual([]);
    expect(lettered.find((a) => a.score === 9.4)?.officialLetter).toBe('A');
    expect(lettered.find((a) => a.score === 9.5)?.officialLetter).toBe('A+');
    const g = progress.grades.filter((x) => x.letter);
    expect(g.length).toBeGreaterThan(30);
    expect(g.filter((x) => bandOf(x.score as number).letter !== x.letter)).toEqual([]);
  });
  it('GPA tích lũy 2.9, 107 tín chỉ, TB hệ 10 = 7.33 (khớp form tiến độ)', () => {
    const s = summarize(attempts, 'highest');
    expect(s.gpa!).toBeCloseTo(2.9257, 4);
    expect(s.passedCredits).toBe(107);
    expect(Math.round(s.avg10! * 100) / 100).toBe(progress.official.avg10);
  });
  it('học lại Giải tích 1 (6.3 → 8.4): chỉ lấy lần cao nhất, tín chỉ không đếm hai lần', () => {
    const gt1 = attempts.filter((a) => a.code === 'MT1003');
    expect(gt1.map((a) => a.score)).toEqual([6.3, 8.4]);
    const only = summarize(attempts.filter((a) => a.code !== 'MT1003' || a.score === 8.4), 'highest');
    expect(summarize(attempts, 'highest').gpa).toBeCloseTo(only.gpa!, 12);
    expect(summarize(attempts, 'all').countedCredits).toBe(summarize(attempts, 'highest').countedCredits + 4);
  });
  it('điểm miễn MT: cộng tín chỉ tích lũy nhưng không vào GPA; Anh văn 2 có cả điểm số và MT chỉ tính một lần', () => {
    const mt = attempts.filter((a) => a.special === 'MT');
    expect(mt.map((a) => a.code).sort()).toEqual(['LA1003', 'LA1005', 'LA1007', 'LA1009']);
    const noMt = attempts.filter((a) => a.special !== 'MT');
    expect(summarize(noMt, 'highest').gpa).toBe(summarize(attempts, 'highest').gpa);
    expect(accumulatedCredits(attempts, 'highest') - accumulatedCredits(noMt, 'highest')).toBe(6); // 3 môn MT, trừ Anh văn 2
  });
  it('môn rút (RT) không tính vào GPA, tín chỉ, tín chỉ rớt', () => {
    const rt = attempts.filter((a) => a.special === 'RT');
    expect(rt.map((a) => a.code).sort()).toEqual(['IM1027', 'LA1007']);
    expect(rt.every((a) => a.excluded)).toBe(true);
    expect(failedCredits(attempts)).toBe(0);
  });
  it('không rớt môn nào → không bị hạ bằng; xếp loại Khá', () => {
    const s = summarize(attempts, 'highest');
    const d = degreeClass(attempts, s.gpa, 132);
    expect(d.failedCredits).toBe(0); expect(d.downgraded).toBe(false); expect(d.final).toBe('Khá');
  });
  it('thứ tự học kỳ theo thời gian, môn miễn thuộc học kỳ đầu tiên', () => {
    const rows = bySemester(attempts, 'highest');
    expect(rows[0].semester).toBe('Năm học 2023 - 2024 / Học kỳ 1');
    expect(rows[rows.length - 1].semester).toBe('Năm học 2025 - 2026 / Học kỳ 2');
    expect(rows.map((r) => r.cumulativeCredits)).toEqual([23, 37, 52, 70, 73, 89, 107]);
  });
});

describe('tiến độ chương trình đào tạo (132 tín chỉ)', () => {
  const pr = computeProgress(program, attempts, 'highest');
  it('tổng yêu cầu 132, đã đạt 107, khớp đầu form', () => {
    expect(programTotal(program)).toBe(progress.official.totalCredits);
    expect(pr.required).toBe(132);
    expect(pr.earned).toBe(progress.official.credits);
  });
  it('từng nhóm khớp "x/y" trên form của trường', () => {
    for (const g of pr.groups) if (g.group.officialEarned !== undefined) expect([g.group.name, g.earned]).toEqual([g.group.name, g.group.officialEarned]);
  });
  it('nhóm tự chọn: PLC + SCADA = 6/9, môn tự chọn chưa học ở trạng thái todo', () => {
    const a = pr.groups.find((g) => g.group.name === 'Chuyên ngành (Nhóm A)')!;
    expect(a.group.kind).toBe('elective');
    expect(a.courses.filter((c) => c.status === 'passed').map((c) => c.course.code).sort()).toEqual(['EE3069', 'EE3071']);
    expect(a.courses.filter((c) => c.status === 'todo')).toHaveLength(8);
  });
  it('Anh văn 1/3/4 là điểm miễn nên vẫn đạt', () => {
    const nn = pr.groups.find((g) => g.group.name === 'Ngoại ngữ')!;
    expect(nn.courses.map((c) => [c.course.code, c.status, c.special ?? '']).sort()).toEqual([
      ['LA1003', 'passed', 'MT'], ['LA1005', 'passed', ''], ['LA1007', 'passed', 'MT'], ['LA1009', 'passed', 'MT'],
    ]);
  });
  it('kế hoạch GPA dùng đúng 25 tín chỉ còn lại', () => {
    const p = plan(attempts, 'highest', 3.2, 132, pr.earned);
    expect(p.remainingCredits).toBe(25);
    // Mẫu số GPA cuối = 101 TC đã có điểm số + 25 TC sắp học (6 TC điểm miễn không vào GPA)
    const s = summarize(attempts, 'highest');
    expect(s.countedCredits).toBe(101);
    expect(p.requiredAvg!).toBeCloseTo((3.2 * (101 + 25) - s.qualityPoints) / 25, 9);
  });
  it('môn rớt đang học lại → trạng thái "đang học"; rớt chưa học lại vẫn là "chưa đạt"; có kèm học kỳ', () => {
    const sem = 'Năm học 2025 - 2026 / Học kỳ 2';
    const base = attempts.filter((a) => a.code !== 'EE3069');
    const statusOf = (rows: Attempt[]) => computeProgress(program, rows, 'highest').groups.flatMap((g) => g.courses).find((c) => c.course.code === 'EE3069')!;
    const failed: Attempt = { id: 'f1', code: 'EE3069', name: 'PLC', credits: 3, score: 3, semester: 'Năm học 2024 - 2025 / Học kỳ 1' };
    expect(statusOf([...base, failed]).status).toBe('failed');
    const retake = statusOf([...base, failed, { id: 'f2', code: 'EE3069', name: 'PLC', credits: 3, score: null, semester: sem }]);
    expect(retake.status).toBe('enrolled'); expect(retake.score).toBe(3); expect(retake.semester).toBe(sem);
    const passed = statusOf([...base, failed, { id: 'f3', code: 'EE3069', name: 'PLC', credits: 3, score: 7, semester: sem }]);
    expect(passed.status).toBe('passed'); expect(passed.semester).toBe(sem);
  });
  it('môn ngoài chương trình đã chọn: chỉ tính 3 môn điểm cao nhất vào Tự chọn tự do, môn thấp điểm bị bỏ', () => {
    const sem = 'Năm học 2025 - 2026 / Học kỳ 2';
    const out = [['ZZ1', 6], ['ZZ2', 9], ['ZZ3', 7.5], ['ZZ4', 8], ['ZZ5', 5]].map(([code, score], i) => ({ id: 'z' + i, code: code as string, name: code as string, credits: 2, score: score as number, semester: sem }));
    const rows: Attempt[] = [...attempts, ...out];
    const base = computeProgress(program, attempts, 'highest').groups.find((g) => g.group.free)!.earned;
    const p = computeProgress(program, rows, 'highest', ['ZZ1', 'ZZ2', 'ZZ3', 'ZZ4', 'ZZ5']);
    expect(p.freeOutside.map((x) => x.code)).toEqual(['ZZ2', 'ZZ4', 'ZZ3']);
    expect(p.freeSkipped.map((x) => x.code)).toEqual(['ZZ1', 'ZZ5']);
    const free = p.groups.find((g) => g.group.free)!;
    expect(free.rawEarned).toBe(base + 6); // 3 môn × 2 tín chỉ
  });
  it('điểm tự do: điền theo điểm cao → thấp vào 9 tín chỉ, môn cuối chỉ tính một phần; điểm = Σ tín chỉ × điểm hệ 4', () => {
    const sem = 'Năm học 2025 - 2026 / Học kỳ 2';
    const mk = (spec: [string, number, number][]): Attempt[] => [...attempts, ...spec.map(([code, credits, score], i) => ({ id: 'q' + i, code, name: code, credits, score, semester: sem }))];
    const keys = ['AA', 'BB', 'CC'];
    // Ví dụ: A 4 tín điểm B, B 3 tín điểm B+, C 3 tín điểm A → 3×4 + 3×3.5 + 3×3 (chỉ 3/4 tín chỉ môn A)
    const p = computeProgress(program, mk([['AA', 4, 7], ['BB', 3, 8], ['CC', 3, 9]]), 'highest', keys);
    expect(p.freeOutside.map((x) => x.code)).toEqual(['CC', 'BB', 'AA']);
    expect(p.freeUsed.get('q0')).toBe(3);
    expect(p.freeCredits).toBe(9);
    expect(p.freePoints).toBeCloseTo(31.5, 9);
    // Môn nhiều tín chỉ nhưng điểm cao được ưu tiên: A 4 tín điểm A → 4×4 + 3×3.5 + 2×3
    const q = computeProgress(program, mk([['AA', 4, 9], ['BB', 3, 8], ['CC', 3, 7]]), 'highest', keys);
    expect(q.freeUsed.get('q2')).toBe(2);
    expect(q.freePoints).toBeCloseTo(16 + 10.5 + 6, 9);
    // Không dư tín chỉ thì không cắt: 3 + 3 + 2 = 8 < 9
    const r = computeProgress(program, mk([['AA', 3, 7], ['BB', 3, 8], ['CC', 2, 9]]), 'highest', keys);
    expect(r.freeCredits).toBe(8);
    expect(r.freePoints).toBeCloseTo(3 * 3 + 3 * 3.5 + 2 * 4, 9);
    // Nhóm tự do đã đủ 9 tín chỉ từ 3 môn điểm cao hơn → môn thứ 4 bị loại (cả vì vượt 3 môn)
    const s = computeProgress(program, mk([['AA', 3, 9], ['BB', 3, 9], ['CC', 3, 8], ['DD', 3, 7]]), 'highest', [...keys, 'DD']);
    expect(s.freeSkipped.map((x) => x.code)).toEqual(['DD']);
    expect(s.freeCredits).toBe(9);
  });
  it('phần dư của nhóm tự chọn chảy sang nhóm tự do; môn ngoài chương trình cũng vậy', () => {
    const extra: Attempt[] = [
      ...attempts,
      ...['EE3057', 'EE3063'].map((code, i) => ({ id: 'x' + i, code, name: code, credits: 3, score: 8, semester: 'Năm học 2025 - 2026 / Học kỳ 2' })),
      { id: 'o1', code: 'ZZ9999', name: 'Môn ngoài CTĐT', credits: 2, score: 9, semester: 'Năm học 2025 - 2026 / Học kỳ 2' },
    ];
    const p2 = computeProgress(program, extra, 'highest', ['ZZ9999']);
    const a = p2.groups.find((g) => g.group.name === 'Chuyên ngành (Nhóm A)')!;
    expect(a.rawEarned).toBe(12); expect(a.earned).toBe(9); expect(a.overflow).toBe(3);
    const free = p2.groups.find((g) => g.group.free)!;
    expect(free.earned).toBe(5); // 3 dư + 2 môn ngoài chương trình
    expect(p2.outside.map((x) => x.code)).toEqual(['ZZ9999']);
    expect(p2.freeOutside.map((x) => x.code)).toEqual(['ZZ9999']);
    // Mặc định môn ngoài chương trình không tự tính vào tự chọn tự do; chỉ phần dư của nhóm tự chọn chảy sang
    const p3 = computeProgress(program, extra, 'highest');
    expect(p3.outside.map((x) => x.code)).toEqual(['ZZ9999']);
    expect(p3.freeOutside).toEqual([]);
    expect(p3.groups.find((g) => g.group.free)!.earned).toBe(3);
    expect(p3.earned + 2).toBe(p2.earned);
  });
});

// Dựng PDF giả bằng toạ độ để kiểm thử bộ đọc mà không cần file thật: chữ bị cắt vụn theo dấu, mảnh khoảng trắng giữa cột.
const mk = (y: number, parts: [number, string][]): Item[] => parts.map(([x, s]) => ({ str: s, x, y, w: s.length * 5 }));
const header: Item[] = [...mk(400, [[43, 'Stt']]), ...mk(380, [[43, 'Stt'], [153, 'Tên môn học']])];

describe('bộ đọc PDF trên dữ liệu giả lập', () => {
  it('ghép chữ bị cắt vụn và bỏ mảnh khoảng trắng giữa các cột', () => {
    const items: Item[] = [...mk(100, [[10, 'Đ'], [15, 'o l'], [25, 'ư'], [30, 'ờ'], [35, 'ng'], [40, ' '], [200, 'x']])];
    const [line] = buildLines([items]);
    expect(line.cells.map((c) => c.text)).toEqual(['Đo lường', 'x']);
  });
  it('đọc học kỳ, dòng tổng kết, môn có tên xuống dòng, môn miễn', () => {
    const page: Item[] = [
      ...mk(700, [[28, 'BẢNG ĐIỂM']]), ...mk(690, [[28, 'Họ và tên: A B']]),
      ...header,
      ...mk(360, [[265, '3.0'], [313, '30'], [423, 'Tích lũy chung']]),
      ...mk(345, [[43, 'Năm học 2024 - 2025 / Học kỳ 1']]),
      ...mk(330, [[265, '3.5'], [315, '10'], [423, 'Tích lũy học kỳ']]),
      ...mk(300, [[46, '1'], [74, 'EE3017'], [124, 'Đo lường và Điều khiển'], [250, '8.5'], [285, 'A'], [318, '3'], [347, '✓'], [454, 'L04']]),
      ...mk(285, [[124, 'bằng Máy tính']]),
      ...mk(260, [[46, '2'], [73, 'SA0002'], [124, 'Sinh hoạt'], [250, '9'], [285, 'A'], [318, '0'], [372, 'Không in trên']]),
      ...mk(245, [[372, 'bảng điểm']]),
      ...mk(220, [[46, '3'], [73, 'IM1027'], [124, 'Kinh tế Kỹ thuật'], [252, '17'], [281, 'RT'], [318, '3'], [372, 'Không in trên'], [486, 'Không tính TCTL']]),
      ...mk(205, [[372, 'bảng điểm'], [486, '& TBTL']]),
      ...mk(180, [[43, 'Môn học chuyển điểm/miễn điểm'], [318, '2']]),
      ...mk(160, [[44, '4'], [73, 'LA1003'], [124, 'Anh văn 1'], [252, '12'], [281, 'MT'], [318, '2'], [347, '✓'], [486, '226/BKDT']]),
      ...mk(140, [[44, '5'], [73, 'CCGDTC'], [124, 'Chứng chỉ GDTC'], [252, '21'], [281, 'DT'], [318, '0'], [372, 'Không in trên'], [486, 'Không tính TCTL']]),
      // dòng "Tích lũy" thứ hai và tiêu đề trang đầu (nằm trước bảng) không được nhầm là môn học
    ];
    const r = parsePdfItems([page]);
    if (r.kind !== 'transcript') throw new Error('sai loại');
    expect(r.student.name).toBe('A B');
    expect(r.skipped).toBe(2); // Sinh hoạt và CCGDTC: 0 TC, không in trên bảng điểm
    expect(r.certs).toEqual(['CCGDTC']);
    expect(r.attempts.map((a) => [a.code, a.name, a.score, a.special ?? '', a.excluded ?? false])).toEqual([
      ['EE3017', 'Đo lường và Điều khiển bằng Máy tính', 8.5, '', false],
      ['IM1027', 'Kinh tế Kỹ thuật', null, 'RT', true],
      ['LA1003', 'Anh văn 1', null, 'MT', false],
    ]);
    expect(r.official.semesters).toEqual([{ semester: 'Năm học 2024 - 2025 / Học kỳ 1', cumGpa: 3, cumCredits: 30, semGpa: 3.5, semCredits: 10 }]);
  });
  it('báo lỗi rõ ràng khi không phải form của trường', () => {
    expect(() => parsePdfItems([mk(100, [[10, 'Hóa đơn tiền điện']])])).toThrow(/Không nhận ra/);
  });
  it('nhận ra tên học kỳ dù ở lệch cột hoặc chữ tiếng Việt dạng tổ hợp (NFD)', () => {
    const sem = 'Năm học 2024 - 2025 / Học kỳ 1'.normalize('NFD');
    const page: Item[] = [
      ...mk(700, [[28, 'BẢNG ĐIỂM']]), ...header,
      ...mk(360, [[265, '3.0'], [313, '30'], [423, 'Tích lũy chung']]),
      ...mk(345, [[120, sem]]),
      ...mk(330, [[265, '3.5'], [315, '10'], [423, 'Tích lũy học kỳ']]),
      ...mk(300, [[46, '1'], [74, 'EE3017'], [124, 'Đo lường'], [250, '8.5'], [285, 'A'], [318, '3'], [347, '✓']]),
    ];
    const r = parsePdfItems([page]);
    if (r.kind !== 'transcript') throw new Error('sai loại');
    expect(r.attempts[0].semester).toBe('Năm học 2024 - 2025 / Học kỳ 1');
  });
  it('báo lỗi rõ ràng khi không nhận ra học kỳ nào', () => {
    const page: Item[] = [...mk(700, [[28, 'BẢNG ĐIỂM']]), ...header, ...mk(360, [[265, '3.0'], [313, '30'], [423, 'Tích lũy chung']]), ...mk(300, [[46, '1'], [74, 'EE3017'], [124, 'Đo lường'], [250, '8.5'], [285, 'A'], [318, '3'], [347, '✓']])];
    expect(() => parsePdfItems([page])).toThrow(/Học kỳ/);
  });
});

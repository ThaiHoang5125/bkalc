import { describe, expect, it } from 'vitest';
import { fixCode, parseOcr } from '../src/ocr/layout';
import type { OcrPage, OcrWord } from '../src/ocr/layout';

/** Dựng ảnh OCR giả: mỗi hàng là danh sách [x, chữ]; hàng cách nhau 30 px, chữ cao 20 px. */
function page(rows: [number, string][][]): OcrPage {
  const words: OcrWord[] = [];
  rows.forEach((r, i) => r.forEach(([x, text]) => words.push({ text, x0: x, y0: 40 + i * 30, x1: x + text.length * 11, y1: 60 + i * 30, conf: 90 })));
  return { width: 1700, height: 1200, words };
}

const head: [number, string][][] = [
  [[500, 'BẢNG'], [570, 'ĐIỂM']],
  [[40, 'Họ'], [70, 'và'], [100, 'tên:'], [150, 'NGUYỄN'], [230, 'VĂN'], [280, 'A']],
  [[40, 'Mã'], [70, 'sinh'], [110, 'viên:'], [160, '2000001']],
  [[40, 'Mã'], [70, 'lớp:'], [120, 'XX20YYY1']],
  [[1000, 'Cập'], [1040, 'nhật'], [1080, 'cuối:'], [1130, '01/01/2026']],
  [[100, 'Stt'], [200, 'Mã'], [260, 'môn'], [340, 'Tên'], [400, 'môn'], [450, 'học'], [700, 'Điểm'], [800, 'Tín'], [900, 'chỉ'], [1000, 'Đạt'], [1100, 'Tình'], [1160, 'trạng']],
];

describe('đọc ảnh chụp bảng điểm (OCR giả lập)', () => {
  const rows: [number, string][][] = [
    ...head,
    [[700, '3.0'], [850, '107'], [1200, 'Tích'], [1260, 'lũy'], [1300, 'chung']],
    [[100, 'Năm'], [150, 'học'], [200, '2025'], [250, '-'], [270, '2026'], [330, '/'], [350, 'Học'], [400, 'kỳ'], [440, '1']],
    [[110, '1'], [200, 'MT1003'], [330, 'Giải'], [380, 'tích'], [430, '1'], [700, '8.4'], [790, 'B+'], [880, '4'], [960, '✓'], [1300, 'L01']],
    [[110, '2'], [200, 'EE3017'], [330, 'Đo'], [370, 'lường'], [430, '7.9'], [790, 'B'], [880, '3'], [960, '✓'], [1300, 'L02']],
    [[110, '3'], [200, 'PH1003'], [330, 'Vật'], [380, 'lý'], [420, '1'], [700, '65'], [790, 'C+'], [880, '4'], [960, '✓'], [1300, 'L03']], // mất dấu chấm
    [[110, '4'], [200, 'SA0002'], [330, 'Sinh'], [380, 'hoạt'], [700, '8.5'], [790, 'A'], [880, '0'], [960, '✓'], [1100, 'Không'], [1160, 'in'], [1200, 'trên']],
    [[1100, 'bảng'], [1160, 'điểm']],
    [[700, '3.4'], [850, '11'], [1200, 'Tích'], [1260, 'lũy'], [1300, 'học'], [1340, 'kỳ']],
  ];
  const r = parseOcr([page(rows)]);
  it('nhận ra form, sinh viên, học kỳ và các môn', () => {
    expect(r.kind).toBe('transcript');
    if (r.kind !== 'transcript') return;
    expect(r.student).toMatchObject({ name: 'NGUYỄN VĂN A', id: '2000001', className: 'XX20YYY1' });
    expect(r.attempts.map((a) => [a.code, a.score, a.credits])).toEqual([['MT1003', 8.4, 4], ['EE3017', 7.9, 3], ['PH1003', 6.5, 4]]);
    expect(r.attempts[0].semester).toBe('Năm học 2025 - 2026 / Học kỳ 1');
    expect(r.skipped).toBe(1); // Sinh hoạt sinh viên 0 tín chỉ
    expect(r.official.semesters?.[0]).toMatchObject({ cumGpa: 3, cumCredits: 107 });
  });
  it('điểm bị mất dấu chấm được khôi phục và có cảnh báo', () => {
    expect(r.warnings.some((w) => /PH1003/.test(w) && /6\.5/.test(w))).toBe(true);
  });
  it('ảnh không phải form của trường thì báo lỗi rõ ràng', () => {
    expect(() => parseOcr([page([[[10, 'Hello'], [80, 'world']]])])).toThrow(/Không nhận ra/);
  });
  it('sửa nhầm ký tự trong mã môn', () => {
    expect(fixCode('EE30I7')).toBe('EE3017');
    expect(fixCode('4$EE3075')).toBe('EE3075');
    expect(fixCode('CCGDTC')).toBe('CCGDTC');
    expect(fixCode('Giải')).toBeNull();
  });
});

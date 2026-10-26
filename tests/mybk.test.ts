import { describe, it, expect } from 'vitest';
import { parseSections } from '../src/engine/timetable';

// Dữ liệu tổng hợp (không phải dữ liệu thật) theo bố cục kết quả đăng ký MyBK
const lines = [
  'Kết quả đăng ký đợt 1 (HK261_D1)',
  'XX1001 - Môn thử nghiệm A 3.0',
  'L04_L16 28/30 V',
  'Thứ 4 - - 8 9 10 11 12 - - - - - - - - - H6-301 2 ----5-7-9-1-3-5---',
  'Thứ 6 - - - - - - - - 6 7 8 - - - - - H1-GDH1 2 ----5-7-9-1-3-5---',
  'XX1002 - Môn thử nghiệm B 4.0',
  'L02 30/30 V',
  'Thứ 2 - 2 3 4 - - - - - - - - - - - - A5-HTA5 1 123456789012345678',
  'Chủ nhật - - - 4 5 - - - - - - - - - - - A1-101 1 123456789012345678',
];
describe('MyBK', () => {
  it('đọc môn, nhóm, sĩ số, buổi học, tuần', () => {
    const r = parseSections(lines);
    expect(r.meta).toEqual({ semester: 'Năm học 2026 - 2027 / Học kỳ 1', round: 1 });
    const a = r.sections.find((s) => s.code === 'XX1001')!;
    expect(a.group).toBe('L04_L16'); expect(a.credits).toBe(3); expect(a.seats).toEqual({ taken: 28, max: 30 });
    expect(a.slots).toHaveLength(2);
    expect(a.slots[0]).toMatchObject({ day: 4, start: 8, len: 5, room: 'H6-301' });
    expect(a.slots[0].weeks).toEqual([5, 7, 9, 11, 13, 15]);
    expect(a.slots[1]).toMatchObject({ day: 6, start: 6, len: 3 });
    const b = r.sections.find((s) => s.code === 'XX1002')!;
    expect(b.slots.map((s) => s.day)).toEqual([2, 8]);
    expect(b.slots[0]).toMatchObject({ start: 2, len: 3 });
  });
  it('chịu được chuỗi tiết/tuần dính liền', () => {
    const r = parseSections(['XX1003 - Môn C 2.0', 'L01 5/40 V', 'Thứ 3 --3456-------- B1-202 1 12345678-1234567']);
    const s = r.sections[0];
    expect(s.slots[0]).toMatchObject({ day: 3, start: 3, len: 4 });
  });
});

describe('MyBK dán từ trình duyệt', () => {
  it('đọc chữ Unicode dạng tổ hợp (NFD), dòng tab, không có tín chỉ', () => {
    const raw = ['EE1009 - Kỹ thuật số', 'Nhóm lớp\tDK/ Sĩ số\tNgôn ngữ\tNhóm LT', 'A01_A01\t30/30\tV\tA01\t\tA01\t\t60\t', 'Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học',
      'Thứ 3\t- 2 3 4 5 6 - - - - - - - - - -\tB3-202\t1\t\t----5-7-9-1-3-5---------------', 'Thứ 3\t- - - - - - - - - 10 11 - - - - -\tC4-303\t1\t\t1234567-90123456--------------'].map((s) => s.normalize('NFD'));
    const r = parseSections(raw);
    expect(r.sections).toHaveLength(1);
    expect(r.sections[0].slots).toHaveLength(2);
    expect(r.sections[0].slots[1]).toMatchObject({ day: 3, start: 10, len: 2 });
  });
});

import { detectMeta } from '../src/engine/timetable';
import { semesterLabel } from '../src/engine/semester';
describe('detectMeta', () => {
  it('nhận biết đợt từ nội dung, không cần mã cố định', () => {
    expect(detectMeta('BẢNG ĐĂNG KÝ MÔN HỌC (HK261_D2) Đăng ký bổ sung - Hiệu chỉnh môn học học kỳ 1/2026-2027 đợt 2 và Kết quả đợt 1')).toEqual({ semester: semesterLabel({ startYear: 2026, term: 1 }), round: 2 });
    expect(detectMeta('Đăng ký bổ sung môn học học kỳ 1/2026-2027 đợt 3 và Kết quả đợt 2 (Sinh viên)')).toEqual({ semester: semesterLabel({ startYear: 2026, term: 1 }), round: 3 });
    expect(detectMeta('Kết quả đợt 1 của học kỳ 2/2026-2027')).toEqual({ semester: semesterLabel({ startYear: 2026, term: 2 }), round: 2 });
    expect(detectMeta('MT1003 Giải tích 1 L01 4 2 2-4 H1-201')).toBeUndefined();
  });
});

describe('dán cả trang web', () => {
  it('bỏ chữ rác, gộp buổi học trùng, đọc nhiều môn', () => {
    const page = ['Trang chủ', 'Đăng ký môn học', 'EE1009 - Kỹ thuật số', 'Nhóm lớp DK/ Sĩ số Ngôn ngữ', 'A01 30/30 V', 'Thứ 3 - 2 3 4 - - - - - - - - - - - - B3-202 1 12345678', 'A01 30/30 V', 'Thứ 3 - 2 3 4 - - - - - - - - - - - - B3-202 1 12345678',
      'Liên hệ: phongdaotao@hcmut.edu.vn', 'MT1003 - Giải tích 1 4.0', 'L02 10/40 V', 'Thứ 5 - - - - - 6 7 8 - - - - - - - - A5-101 1 12345678', '© 2026 HCMUT'];
    const r = parseSections(page);
    expect(r.sections.map((s) => s.code).sort()).toEqual(['EE1009', 'MT1003']);
    expect(r.sections.find((s) => s.code === 'EE1009')!.slots).toHaveLength(1);
  });
});

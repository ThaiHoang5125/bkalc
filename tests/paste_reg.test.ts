import { describe, expect, it } from 'vitest';
import { parseMybk, detectMeta } from '../src/engine/timetable';
import { fillPlaceholders, futureSemesters } from '../src/engine/semplan';

const page = `﻿
  ĐĂNG KÝ MÔN HỌC
 Hoàng Lưu An Thái (2313095)
BẢNG ĐĂNG KÝ MÔN HỌC
 (HK261_D2) Đăng ký bổ sung - Hiểu chỉnh môn học học kỳ 1/2026-2027 đợt 2 và Kết quả đợt 1 (Sinh viên - Học viên)
1SP1039 - Lịch sử Đảng Cộng sản VN2.0
Nhóm lớp\tDK/ Sĩ số\tNgôn ngữ\tNhóm LT\tGiảng viên\tNhóm BT\tGiảng viên BT/TN\tSĩ số LT\t#
L05\t300/300\tV\tL05\t\t\t\t300\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 5\t- 2 3 - - - - - - - - - - - - -\tH1-GDH1\t2\t\t1234567-9012------------------
2EE2021 - Cơ sở điện tử công suất3.0
Nhóm lớp\tDK/ Sĩ số
L04_L16\t18/18\tV\tL04\t\tL16\t\t72\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 2\t- - - - - - - - - 10 11 - - - - -\tH6-514\t2\t\t1234567-90123456--------------
Thứ 4\t- 2 3 4 5 6 - - - - - - - - - -\tH6-002\t2\t\t---4-------2---6--------------
3SA0007 - Sinh hoạt sinh viên cuối khóa 20.0
Nhóm lớp\tDK/ Sĩ số
A10\t827/850\tV\tA10\t\t\t\t850\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 7\t- - - - - - - - - - 11 12 - - - -\tA5-HTA5\t1\t\t---4--------------------------
6EE3065 - Ky Thuat Robot3.0
Nhóm lớp\tDK/ Sĩ số
L01\t60/60\tV\tL01\t\t\t\t60\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 2\t- 2 3 - - - - - - - - - - - - -\tH2-205\t2\t\t1234567-90123456--------------
7EE3079 - Điện tử công suất ứd3.0
Nhóm lớp\tDK/ Sĩ số
L01\t31/60\tV\tL01\t"Chưa/Đang phân công"\t\t\t60\t
Thứ\tTiết\tPhòng\tCS\tBT/TN\tTuần học
Thứ 5\t- - - - - - - - - 10 11 - - - - -\tH2-403\t2\t\t1234567-90123456--------------
Tổng số tín chỉ đăng ký: 14.0 (Dự thính: 0)
`;

describe('dán trang kết quả đăng ký MyBK', () => {
  const r = parseMybk(page.split('\n'));
  it('nhận đúng từng môn, không lẫn lớp giữa các môn', () => {
    const by = (c: string) => r.sections.filter((s) => s.code === c);
    expect(r.sections.map((s) => s.code).sort()).toEqual(['EE2021', 'EE3065', 'EE3079', 'SA0007', 'SP1039']);
    expect(by('EE3079')).toHaveLength(1);
    expect(by('EE3079')[0].slots).toHaveLength(1);
    expect(by('EE3079')[0].slots[0]).toMatchObject({ day: 5, start: 10, len: 2, room: 'H2-403' });
    expect(by('EE3065')[0].slots[0]).toMatchObject({ day: 2, start: 2, len: 2, room: 'H2-205' });
    expect(by('EE2021')[0].slots).toHaveLength(2);
    expect(by('SA0007')[0].credits).toBe(0);
    expect(by('SP1039')[0].credits).toBe(2);
  });
  it('mọi lớp đều thuộc bảng đã đăng ký và nhận ra đợt 2', () => {
    expect(r.regIds).toHaveLength(r.sections.length);
    expect(r.listIds).toHaveLength(0);
    expect(detectMeta(page)).toMatchObject({ round: 2, semester: expect.any(String) });
  });
});

describe('tự chọn theo nhóm', () => {
  it('chia phần giữ chỗ theo từng nhóm tự chọn còn thiếu', () => {
    const labels = futureSemesters(new Date(2026, 9, 22), 6);
    const r = fillPlaceholders({}, labels, 1, 18, undefined, [{ name: 'Tự chọn Tự do', credits: 9 }, { name: 'Tự chọn Chuyên ngành - Nhóm A', credits: 9 }]);
    const all = labels.flatMap((l) => r[l]);
    expect(all.filter((x) => x.name === 'Tự chọn Tự do').reduce((s, x) => s + x.credits, 0)).toBe(9);
    expect(all.filter((x) => x.name === 'Tự chọn Chuyên ngành - Nhóm A').reduce((s, x) => s + x.credits, 0)).toBe(9);
  });
});

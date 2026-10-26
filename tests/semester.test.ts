import { describe, expect, it } from 'vitest';
import { canonSemester, parseSemester, semesterAt, semesterChoices, semesterCode, semesterDisplay, semesterLabel, semesterKey } from '../src/engine';

const at = (y: number, m: number, d: number) => semesterCode(semesterAt(new Date(y, m - 1, d)));

describe('học kỳ theo lịch năm học', () => {
  it('24/08 → 31/12 là học kỳ 1 của năm học bắt đầu năm đó (HK261)', () => {
    expect(at(2026, 8, 24)).toBe('HK261');
    expect(at(2026, 10, 21)).toBe('HK261');
    expect(at(2026, 12, 31)).toBe('HK261');
    expect(semesterLabel(semesterAt(new Date(2026, 9, 21)))).toBe('Năm học 2026 - 2027 / Học kỳ 1');
  });
  it('sau 31/12 là học kỳ 2 của năm học trước, hè là học kỳ 3', () => {
    expect(at(2027, 1, 1)).toBe('HK262');
    expect(at(2027, 5, 31)).toBe('HK262');
    expect(at(2027, 6, 1)).toBe('HK263');
    expect(at(2026, 8, 23)).toBe('HK253');
  });
  it('nhãn hiển thị có mã HK, nhãn lưu thì không (để so khớp và sắp xếp)', () => {
    expect(semesterDisplay('Năm học 2025 - 2026 / Học kỳ 2')).toBe('Năm học 2025 - 2026 / Học kỳ 2 (HK252)');
    expect(canonSemester('Năm học 2025 - 2026 / Học kỳ 2 (HK252)')).toBe('Năm học 2025 - 2026 / Học kỳ 2');
    expect(semesterKey(canonSemester('Năm học 2023 - 2024 / Học kỳ 1 (HK231)'))).toBe(20231);
    expect(parseSemester('tự đặt')).toBeNull();
    expect(semesterDisplay('tự đặt')).toBe('tự đặt');
  });
  it('danh sách chọn: có học kỳ hiện tại và kế tiếp lên đầu, kèm các học kỳ đã học', () => {
    const c = semesterChoices(['Năm học 2025 - 2026 / Học kỳ 2', 'Năm học 2023 - 2024 / Học kỳ 1'], new Date(2026, 9, 21));
    expect(c.map((x) => x.value)).toEqual([
      'Năm học 2026 - 2027 / Học kỳ 2', 'Năm học 2026 - 2027 / Học kỳ 1', 'Năm học 2025 - 2026 / Học kỳ 2', 'Năm học 2023 - 2024 / Học kỳ 1']);
    expect(c[1].label).toBe('Năm học 2026 - 2027 / Học kỳ 1 (HK261) · hiện tại');
    expect(c[1].current).toBe(true);
  });
});

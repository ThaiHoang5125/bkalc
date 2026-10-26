import { describe, expect, it } from 'vitest';
import { buildIcs, slotDate } from '../src/engine';

const sec = { id: 'a', code: 'MT1003', name: 'Giải tích 1', credits: 4, group: 'L01', slots: [{ day: 3, start: 2, len: 3, room: 'H1-201', weeks: [1, 2, 4] }] };

describe('ics', () => {
  it('tính ngày theo tuần và thứ', () => {
    expect(slotDate('2026-08-31', 1, 2)).toEqual({ y: 2026, m: 8, d: 31 });
    expect(slotDate('2026-08-31', 2, 3)).toEqual({ y: 2026, m: 9, d: 8 });
    expect(slotDate('2026-12-28', 2, 8)).toEqual({ y: 2027, m: 1, d: 10 });
  });
  it('mỗi tuần một sự kiện, đúng giờ và phòng', () => {
    const r = buildIcs([sec], '2026-08-31', new Date('2026-01-01T00:00:00Z'));
    expect(r.events).toBe(3);
    expect(r.text).toContain('DTSTART;TZID=Asia/Ho_Chi_Minh:20260901T070000');
    expect(r.text).toContain('DTEND;TZID=Asia/Ho_Chi_Minh:20260901T095000');
    expect(r.text).toContain('LOCATION:H1-201');
    expect(r.text).toContain('20260922T070000');
  });
  it('lớp không ghi tuần: 15 tuần', () => {
    expect(buildIcs([{ ...sec, slots: [{ day: 2, start: 1, len: 2 }] }], '2026-08-31').events).toBe(15);
  });
});

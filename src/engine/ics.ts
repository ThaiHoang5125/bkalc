import { periodEnd, periodStart, slotEnd, type Section } from './timetable';

const pad = (n: number) => String(n).padStart(2, '0');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** Mặc định khi lớp không ghi tuần học: 15 tuần đầu. */
export const DEFAULT_WEEKS = Array.from({ length: 15 }, (_, i) => i + 1);

/** Ngày (UTC, chỉ dùng phần ngày) của buổi học: tuần w tính từ thứ Hai của tuần 1; day 2 = thứ Hai … 8 = Chủ nhật. */
export function slotDate(week1Monday: string, week: number, day: number): { y: number; m: number; d: number } {
  const [y, m, d] = week1Monday.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + (week - 1) * 7 + (day - 2)));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/** C2: xuất lịch học ra .ics (mỗi buổi mỗi tuần một sự kiện, giờ Việt Nam). */
export function buildIcs(secs: Section[], week1Monday: string, now = new Date()): { text: string; events: number } {
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  const out: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BKalc//Timetable//VI', 'CALSCALE:GREGORIAN'];
  let n = 0;
  for (const s of secs) for (const [si, sl] of s.slots.entries()) for (const w of sl.weeks?.length ? sl.weeks : DEFAULT_WEEKS) {
    const { y, m, d } = slotDate(week1Monday, w, sl.day);
    const day = `${y}${pad(m)}${pad(d)}`;
    const hm = (p: string) => p.replace(':', '') + '00';
    out.push('BEGIN:VEVENT', `UID:${s.id}-${si}-w${w}@hcmut-gpa`, `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Asia/Ho_Chi_Minh:${day}T${hm(periodStart(sl.start))}`, `DTEND;TZID=Asia/Ho_Chi_Minh:${day}T${hm(periodEnd(slotEnd(sl)))}`,
      `SUMMARY:${esc(`${s.code} ${s.name}${s.group ? ` (${s.group})` : ''}`)}`,
      ...(sl.room ? [`LOCATION:${esc(sl.room)}`] : []), `DESCRIPTION:${esc(`Tuần ${w} · tiết ${sl.start}-${slotEnd(sl)}`)}`, 'END:VEVENT');
    n++;
  }
  out.push('END:VCALENDAR');
  return { text: out.join('\r\n') + '\r\n', events: n };
}

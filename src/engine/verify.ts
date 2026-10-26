import { t } from '../i18n';
import { semesterDisplay } from './semester';
import { bySemester, summarize } from './gpa';
import { bandOf } from './scale';
import type { Attempt, Official, RetakePolicy } from './types';

export interface Check { label: string; computed: string; official: string; ok: boolean }

const r1 = (n: number | null) => (n === null ? NaN : Math.round(n * 10 + 1e-9) / 10);
const r2 = (n: number | null) => (n === null ? NaN : Math.round(n * 100 + 1e-9) / 100);

/** Đối chiếu kết quả app tính với số liệu chính thức in trên form của trường. */
export function verify(attempts: Attempt[], policy: RetakePolicy, off: Official): Check[] {
  const out: Check[] = [];
  const s = summarize(attempts, policy);
  if (off.gpa4 !== undefined) out.push({ label: t('GPA tích lũy (hệ 4)'), computed: r1(s.gpa).toFixed(1), official: off.gpa4.toFixed(1), ok: r1(s.gpa) === r1(off.gpa4) });
  if (off.avg10 !== undefined) out.push({ label: t('Điểm TBTL hệ 10'), computed: r2(s.avg10).toFixed(2), official: off.avg10.toFixed(2), ok: r2(s.avg10) === r2(off.avg10) });
  if (off.credits !== undefined) out.push({ label: t('Tín chỉ tích lũy'), computed: String(s.passedCredits), official: String(off.credits), ok: s.passedCredits === off.credits });
  const lettered = attempts.filter((a) => a.officialLetter && a.score !== null && !a.special);
  if (lettered.length) {
    const wrong = lettered.filter((a) => bandOf(a.score as number).letter !== a.officialLetter);
    out.push({ label: t('Điểm chữ từng môn'), computed: t('{ok}/{all} khớp', { ok: lettered.length - wrong.length, all: lettered.length }), official: wrong.length ? wrong.slice(0, 3).map((a) => `${a.score}→${a.officialLetter}`).join(', ') : t('khớp hết'), ok: wrong.length === 0 });
  }
  if (off.semesters?.length) {
    const rows = bySemester(attempts, policy);
    for (const o of off.semesters) {
      const r = rows.find((x) => x.semester === o.semester);
      if (!r) { out.push({ label: semesterDisplay(o.semester), computed: t('thiếu'), official: t('có'), ok: false }); continue; }
      const gOk = r1(r.cumulativeGpa) === r1(o.cumGpa), cOk = r.cumulativeCredits === o.cumCredits;
      out.push({ label: `${semesterDisplay(o.semester)} · ${t('tích lũy')}`, computed: t('{g} / {c} tín chỉ', { g: r1(r.cumulativeGpa).toFixed(1), c: r.cumulativeCredits }), official: t('{g} / {c} tín chỉ', { g: o.cumGpa.toFixed(1), c: o.cumCredits }), ok: gOk && cOk });
      if (o.semGpa !== undefined && o.semCredits !== undefined) {
        out.push({ label: `${semesterDisplay(o.semester)} · ${t('học kỳ')}`, computed: t('{g} / {c} tín chỉ', { g: r1(r.gpa).toFixed(1), c: r.semCredits }), official: t('{g} / {c} tín chỉ', { g: o.semGpa.toFixed(1), c: o.semCredits }), ok: r1(r.gpa) === r1(o.semGpa) && r.semCredits === o.semCredits });
      }
    }
  }
  return out;
}

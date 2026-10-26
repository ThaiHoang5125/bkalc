import { Fragment, forwardRef, useMemo, useState } from 'react';
import type { Prefs, Section, Slot } from '../engine';
import { DAY_NAMES, MAX_PERIOD, findConflicts, periodEnd, periodStart, slotEnd, slotText } from '../engine';
import { Hint } from './ui';
import { t } from '../i18n';

/** Các thành phần dùng lại của trang Xếp lịch (Timetable.tsx): lưới thời khóa biểu, ô dán, chọn cơ sở, bảng lớp. */

export const DAYS = [2, 3, 4, 5, 6, 7, 8];
const CELL = 34;
export const seatText = (s: Section) => (s.seats ? `${s.seats.taken}/${s.seats.max}` : '');
export const seatNode = (s: Section) => {
  if (!s.seats) return null;
  const full = s.seats.max > 0 && s.seats.taken >= s.seats.max, near = !full && s.seats.max > 0 && s.seats.taken / s.seats.max >= 0.9;
  return <span className={full ? 'err' : near ? 'warnnote' : 'muted'}> · {t('sĩ số')} {seatText(s)}{full ? ` (${t('đã đầy')})` : near ? ` (${t('sắp đầy')})` : ''}</span>;
};
const inWeek = (sl: Slot, w: number) => !sl.weeks?.length || sl.weeks.includes(w);
const secText = (s: Section) => `${s.group || '—'} · ${s.slots.map(slotText).join('; ')}`;
export const seatCell = (s: Section) => {
  if (!s.seats) return <span className="muted">—</span>;
  const full = s.seats.max > 0 && s.seats.taken >= s.seats.max, near = !full && s.seats.max > 0 && s.seats.taken / s.seats.max >= 0.9;
  return <span className={full ? 'err' : near ? 'warnnote' : ''}>{seatText(s)}{full ? ` (${t('đã đầy')})` : near ? ` (${t('sắp đầy')})` : ''}</span>;
};
const sessText = (x: Slot) => `${t(DAY_NAMES[x.day])}, ${t('tiết')} ${x.start}-${slotEnd(x)} (${periodStart(x.start)}–${periodEnd(slotEnd(x))})`;
/** Ba cột: lớp, các buổi học (mỗi buổi một dòng), phòng tương ứng. */
export function SessCells({ s }: { s: Section }) {
  return (<><td><b>{s.group || '—'}</b></td>
    <td className="small sess">{s.slots.map((x, i) => <div key={i}>{sessText(x)}</div>)}</td>
    <td className="small sess">{s.slots.map((x, i) => <div key={i}>{x.room ?? '—'}</div>)}</td></>);
}
export const SESS_HEAD = <><th>{t('Lớp')}</th><th>{t('Buổi học')}</th><th>{t('Phòng')}</th></>;
/** Chọn ưu tiên mã lớp: chỉ có L (chính quy, cơ sở 2 Dĩ An) và A (cơ sở 1 Diên Hồng); lớp mã khác không được đề xuất. */
export function CampusPick({ value, onChange }: { value: 'all' | 'L' | 'A'; onChange: (v: 'all' | 'L' | 'A') => void }) {
  return (
    <div className="dndbar"><span className="muted small">{t('Ưu tiên mã lớp')}</span>
      <div className="seg sm" role="group" aria-label={t('Ưu tiên mã lớp')}>
        {([['all', t('L hoặc A')], ['L', t('L')], ['A', t('A')]] as const).map(([k, l]) => <button key={k} aria-pressed={value === k} onClick={() => onChange(k)}>{l}</button>)}
      </div>
      <Hint><ul>
        <li><b>L:</b> {t('lớp chính quy, cơ sở 2 (Dĩ An).')}</li>
        <li><b>A:</b> {t('lớp ở cơ sở 1 (Diên Hồng).')}</li>
        <li>{t('App chỉ đề xuất lớp mã L hoặc A.')}</li>
      </ul></Hint>
    </div>);
}

export interface DragApi { onStart: (sec: Section, slot: Slot) => void; onEnd: () => void; onDrop: (day: number, start: number) => void; /** bấm vào một khối môn học */ onClick: (sec: Section, slot: Slot) => void; hints: Map<string, 'ok' | 'warn'> | null }
/** `dim`: mã môn đang kéo, các khối gốc của môn này mờ đi; `previewIds`: lớp xem thử, nổi lên ở ô mới. Khối mờ không tính vào trùng giờ. */
export function Grid({ sections: all, week, prefs, cmap, ghost, drag, dim, previewIds }: { sections: Section[]; week?: number; prefs: Prefs; cmap: Record<string, string>; ghost?: Section[]; drag?: DragApi; dim?: string; previewIds?: Set<string> }) {
  const sections = useMemo(() => (week ? all.map((x) => ({ ...x, slots: x.slots.filter((sl) => inWeek(sl, week)) })) : all), [all, week]);
  const isDim = (s: Section) => !!dim && s.code === dim && !previewIds?.has(s.id);
  const bad = useMemo(() => new Set(findConflicts(sections.filter((s) => !(dim && s.code === dim && !previewIds?.has(s.id)))).flatMap((c) => [c.a.id, c.b.id])), [sections, dim, previewIds]);
  const periods = Array.from({ length: MAX_PERIOD }, (_, i) => i + 1);
  const days = DAYS.filter((d) => d !== 8 || sections.some((s) => s.slots.some((x) => x.day === 8)) || (ghost ?? []).some((s) => s.slots.some((x) => x.day === 8)));
  const block = (sec: Section, slot: Slot, k: string, cls = '') => {
    const live = !!drag && !previewIds?.has(sec.id) && !cls;
    return (
      <div key={k} className={`ttblock ${cmap[sec.code] ?? 'tc0'}${bad.has(sec.id) ? ' conflict' : ''}${isDim(sec) ? ' dim' : ''}${previewIds?.has(sec.id) ? ' preview' : ''}${live ? ' clickable' : ''}${cls}`} draggable={live} onClick={live ? () => drag!.onClick(sec, slot) : undefined} onDragStart={drag ? (e) => { e.dataTransfer.setData('text/plain', sec.id); e.dataTransfer.effectAllowed = 'move'; drag.onStart(sec, slot); } : undefined} onDragEnd={drag?.onEnd} style={{ height: slot.len * CELL - 3 }} title={`${sec.code} ${sec.name} · ${secText(sec)}`}>
        <b>{sec.code}</b> {sec.group}<span className="nm">{sec.name}</span><span className="rm">{slot.room ?? ''}</span>
      </div>);
  };
  return (
    <div className="scroll">
      <div className="ttgrid" role="grid" aria-label={t('Thời khóa biểu theo tuần')} style={{ ['--cols' as string]: days.length }}>
        <div className="hd" />
        {days.map((d) => <div key={d} className="hd">{t(DAY_NAMES[d])}</div>)}
        {periods.map((p) => (
          <Fragment key={p}>
            <div className="pr" title={`${periodStart(p)}–${periodEnd(p)}`}>{p} · {5 + p}h</div>
            {days.map((d) => {
              const off = prefs.daysOff.includes(d) || p < prefs.earliest || p > prefs.latest;
              const lunch = !!prefs.avoidLunch && (p === 6 || p === 7);
              const hint = drag?.hints?.get(`${d}-${p}`);
              const inSec = sections.flatMap((s) => s.slots.filter((x) => x.day === d && x.start === p).map((x, i) => block(s, x, `${s.id}-${i}`)));
              const inGhost = (ghost ?? []).flatMap((s) => s.slots.filter((x) => x.day === d && x.start === p).map((x, i) => block(s, x, `g${s.id}-${i}`, ' ghost')));
              return <div key={`${d}-${p}`} className={`cell${off ? ' off' : ''}${lunch ? ' lunch' : ''}${hint === 'ok' ? ' dok' : hint === 'warn' ? ' dwarn' : ''}`} onDragOver={drag ? (e) => e.preventDefault() : undefined} onDrop={drag ? (e) => { e.preventDefault(); drag.onDrop(d, p); } : undefined}>{inSec}{inGhost}</div>;
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export const PasteBox = forwardRef<HTMLTextAreaElement, { onParse: (lines: string[]) => void; placeholder: string }>(function PasteBox({ onParse, placeholder }, ref) {
  const [txt, setTxt] = useState('');
  const go = () => { if (txt.trim()) onParse(txt.split(/\r?\n/)); };
  return (<div><textarea ref={ref} rows={5} style={{ width: '100%' }} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={placeholder}
    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } }} />
    <button onClick={go} disabled={!txt.trim()}>{t('Đọc đoạn chữ')}</button></div>);
});

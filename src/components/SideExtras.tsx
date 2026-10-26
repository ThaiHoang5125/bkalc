import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { AppData, Attempt, SpecialCode } from '../engine';
import { canonSemester, degreeClass, effectiveTotal, accumulatedCredits, isSpecialCode, isValidScore, newId, orderSemesters, semesterAt, semesterLabel, semesterShort, summarize, validateAttempt } from '../engine';
import { buildLookup, norm } from '../data/lookup';
import { fmt } from '../format';
import { t } from '../i18n';
import { useToast } from './ui';

/** Ô tóm tắt ở đầu sidebar: GPA, tín chỉ tích lũy, cảnh báo tín chỉ rớt. */
export function SideSummary({ data, onClick }: { data: AppData; onClick: () => void }) {
  const { attempts, settings, official } = data;
  const s = useMemo(() => summarize(attempts, settings.retakePolicy), [attempts, settings.retakePolicy]);
  const earned = useMemo(() => accumulatedCredits(attempts, settings.retakePolicy), [attempts, settings.retakePolicy]);
  const total = effectiveTotal(settings, official);
  const dc = useMemo(() => degreeClass(attempts, s.gpa, total), [attempts, s.gpa, total]);
  return (
    <button className="sidesum" onClick={onClick} title={t('GPA tích lũy · tín chỉ tích lũy / tổng tín chỉ')}>
      <b>{s.gpa === null ? '—' : fmt(s.gpa)}</b>
      <span>{t('GPA')} · {earned}/{total} {t('TC')}</span>
      {dc.exceeded && <i className="sidewarn">{t('Rớt {n}/{v} TC', { n: dc.failedCredits, v: dc.limit })}</i>}
    </button>
  );
}

/** Mô-đun hộp thoại nhỏ dùng chung: Esc hoặc bấm nền để đóng. */
function Modal({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-label={label} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modalbox quick">{children}</div>
    </div>, document.body);
}

/** Thêm một lần học nhanh từ bất kỳ trang nào. */
export function QuickAddDialog({ data, onAdd, onClose }: { data: AppData; onAdd: (rows: Attempt[]) => void; onClose: () => void }) {
  const toast = useToast();
  const lookup = useMemo(() => buildLookup(data), [data]);
  const sems = useMemo(() => {
    const cur = canonSemester(semesterLabel(semesterAt())) || 'Chưa phân loại';
    return [...new Set([cur, ...orderSemesters(data.attempts)])];
  }, [data.attempts]);
  const [q, setQ] = useState('');
  const [code, setCode] = useState('');
  const [credits, setCredits] = useState('3');
  const [score, setScore] = useState('');
  const [sem, setSem] = useState(sems[0]);
  const [err, setErr] = useState<string[]>([]);
  const sugg = useMemo(() => (q.trim() ? lookup.search(q, 5) : []), [lookup, q]);
  const pick = (e: { code: string; name: string; credits?: number }) => { setQ(e.name); setCode(e.code); if (e.credits !== undefined) setCredits(String(e.credits)); };

  const submit = () => {
    const sc = score.trim().toUpperCase();
    let special: SpecialCode | undefined;
    let val: number | null = null;
    const errs: string[] = [];
    const spec: string = sc;
    if (isSpecialCode(spec)) special = spec as SpecialCode;
    else if (sc !== '') {
      const v = parseFloat(sc.replace(',', '.'));
      if (isValidScore(v)) val = v; else errs.push('Điểm phải trong khoảng 0–10.');
    }
    const cr = credits.trim() === '' ? NaN : parseFloat(credits.replace(',', '.'));
    errs.push(...validateAttempt({ name: q, credits: cr, score: val }).filter((m) => !errs.includes(m)));
    if (errs.length) { setErr(errs); return; }
    onAdd([{ id: newId(), ...(code ? { code } : {}), name: q.trim(), credits: cr, score: val, ...(special ? { special } : {}), semester: sem, source: 'manual' }]);
    toast(t('Đã thêm môn {name}', { name: q.trim() }), { undo: true });
    onClose();
  };

  return (
    <Modal label={t('Thêm môn nhanh')} onClose={onClose}>
      <h3>{t('Thêm môn nhanh')}</h3>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label>{t('Tên hoặc mã môn')}
          <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setCode(''); }} onKeyDown={(e) => { if (e.key === 'ArrowDown') document.querySelector<HTMLButtonElement>('.quicklist button')?.focus(); }} placeholder={t('Tìm mã môn hoặc tên môn để thêm')} />
        </label>
        {sugg.length > 0 && !code && (
          <div className="quicklist">{sugg.map((e) => <button type="button" key={e.code} onClick={() => pick(e)}><b>{e.code}</b> {e.name}</button>)}</div>
        )}
        <div className="form-row">
          <label>{t('Số tín chỉ')}<input className="w120" value={credits} onChange={(e) => setCredits(e.target.value)} inputMode="decimal" /></label>
          <label>{t('Điểm')}<input className="w120" value={score} onChange={(e) => setScore(e.target.value)} placeholder={t('để trống nếu chưa có')} /></label>
          <label>{t('Học kỳ')}<select value={sem} onChange={(e) => setSem(e.target.value)}>{sems.map((s) => <option key={s} value={s}>{semesterShort(s)}</option>)}</select></label>
        </div>
        {err.length > 0 && <p className="err">{err.map((m) => t(m)).join(' ')}</p>}
        <div className="btn-row"><button type="button" onClick={onClose}>{t('Hủy')}</button><button type="submit" className="primary">{t('Thêm')}</button></div>
      </form>
    </Modal>
  );
}

/** Ctrl+K: tìm môn đã học theo mã hoặc tên (không phân biệt dấu), chọn để mở Bảng điểm đã lọc theo môn đó. */
export function SearchDialog({ attempts, onPick, onClose }: { attempts: Attempt[]; onPick: (query: string) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const hits = useMemo(() => {
    const n = norm(q);
    if (!n) return [];
    const seen = new Set<string>();
    return attempts.filter((a) => norm(`${a.code ?? ''} ${a.name}`).includes(n)).filter((a) => { const k = a.code ?? a.name; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8);
  }, [attempts, q]);
  const choose = (a: Attempt) => onPick(a.code ?? a.name);
  return (
    <Modal label={t('Tìm môn')} onClose={onClose}>
      <input autoFocus value={q} placeholder={t('Tìm môn đã học theo mã hoặc tên môn')} aria-label={t('Tìm môn')}
        onChange={(e) => { setQ(e.target.value); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && hits.length) { e.preventDefault(); setActive((i) => (i + 1) % hits.length); }
          else if (e.key === 'ArrowUp' && hits.length) { e.preventDefault(); setActive((i) => (i - 1 + hits.length) % hits.length); }
          else if (e.key === 'Enter' && hits[active]) choose(hits[active]);
        }} />
      <div className="quicklist">
        {hits.map((a, i) => <button type="button" key={a.id} className={i === active ? 'on' : ''} onClick={() => choose(a)}><b>{a.code ?? '—'}</b> {a.name} <small>{semesterShort(a.semester)}</small></button>)}
        {q.trim() !== '' && hits.length === 0 && <p className="muted">{t('Không tìm thấy môn nào')}</p>}
      </div>
    </Modal>
  );
}

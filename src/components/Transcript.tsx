import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppData, Attempt, SpecialCode } from '../engine';
import { SPECIAL_CODES, accumulatedCredits, canonSemester, semesterAt, semesterDisplay, semesterLabel, semesterShort, bandOf, bySemester, degreeClass, effectiveAttempts, effectiveTotal, isSpecialCode, isValidScore, keyer, newId, orderSemesters, summarize } from '../engine';
import { fmt } from '../format';
import { buildLookup } from '../data/lookup';
import { Progress } from './Progress';
import { FreeList } from './FreeList';
import { Exemption } from './Exemption';
import { Hint, PageHeader, useToast } from './ui';
import type { Go } from '../App';
import { t } from '../i18n';

interface Props {
  /** Từ Ctrl+K: lọc bảng điểm theo `q` mỗi khi `n` đổi */
  jump?: { q: string; n: number };
  data: AppData;
  view: 'sem' | 'group';
  setView: (v: string) => void;
  go: Go;
  onAdd: (rows: Attempt[]) => void;
  onUpdate: (id: string, patch: Partial<Attempt>) => void;
  onRemove: (id: string) => void;
  onFreeCourse: (key: string, on: boolean) => void;
}

const toNum = (s: string) => (s.trim() === '' ? NaN : parseFloat(s.replace(',', '.')));
const r1 = (n: number | null) => (n === null ? NaN : Math.round(n * 10 + 1e-9) / 10);

/** "8,5" → điểm số; "MT"/"DT"/"RT"... → điểm đặc biệt; rỗng → chưa có điểm; còn lại là không hợp lệ. */
function parseScore(text: string): { score: number | null; special?: SpecialCode } | null {
  const t = text.trim().toUpperCase();
  if (t === '') return { score: null };
  if (isSpecialCode(t)) return { score: null, special: t as SpecialCode };
  const v = toNum(t);
  return isValidScore(v) ? { score: v } : null;
}

const scoreText = (a: Attempt) => a.special ?? (a.score === null ? '' : (Math.round(a.score * 10 + 1e-9) / 10).toFixed(1));
/** “HK251 · Năm học 2025 - 2026 / Học kỳ 1” */
const semTitle = (sem: string) => `${semesterShort(sem)} · ${semesterDisplay(sem).replace(/ \(HK\d+\)$/, '')}`;

/** Màu vòng theo xếp loại tốt nghiệp */
const CLASS_COLOR: Record<string, string> = { 'Xuất sắc': 'var(--ok-fill)', Giỏi: 'var(--c-b)', Khá: 'var(--c-teal)', 'Trung bình': 'var(--warn-fill)', Yếu: 'var(--err-fill)', Kém: 'var(--err-fill)' };

/** Vòng tròn tiến độ: `ratio` 0–1, số và nhãn nằm trong vòng */
function Ring({ ratio, value, label, tip, color }: { ratio: number; value: string; label: string; tip: string; color: string }) {
  const R = 44, C = 2 * Math.PI * R, r = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  return (
    <div className="ring" title={tip} role="img" aria-label={`${value} ${label} — ${tip}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--line)" strokeWidth="7" />
        <circle cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${C * r} ${C}`} />
      </svg>
      <div><b>{value}</b><small>{label}</small></div>
    </div>
  );
}

export function Transcript({ jump, data, view, setView, go, onAdd, onUpdate, onRemove, onFreeCourse }: Props) {
  const { attempts, settings, official } = data;
  const toast = useToast();
  const sems = useMemo(() => orderSemesters(attempts), [attempts]);
  const rows = useMemo(() => bySemester(attempts, settings.retakePolicy), [attempts, settings.retakePolicy]);
  const used = useMemo(() => new Set(effectiveAttempts(attempts, settings.retakePolicy).map((a) => a.id)), [attempts, settings.retakePolicy]);
  const keyOf = useMemo(() => keyer(attempts), [attempts]);
  const lookup = useMemo(() => buildLookup(data), [data]);
  const sum = useMemo(() => summarize(attempts, settings.retakePolicy), [attempts, settings.retakePolicy]);
  const earned = useMemo(() => accumulatedCredits(attempts, settings.retakePolicy), [attempts, settings.retakePolicy]);
  const dc = useMemo(() => degreeClass(attempts, sum.gpa, effectiveTotal(settings, official)), [attempts, sum.gpa, settings, official]);
  /** Khóa các môn đã học đạt: để biết một lần rớt đã được học lại đạt hay chưa */
  const passedKeys = useMemo(() => new Set(attempts.filter((a) => !a.excluded && (a.special === 'MT' || a.special === 'DT' || (a.score !== null && !a.special && bandOf(a.score).passed))).map(keyOf)), [attempts, keyOf]);

  const searchRef = useRef<HTMLInputElement>(null);
  const [addQ, setAddQ] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [active, setActive] = useState(0); // mục đang chọn trong danh sách gợi ý (phím ↑ ↓)
  const [filter, setFilter] = useState('');
  const [onlyFail, setOnlyFail] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [showOld, setShowOld] = useState(false);
  useEffect(() => { if (jump && jump.n > 0) { setFilter(jump.q); setOnlyFail(false); } }, [jump?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const q = filter.trim().toLowerCase();

  const suggestions = useMemo(() => (addQ.trim() ? lookup.search(addQ, 8) : []), [lookup, addQ]);

  /** Thêm môn vào học kỳ hiện tại ngay (chưa có điểm); con trỏ nhảy vào ô điểm của dòng mới để nhập trực tiếp */
  const quickAdd = (en: { code?: string; name: string; credits?: number }) => {
    const sem = canonSemester(semesterLabel(semesterAt())) || 'Chưa phân loại';
    const id = newId();
    onAdd([{ id, ...(en.code ? { code: en.code } : {}), name: en.name, credits: en.credits ?? 3, score: null, semester: sem, source: 'manual' }]);
    toast(t('Đã thêm môn {name}', { name: en.name }), { undo: true });
    setAddQ(''); setAddOpen(false); setFilter(''); setOnlyFail(false);
    if (view !== 'sem') setView('sem');
    setOpen((o) => new Set(o).add(sem)); // học kỳ cũ mặc định thu gọn
    setTimeout(() => document.querySelector<HTMLInputElement>(`[data-score-id="${id}"]`)?.focus(), 80);
  };
  const addTyped = () => quickAdd({ name: addQ.trim() });
  /** Enter / nút Thêm: lấy gợi ý đầu tiên, không có thì thêm đúng chữ đã gõ; ô trống thì chỉ đưa con trỏ vào thanh tìm */
  const submitBar = () => { if (!addQ.trim()) searchRef.current?.focus(); else if (suggestions[active]) quickAdd(suggestions[active]); else addTyped(); };
  // Mục cuối danh sách là "Thêm … thủ công", nên có suggestions.length + 1 mục để di chuyển
  const moveActive = (d: number) => { setAddOpen(true); setActive((i) => (i + d + suggestions.length + 1) % (suggestions.length + 1)); };
  useEffect(() => { if (addOpen) document.querySelector('.sugg .on')?.scrollIntoView({ block: 'nearest' }); }, [active, addOpen, addQ]);

  /** Danh sách học kỳ để chuyển môn: các kỳ đã có + kỳ hiện tại (để chuyển được sang kỳ mới) */
  const moveTargets = useMemo(() => {
    const cur = canonSemester(semesterLabel(semesterAt()));
    return cur && !sems.includes(cur) ? [cur, ...sems] : sems;
  }, [sems]);

  /** So khớp số liệu của trường với app, dùng chung cho dòng mở và dòng thu gọn */
  const compareOfficial = (sem: string) => {
    const info = rows.find((r) => r.semester === sem)!;
    const off = official?.semesters?.find((o) => o.semester === sem);
    const ok = !!off && r1(info.cumulativeGpa) === r1(off.cumGpa) && info.cumulativeCredits === off.cumCredits && (off.semGpa === undefined || (r1(info.gpa) === r1(off.semGpa) && info.semCredits === off.semCredits));
    return { info, off, ok };
  };

  /** GPA tích lũy (hệ 4) theo từng học kỳ, cũ → mới, để vẽ sparkline */
  const trend = useMemo(() => sems.map((s) => ({ sem: s, gpa: rows.find((r) => r.semester === s)?.cumulativeGpa ?? null })).filter((p): p is { sem: string; gpa: number } => p.gpa !== null && Number.isFinite(p.gpa)), [sems, rows]);

  const totalCredits = effectiveTotal(settings, official);
  /** Tổng số môn của chương trình chỉ là ước tính: tổng tín chỉ ÷ số tín chỉ trung bình của một môn đã học */
  const avgCredits = sum.courses > 0 ? sum.countedCredits / sum.courses : 0;
  const totalCourses = avgCredits > 0 ? Math.max(sum.courses, Math.round(totalCredits / avgCredits)) : Math.max(sum.courses, 1);
  const ringColor = CLASS_COLOR[dc.final ?? ''] ?? 'var(--accent)';
  const showTrend = view === 'sem' && trend.length >= 2;
  const summary = t('{n} môn · {c} tín chỉ · GPA {g}', { n: sum.courses, c: earned, g: fmt(sum.gpa) });

  // Mới nhất trước, đúng như form của trường
  const display = [...sems].reverse();
  const newest = display[0];
  const filtering = q !== '' || onlyFail;

  const matches = (a: Attempt) => {
    if (q && !(a.name.toLowerCase().includes(q) || (a.code ?? '').toLowerCase().includes(q))) return false;
    if (onlyFail) return a.score !== null && !a.special && !a.excluded && !bandOf(a.score).passed && !passedKeys.has(keyOf(a));
    return true;
  };

  const renderRow = (a: Attempt) => {
    const b = a.score === null ? null : bandOf(a.score);
    const superseded = a.score !== null && !a.special && !a.excluded && a.credits > 0 && !used.has(a.id);
    const dim = superseded || a.excluded || a.special === 'RT';
    const c = lookup.check(a.code, a.name);
    const mismatch = c.state === 'mismatch' && !!c.expected;
    const suggest = !a.code ? lookup.codeOf(a.name) : null;
    return (
      <tr key={a.id} className={dim ? 'dim' : ''}>
        <td><input className="cell w80" defaultValue={a.code ?? ''} key={'k' + a.code} placeholder="—"
          onBlur={(e) => onUpdate(a.id, { code: e.target.value.trim().toUpperCase() || undefined })} aria-label={t('Mã môn học')} /></td>
        <td><div className="namecell">
          <input className="cell" defaultValue={a.name} key={'m' + a.name}
            onBlur={(e) => { const v = e.target.value.trim(); if (v) { if (v !== a.name) onUpdate(a.id, { name: v }); } else { e.target.value = a.name; toast(t('Tên môn không được để trống.')); } }} aria-label={t('Tên môn')} />
          {superseded && <span className="err small nowrap" title={(a.score as number) < 4 ? t('lần rớt (đã học lại): vẫn tính vào tín chỉ rớt') : undefined}>{t('Có lần học điểm cao hơn')}</span>}
          {mismatch && <button type="button" className="infobtn err" onClick={() => onUpdate(a.id, { name: c.expected!.name })}
            title={t('Mã {code} là “{name}”', { code: c.expected!.code, name: c.expected!.name }) + ' — ' + t('Sửa tên')} aria-label={t('Sửa tên')}>⚠</button>}
          {suggest && <button type="button" className="infobtn" onClick={() => onUpdate(a.id, { code: suggest.code })}
            title={t('Mã gợi ý:') + ' ' + suggest.code + ' — ' + t('Điền')} aria-label={t('Điền')}>ℹ</button>}
        </div></td>
        <td className="center"><input type="checkbox" checked={!!a.excluded} onChange={(e) => onUpdate(a.id, { excluded: e.target.checked })} aria-label={t('Không tính vào GPA / tín chỉ tích lũy')} title={t('Không tính vào GPA / tín chỉ tích lũy')} /></td>
        <td><input className="cell num w50" defaultValue={a.credits} key={'c' + a.credits}
          onBlur={(e) => { const v = toNum(e.target.value); if (v >= 0 && v <= 20) onUpdate(a.id, { credits: v }); else { e.target.value = String(a.credits); toast(t('Số tín chỉ phải từ 0 đến 20.')); } }} aria-label={t('Số tín chỉ')} /></td>
        <td><input className="cell num w60" data-score-id={a.id} defaultValue={scoreText(a)} key={'s' + scoreText(a)} title={t('Điểm hệ 10 hoặc ký hiệu: MT, DT, RT, CT, VT, CH, KD, VP, HT')}
          onBlur={(e) => { const p = parseScore(e.target.value); if (p) onUpdate(a.id, { score: p.score === null ? null : Math.round(p.score * 10 + 1e-9) / 10, special: p.special }); else { e.target.value = scoreText(a); toast(t('Điểm phải trong khoảng 0–10, hoặc một ký hiệu như MT, DT, RT, CT, VT, CH, KD, VP, HT.')); } }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); searchRef.current?.focus(); } }} aria-label={t('Điểm tổng kết')} /></td>
        <td className="center">{b ? <span className={`pill l-${b.letter.replace('+', 'p')}`}>{b.letter}</span> : a.special ? <span className="pill" title={t(SPECIAL_CODES[a.special])}>{a.special}</span> : <span className="muted">—</span>}</td>
        <td><select className="mini" value={a.semester} onChange={(e) => onUpdate(a.id, { semester: e.target.value })} aria-label={t('Chuyển học kỳ')} title={t('Chuyển sang học kỳ khác')}>
          {(moveTargets.includes(a.semester) ? moveTargets : [a.semester, ...moveTargets]).map((x) => <option key={x} value={x} title={semesterDisplay(x)}>{semesterShort(x)}</option>)}</select></td>
        <td className="center"><button className="ghost danger" onClick={() => { onRemove(a.id); toast(t('Đã xóa môn {name}', { name: a.name }), { undo: true }); }} aria-label={t('Xóa {name}', { name: a.name })} title={t('Xóa môn này')}>×</button></td>
      </tr>
    );
  };

  const semSection = (sem: string) => {
    const { info, off, ok: offOk } = compareOfficial(sem);
    const inSem = attempts.filter((a) => a.semester === sem && matches(a));
    const normal = inSem.filter((a) => a.special !== 'MT' && a.special !== 'DT');
    const transferred = inSem.filter((a) => a.special === 'MT' || a.special === 'DT');
    return (
      <section className="semcard" key={sem} aria-label={semesterShort(sem)}>
        <div className="semhead">
          <b>{semTitle(sem)}</b>
          <span className="semstat">
            <span>{info.semCredits} {t('Tín chỉ')}</span>
            <span>{t('GPA kỳ')} <b>{fmt(info.gpa)}</b></span>
            <span>{t('Tích lũy')} <b>{fmt(info.cumulativeGpa)}</b> · {info.cumulativeCredits} {t('Tín chỉ')}</span>
            {off && (offOk ? <span className="ok" title={t('Trường: {v1} / {cumCredits} tín chỉ', { v1: off.cumGpa.toFixed(1), cumCredits: off.cumCredits })}>{t('✓ khớp trường')}</span>
              : <span className="err">{t('✗ lệch trường')}</span>)}
          </span>
          {off && !offOk && <small className="err semdiff">{t('Trường: tích lũy {cg} / {cc} TC', { cg: off.cumGpa.toFixed(1), cc: off.cumCredits })}{off.semGpa !== undefined && ' · ' + t('kỳ {sg} / {sc} TC', { sg: off.semGpa.toFixed(1), sc: off.semCredits })} — {t('App: tích lũy {cg} / {cc} TC', { cg: r1(info.cumulativeGpa).toFixed(1), cc: info.cumulativeCredits })}{off.semGpa !== undefined && ' · ' + t('kỳ {sg} / {sc} TC', { sg: r1(info.gpa).toFixed(1), sc: info.semCredits })}</small>}
          {!filtering && sem !== newest && <button className="ghost" aria-expanded="true" onClick={() => setOpen((o) => { const n = new Set(o); n.delete(sem); return n; })}>{t('Thu gọn')} ▴</button>}
        </div>
        <div className="tblwrap">
          <table className="tbl fixed">
            <colgroup><col style={{ width: '12%' }} /><col /><col style={{ width: 100 }} /><col style={{ width: '11%' }} /><col style={{ width: '11%' }} /><col style={{ width: '11%' }} /><col style={{ width: 104 }} /><col style={{ width: 44 }} /></colgroup>
            <thead><tr><th>{t('Mã')}</th><th>{t('Môn học')}</th><th className="center" title={t('Không tính vào GPA / tín chỉ tích lũy')}>{t('Không tính')}</th><th className="center">{t('Tín chỉ')}</th><th className="center">{t('Điểm')}</th><th className="center">{t('Chữ')}</th><th>{t('Học kỳ')}</th><th aria-label={t('Xóa môn này')} /></tr></thead>
            <tbody>
              {normal.map(renderRow)}
              {transferred.length > 0 && <tr className="subhead"><td colSpan={8}>{t('Môn học chuyển điểm / miễn điểm')}</td></tr>}
              {transferred.map(renderRow)}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const collapsedRow = (sem: string) => {
    const { info, off, ok } = compareOfficial(sem);
    const bad = !!off && !ok;
    return (
      <button key={sem} className="semrow" aria-expanded="false" onClick={() => setOpen((o) => new Set(o).add(sem))}>
        <b>{semTitle(sem)}</b>
        <span className="muted">{info.semCredits} {t('Tín chỉ')}</span>
        <span className="muted">{t('GPA kỳ')} <b className="strong">{fmt(info.gpa)}</b></span>
        {bad && <span className="err small">{t('✗ lệch trường')}</span>}
        <span className="caret" aria-hidden="true" />
      </button>
    );
  };

  // Xem theo học kỳ: chỉ kỳ gần nhất mở sẵn; đang tìm/lọc thì mở mọi kỳ có dòng khớp
  const visible = display.filter((s) => !filtering || attempts.some((a) => a.semester === s && matches(a)));
  const expanded = visible.filter((s) => filtering || s === newest || open.has(s));
  const collapsed = visible.filter((s) => !expanded.includes(s));
  const FOLD = 3;
  const shownCollapsed = showOld ? collapsed : collapsed.slice(0, FOLD);

  return (
    <div className="page">
      <PageHeader title={t('Bảng điểm')} sub={<>
        {!showTrend && <>{summary}{dc.failedCredits > 0 && ' · '}</>}
        {dc.failedCredits > 0 && <span className={dc.exceeded ? 'err' : 'warnnote'} title={t('Tính mỗi lần học bị điểm F, kể cả khi đã học lại và đạt.')}>
          {t('TC rớt {f}/{limit}', { f: dc.failedCredits, limit: dc.limit })}
          {dc.exceeded && ' · ' + (dc.downgraded ? t('Vượt ngưỡng 5%, xếp loại: {c}', { c: t(dc.final ?? '—') }) : t('Vượt 5%, bằng Khá không bị hạ'))}
        </span>}
      </>}
        primary={<button className="primary" onClick={() => go('data', 'data')}>{t('Nhập file PDF')}</button>} />

      {showTrend && (() => {
        const W = 320, H = 80, P = 10;
        // Trục dọc co sát khoảng dao động thực của GPA (tối thiểu 0.2) để đường biểu đồ thấy rõ lên xuống
        const gs = trend.map((p) => p.gpa), mid = (Math.min(...gs) + Math.max(...gs)) / 2;
        const half = Math.max(((Math.max(...gs) - Math.min(...gs)) / 2) * 1.15, 0.1);
        const lo = mid - half, hi = mid + half;
        const x = (i: number) => P + (i * (W - 2 * P)) / (trend.length - 1);
        const y = (g: number) => H - P - ((g - lo) / (hi - lo || 1)) * (H - 2 * P);
        const first = trend[0], last = trend[trend.length - 1];
        const d = last.gpa - first.gpa;
        return (
          <div className="card trend">
            <div className="trendtxt">
              <small className="muted">{t('GPA tích lũy theo học kỳ')}</small>
              <b>{fmt(last.gpa)}</b>
              <small className={d >= 0 ? 'ok' : 'err'}>{d >= 0 ? '▲' : '▼'} {Math.abs(d).toFixed(2)} {t('so với {sem}', { sem: semesterShort(first.sem) })}</small>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('GPA tích lũy theo học kỳ')} className="spark">
              <polyline points={trend.map((p, i) => `${x(i)},${y(p.gpa)}`).join(' ')} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {trend.map((p, i) => <circle key={p.sem} cx={x(i)} cy={y(p.gpa)} r={i === trend.length - 1 ? 4 : 2.5} fill="var(--accent)"><title>{semesterShort(p.sem)}: {fmt(p.gpa)}</title></circle>)}
            </svg>
            <div className="trendstats">
              <Ring color="var(--accent)" ratio={sum.courses / totalCourses} value={String(sum.courses)} label={`/ ${totalCourses} ${t('môn')}`}
                tip={t('Tổng số môn là ước tính: {total} tín chỉ chương trình ÷ {avg} tín chỉ/môn trung bình', { total: totalCredits, avg: fmt(avgCredits, 1) })} />
              <Ring color="var(--accent)" ratio={totalCredits > 0 ? earned / totalCredits : 0} value={String(earned)} label={`/ ${totalCredits} ${t('TC')}`} tip={t('{c} / {total} tín chỉ chương trình', { c: earned, total: totalCredits })} />
              <Ring color={ringColor} ratio={(sum.gpa ?? 0) / 4} value={fmt(sum.gpa)} label="/ 4.00" tip={`GPA ${fmt(sum.gpa)} / 4.00${dc.final ? ' · ' + t(dc.final) : ''}`} />
            </div>
          </div>
        );
      })()}

      <div className="addbar">
        <div className="addfield">
          <label className="searchbox">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input ref={searchRef} value={addQ} placeholder={t('Tìm mã môn hoặc tên môn để thêm')} aria-label={t('Tìm môn trong danh mục để thêm')}
              onChange={(e) => { setAddQ(e.target.value); setAddOpen(true); setActive(0); }} onFocus={() => setAddOpen(true)} onBlur={() => setAddOpen(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); submitBar(); } else if (e.key === 'ArrowDown' && addQ.trim()) { e.preventDefault(); moveActive(1); } else if (e.key === 'ArrowUp' && addQ.trim()) { e.preventDefault(); moveActive(-1); } else if (e.key === 'Escape') setAddOpen(false); }} />
          </label>
          {addOpen && addQ.trim() !== '' && (
            <div className="sugg" role="listbox">
              {suggestions.map((en, i) => (
                <button type="button" role="option" key={en.code} className={i === active ? 'on' : undefined} aria-selected={i === active} onMouseDown={(e) => { e.preventDefault(); quickAdd(en); }}>
                  <span><b>{en.code}</b> {en.name}</span>{en.credits !== undefined && <small className="muted">{en.credits} {t('Tín chỉ')}</small>}
                </button>
              ))}
              <button type="button" role="option" className={`manual${active === suggestions.length ? ' on' : ''}`} aria-selected={active === suggestions.length} onMouseDown={(e) => { e.preventDefault(); addTyped(); }}>{t('Thêm “{q}” thủ công', { q: addQ.trim() })}</button>
            </div>
          )}
        </div>
        <button type="button" className="primary" onClick={submitBar}>+ {t('Thêm môn')}</button>
      </div>

      <div className="toolbar">
        <div className="seg" role="group" aria-label={t('Cách xem')}>
          <button aria-pressed={view === 'sem'} onClick={() => setView('sem')}>{t('Theo học kỳ')}</button>
          <button aria-pressed={view === 'group'} onClick={() => setView('group')}>{t('Theo nhóm môn')}</button>
        </div>
        <label className="searchbox">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input placeholder={t('Tìm môn đã học theo mã hoặc tên môn')} aria-label={t('Tìm môn')} value={filter} onChange={(e) => setFilter(e.target.value)} />
        </label>
        {view === 'sem' && <button aria-pressed={onlyFail} className="toggle" onClick={() => setOnlyFail((v) => !v)}>{t('Chỉ môn chưa đạt')}</button>}
        <Hint right label={t('Cách nhập điểm')}>
          <p className="hhead">{t('Cách nhập điểm')}</p>
          <p>{t('Điểm tổng kết nhận số 0–10 hoặc một trong các ký hiệu:')}</p>
          <ul className="codelist">{Object.entries(SPECIAL_CODES).map(([k, v]) => <li key={k}><b>{k}</b> {t(v)}</li>)}</ul>
          <ul>
            <li><b>MT:</b> {t('cộng tín chỉ nhưng không vào GPA.')}</li>
            <li><b>{t('Cột “Bỏ”')}:</b> {t('loại môn khỏi GPA và tín chỉ tích lũy.')}</li>
          </ul>
        </Hint>
      </div>

      {view === 'group' ? <div className="stack"><Progress data={data} transcriptCredits={earned} query={q} goData={() => go('data', 'data')} onFreeCourse={onFreeCourse} onOpenCourse={(code) => { setFilter(code); setOnlyFail(false); setView('sem'); }} /><FreeList data={data} /><Exemption data={data} /></div> : attempts.length === 0 ? (
        <div className="card empty"><p className="muted">{t('Chưa có môn nào. Thêm bằng nút “Thêm môn”, hoặc nhập PDF bảng điểm ở mục “Dữ liệu & cài đặt”.')}</p><button className="primary" onClick={() => go('data', 'data')}>{t('Nhập PDF bảng điểm')}</button></div>
      ) : visible.length === 0 ? <div className="card"><p className="muted">{t('Không có môn nào khớp.')}</p></div> : (
        <>
          {expanded.map(semSection)}
          {collapsed.length > 0 && (
            <section className="semlist" aria-label={t('Các học kỳ khác')}>
              {shownCollapsed.map(collapsedRow)}
              {collapsed.length > FOLD && <button className="semrow" aria-expanded={showOld} onClick={() => setShowOld((v) => !v)}><b>{showOld ? t('Thu gọn danh sách') : t('Xem thêm {n} học kỳ', { n: collapsed.length - FOLD })}</b><span aria-hidden="true" className="muted">{showOld ? '▴' : '▾'}</span></button>}
            </section>
          )}
        </>
      )}
    </div>
  );
}

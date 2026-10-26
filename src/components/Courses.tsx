import { useMemo, useState } from 'react';
import type { AppData, Attempt, Component } from '../engine';
import type { TradeRow } from '../engine';
import { SemesterSelect } from './SemesterSelect';
import { bandOf, canonSemester, componentsComplete, keyer, resolveGoal, effort, effortBase, SPREAD_WARN, semesterAt, semesterDisplay, semesterLabel, semesterShort, letterOfTotal, newId, orderSemesters, round1, summarize, summarizeComponents, targetFor, tradeoff, whatIf } from '../engine';
import { fmt, fmtDelta } from '../format';
import { EffortLegend } from './EffortLegend';
import { buildLookup, norm } from '../data/lookup';
import { CodeName } from './CodeName';
import { classify } from '../engine';
import { CardTitle, useToast } from './ui';
import { t } from '../i18n';

const LETTERS = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D'];
// Gọi lúc cần (không tính sẵn ở mức module) để đổi ngôn ngữ có hiệu lực ngay
const presets = (): { label: string; parts: [string, number][] }[] => {
  const mid = t('Giữa kỳ'), fin = t('Cuối kỳ');
  return [
    { label: t('Giữa kỳ {a} · Cuối kỳ {b}', { a: 40, b: 60 }), parts: [[mid, 40], [fin, 60]] },
    { label: t('Giữa kỳ {a} · Cuối kỳ {b}', { a: 30, b: 70 }), parts: [[mid, 30], [fin, 70]] },
    { label: t('Giữa kỳ {a} · Cuối kỳ {b}', { a: 50, b: 50 }), parts: [[mid, 50], [fin, 50]] },
    { label: t('Bài tập {a} · Giữa kỳ {b} · Cuối kỳ {c}', { a: 20, b: 30, c: 50 }), parts: [[t('Bài tập'), 20], [mid, 30], [fin, 50]] },
    { label: t('Thí nghiệm {a} · Giữa kỳ {b} · Cuối kỳ {c}', { a: 30, b: 30, c: 40 }), parts: [[t('Thí nghiệm'), 30], [mid, 30], [fin, 40]] },
  ];
};
const addable = () => [t('Bài tập'), 'Quiz', t('Thí nghiệm'), t('Bài tập lớn')];
const mkComps = (parts: [string, number][]): Component[] => parts.map(([name, weight]) => ({ id: newId(), name, weight, score: null }));
const toNum = (s: string) => parseFloat(s.trim().replace(',', '.'));
const pill = (l: string) => <span className={`pill l-${l.replace('+', 'p')}`}>{l}</span>;

export type BriefTone = 'good' | 'warn' | 'bad' | 'idle';
/** Tóm tắt một dòng cho danh sách môn đang học: mức mục tiêu của môn (`goal`, mặc định B) cần bao nhiêu ở phần còn lại. Chỉ ghép kết quả của engine để hiển thị. */
export function courseBrief(a: Attempt, avg10: number | null): { tone: BriefTone; text: string } {
  const comps = a.components ?? [];
  const sum = summarizeComponents(comps);
  if (!comps.length || Math.abs(sum.weightSum - 100) >= 0.01) return { tone: 'idle', text: t('Chưa đủ trọng số') };
  if (sum.zero) return { tone: 'bad', text: t('Rớt (có thành phần 0 điểm)') };
  if (!sum.free.length && !sum.planned.length) { const total = round1(sum.secured); return { tone: 'good', text: t('Tổng kết {v} ({l})', { v: fmt(total, 1), l: letterOfTotal(total) }) }; }
  if (sum.doneWeight <= 0 && !sum.planned.length) return { tone: 'idle', text: t('Chưa nhập điểm') };
  const letter = a.goal ?? 'B';
  const r = targetFor(comps, letter);
  if (r.state === 'done') return { tone: 'good', text: t('{l}: đã đủ', { l: letter }) };
  if (r.state === 'impossible' || r.state === 'failed') return { tone: 'bad', text: t('{l}: không thể', { l: letter }) };
  const e = effort(r.needed, effortBase(comps, avg10).base);
  const where = sum.free.length === 1 ? sum.free[0].name : t('mỗi phần');
  return { tone: (['good', 'good', 'warn', 'bad', 'bad'] as const)[e.level], text: t('{l}: {w} cần {v}', { l: letter, w: where, v: fmt(r.neededStep ?? r.needed, 1) }) };
}

/** Ô số: giữ chữ đang gõ, chỉ ghi vào dữ liệu khi rời ô hoặc nhấn Enter. */
function NumInput({ value, onCommit, placeholder, label, disabled, max }: { value: number | null | undefined; onCommit: (v: number | null) => void; placeholder?: string; label: string; disabled?: boolean; max: number }) {
  const [txt, setTxt] = useState<string | null>(null);
  const shown = txt ?? (value === null || value === undefined ? '' : String(value));
  const commit = () => {
    if (txt === null) return;
    const t = txt.trim();
    if (t === '') onCommit(null);
    else { const n = toNum(t); if (n >= 0 && n <= max) onCommit(Math.round(n * 100) / 100); }
    setTxt(null);
  };
  return <input className="boxed num w80" inputMode="decimal" value={shown} placeholder={placeholder} disabled={disabled} aria-label={label}
    onChange={(e) => { const v = e.target.value; setTxt(v); if (v.trim() === '') onCommit(null); else { const n = toNum(v); if (n >= 0 && n <= max) onCommit(Math.round(n * 100) / 100); } }} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />;
}

/** Các mức % gợi ý theo loại thành phần (theo thông lệ của các môn ở HCMUT); luôn có “Khác…” để nhập số tùy ý. */
const range = (a: number, b: number) => Array.from({ length: (b - a) / 5 + 1 }, (_, i) => a + i * 5);
export function weightOptions(name: string): number[] {
  const n = norm(name);
  if (/cuoi ky/.test(n)) return range(30, 70);
  if (/giua ky/.test(n)) return range(10, 30);
  if (/thi nghiem|thuc hanh/.test(n)) return range(10, 30);
  if (/bai tap lon|do an/.test(n)) return range(10, 50);
  if (/bai tap|quiz|kiem tra/.test(n)) return [5, 10, 15, 20];
  return range(5, 100);
}

function WeightPick({ name, value, onChange }: { name: string; value: number; onChange: (v: number) => void }) {
  const opts = weightOptions(name);
  const [custom, setCustom] = useState(false);
  const isCustom = custom || (value > 0 && !opts.includes(value));
  const sel = isCustom ? 'custom' : value > 0 ? String(value) : '';
  return (
    <span className="wpick">
      <select className="boxed w90" value={sel} aria-label={t('Trọng số {name}', { name })} onChange={(e) => { const v = e.target.value; if (v === 'custom') setCustom(true); else { setCustom(false); onChange(parseInt(v, 10)); } }}>
        <option value="" disabled>{t('Chọn %')}</option>
        {opts.map((o) => <option key={o} value={o}>{o}%</option>)}
        <option value="custom">{t('Khác…')}</option>
      </select>
      {isCustom && <NumInput value={value} max={100} label={t('Trọng số tùy ý {name}', { name })} placeholder="%" onCommit={(v) => onChange(v ?? 0)} />}
    </span>
  );
}

function TradeGrid({ title, note, given, other, letters, rowsFor }: { title: string; note: string; given: string; other: string; letters: string[]; rowsFor: (l: string) => TradeRow[] }) {
  const all = letters.map((l) => ({ l, rows: rowsFor(l).filter((r) => r.a >= 3) }));
  if (all.length === 0 || all[0].rows.length === 0) return null;
  return (
    <details className="grp" open><summary><span className="gtitle">{title}</span></summary>
      <p className="muted small pad">{note}</p>
      <div className="tblwrap"><table className="tbl compact grid">
        <thead><tr><th>{given} →</th>{all[0].rows.map((r) => <th key={r.a} className="center">{fmt(r.a, 1)}</th>)}</tr></thead>
        <tbody>{all.map((g) => (
          <tr key={g.l}><td>{pill(g.l)} {t('cần ở')} {other}</td>{g.rows.map((r) => (
            <td key={r.a} className="center">{r.fail ? <span className="err" title={t('Điểm 0 ở một thành phần là rớt môn')}>{t('rớt')}</span> : !r.ok ? <span className="muted">—</span> : r.positive ? <span className="ok" title={t('Chỉ cần lớn hơn 0')}>&gt;0</span> : fmt(r.b, 1)}</td>))}</tr>))}</tbody>
      </table></div>
    </details>
  );
}

function CourseCard({ a, data, onUpdate, onRemove }: { a: Attempt; data: AppData; onUpdate: (id: string, p: Partial<Attempt>) => void; onRemove: (id: string) => void }) {
  const { attempts, settings } = data;
  const comps = a.components ?? [];
  const [targets, setTargets] = useState<string[]>(['B', 'B+', 'A']);
  const [menu, setMenu] = useState(false);
  const avg10 = useMemo(() => summarize(attempts, settings.retakePolicy).avg10, [attempts, settings.retakePolicy]);
  const sum = useMemo(() => summarizeComponents(comps), [comps]);
  const eb = useMemo(() => effortBase(comps, avg10), [comps, avg10]);
  const valid = comps.length > 0 && Math.abs(sum.weightSum - 100) < 0.01;
  const save = (next: Component[]) => onUpdate(a.id, { components: next });
  const patch = (id: string, p: Partial<Component>) => save(comps.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const cum = !!a.inCumulative;
  const mode = a.goalMode ?? 'letter';
  // Mức dùng để cộng GPA (chọn ở cột cuối bảng kết quả) luôn có trong bảng
  const pickGoal = cum && mode === 'letter';
  const sorted = LETTERS.filter((l) => targets.includes(l) || (pickGoal && l === (a.goal ?? 'B')));
  const complete = componentsComplete(comps);
  const goal = resolveGoal(a);
  const kk = useMemo(() => keyer(attempts), [attempts]);
  const previous = useMemo(() => attempts.filter((o) => o.id !== a.id && o.score !== null && !o.special && !o.excluded && kk(o) === kk(a)), [attempts, a, kk]);
  const results = useMemo(() => sorted.map((l) => {
    const r = targetFor(comps, l);
    const w = whatIf(attempts, settings.retakePolicy, [{ attemptId: a.id, newScore: r.state === 'failed' ? 0 : r.minTotal }]);
    // Cộng dồn: môn này ở mức l + các môn khác đã tích "Tính vào GPA tích lũy chung" ở mức mong muốn của chúng
    const others = attempts.filter((o) => o.id !== a.id && o.inCumulative && o.score === null).flatMap((o) => { const g = resolveGoal(o); return g.score === null ? [] : [{ attemptId: o.id, newScore: g.score }]; });
    const c = cum && others.length > 0 ? whatIf(attempts, settings.retakePolicy, [...others, { attemptId: a.id, newScore: r.state === 'failed' ? 0 : r.minTotal }]) : null;
    return { r, gpa: w.after.gpa, delta: w.delta, cumGpa: c ? c.after.gpa : null, cumDelta: c ? c.delta : null, others: others.length };
  }), [comps, targets, attempts, settings.retakePolicy, a.id, cum, a.goal, pickGoal]); // eslint-disable-line react-hooks/exhaustive-deps
  const hasInfo = sum.doneWeight > 0 || sum.planned.length > 0;
  const finished = valid && sum.free.length === 0 && sum.planned.length === 0;
  const total = round1(sum.secured);
  const two = valid && sum.free.length === 2;

  return (
    <div className="card course">
      <div className="head-row">
        <h3>{a.code ? `${a.code} · ` : ''}{a.name} <small className="muted">· {t('{n} tín chỉ', { n: a.credits })} · {semesterDisplay(a.semester)}</small></h3>
        <button className="ghost danger" onClick={() => onRemove(a.id)}>{t('Xóa môn')}</button>
      </div>

      <div className="cumrow">
        <label className="check"><input type="checkbox" checked={cum} onChange={(e) => onUpdate(a.id, { inCumulative: e.target.checked })} /> {t('Tính vào GPA tích lũy chung')}</label>
        {cum && (
          <>
            <label className="small">{t('Lấy điểm')}
              <select className="mini w300" value={mode} onChange={(e) => onUpdate(a.id, { goalMode: e.target.value as 'letter' | 'components' | 'score' })} aria-label={t('Cách lấy điểm để cộng dồn')}>
                <option value="letter">{t('Theo mức điểm chữ mong muốn')}</option>
                <option value="components" disabled={!complete}>{t('Trung bình các điểm thành phần hiện tại')}{complete ? '' : t(' (cần nhập đủ)')}</option>
                <option value="score">{t('Theo điểm tôi tự nhập')}</option>
              </select></label>
            {mode === 'letter' && <small className="muted">{t('Chọn mức ở cột “Cộng GPA” trong bảng kết quả.')}</small>}
            {mode === 'score' && <label className="small">{t('Điểm (0–10)')} <NumInput value={a.goalScore} max={10} placeholder={t('vd 8.5')} label={t('Điểm tự nhập để cộng dồn')} onCommit={(v) => onUpdate(a.id, { goalScore: v ?? undefined })} /></label>}
            <span className="small">{goal.score === null ? <span className="err">{goal.note}</span> : <>{t('Điểm dùng để tính:')} <b>{fmt(goal.score, 1)}</b> → {pill(goal.letter ?? 'F')}</>}</span>
            {!complete && <small className="muted">{t('Muốn lấy trung bình thành phần: nhập “Điểm đã có” cho mọi thành phần (tổng trọng số 100%).')}</small>}
          </>
        )}
      </div>
      {previous.length > 0 && (
        <p className="note">{t('Môn này đã học trước đó ({list}), nên đây là', { list: previous.map((p) => `${semesterShort(p.semester)}: ${fmt(p.score, 1)}`).join('; ') })} <b>{t('học cải thiện/học lại')}</b>.
          {settings.retakePolicy === 'highest' ? t(' App lấy lần điểm cao nhất: điểm cũ được thay bằng điểm mới nếu điểm mới cao hơn, tín chỉ không bị cộng hai lần.') : settings.retakePolicy === 'latest' ? t(' App lấy lần học gần nhất.') : t(' Chính sách hiện tại tính mọi lần học.')}</p>
      )}

      <h4 className="secth">{t('① Thành phần điểm')}</h4>
      <div className="btn-row presets">{t('Mẫu thành phần:')}
        {presets().map((p) => <button key={p.label} className="ghost" onClick={() => save(mkComps(p.parts))}>{p.label}</button>)}
      </div>

      <div className="tblwrap"><table className="tbl compact grid comp">
        <thead><tr><th>{t('Thành phần')}</th><th className="center" title={t('Phần trăm trong điểm tổng kết')}>{t('Trọng số %')}</th><th className="center" title={t('Điểm hệ 10 đã có. Để trống nếu chưa thi/chưa có điểm')}>{t('Điểm đã có')}</th><th className="center" title={t('Điểm bạn dự kiến đạt cho phần chưa có điểm; dùng để xem các phần còn lại cần bao nhiêu')}>{t('Dự kiến')}</th><th /></tr></thead>
        <tbody>{comps.map((c) => (
          <tr key={c.id}>
            <td><input className="boxed" value={c.name} onChange={(e) => patch(c.id, { name: e.target.value })} aria-label={t('Tên thành phần')} /></td>
            <td className="center"><WeightPick name={c.name} value={c.weight} onChange={(v) => patch(c.id, { weight: v })} /></td>
            <td className="center"><NumInput value={c.score} max={10} placeholder={t('chưa có')} label={t('Điểm {name}', { name: c.name })} onCommit={(v) => patch(c.id, { score: v, ...(v !== null ? { planned: null } : {}) })} /></td>
            <td className="center"><NumInput value={c.planned} max={10} placeholder="—" disabled={c.score !== null} label={t('Dự kiến {name}', { name: c.name })} onCommit={(v) => patch(c.id, { planned: v })} /></td>
            <td><button className="ghost danger" onClick={() => save(comps.filter((x) => x.id !== c.id))} aria-label={t('Xóa {name}', { name: c.name })}>×</button></td>
          </tr>))}</tbody>
      </table></div>
      <div className="btn-row addmenu"><button className="ghost" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>{t('+ Thêm thành phần')} {menu ? '▴' : '▾'}</button>
        {menu && (
          <span className="chips" role="group" aria-label={t('Chọn loại thành phần')}>
            {addable().map((n) => <button key={n} className="chip btn" onClick={() => { save([...comps, { id: newId(), name: n, weight: 0, score: null }]); setMenu(false); }}>{n}</button>)}
            <button className="chip btn" onClick={() => { save([...comps, { id: newId(), name: t('Thành phần khác'), weight: 0, score: null }]); setMenu(false); }}>{t('+ Tùy ý')}</button>
          </span>
        )}
        <span className={Math.abs(sum.weightSum - 100) < 0.01 ? 'muted small' : 'err small'}>{t('Tổng trọng số:')} {fmt(sum.weightSum, 0)}% {Math.abs(sum.weightSum - 100) < 0.01 ? '✓' : t('(phải bằng 100%)')}</span></div>

      {valid && (
        <>
          <h4 className="secth">{t('② Kết quả theo mức')}</h4>
          {sum.zero && <div className="banner err" role="alert">⚠ “{sum.zero.name}” {sum.zero.score === 0 ? t('bị 0 điểm') : t('đang dự kiến 0 điểm')}: <b>{t('có thành phần 0 điểm thì rớt môn (F)')}</b>{t(', bất kể các phần khác.')}</div>}
          <div className="explain">
            {!hasInfo ? <><b>{t('Không đủ thông tin.')}</b> {t('Hãy nhập')} <b>{t('Điểm đã có')}</b> {t('hoặc')} <b>{t('Dự kiến')}</b> {t('cho ít nhất 1 thành phần để app tính điểm cần đạt.')}</> : <>
            {t('Đã có')} <b>{fmt(sum.doneWeight, 0)}%</b> {t('trọng số điểm thật')}{sum.planned.length > 0 && <> {t('và')} <b>{fmt(sum.planned.reduce((s, c) => s + c.weight, 0), 0)}%</b> {t('điểm dự kiến')} ({sum.planned.map((c) => c.name).join(', ')})</>}{t(', góp')} <b>{fmt(sum.secured, 1)}</b> {t('điểm vào tổng kết (thang 10).')}{' '}
            {t('Các phần còn lại')}{sum.freeWeight > 0 ? <> (<b>{fmt(sum.freeWeight, 0)}%</b>)</> : ''} {t('quyết định điểm tổng kết cuối cùng')}{sum.zero ? t(', nhưng do có thành phần 0 điểm nên kết quả là F') : t(', nằm trong khoảng')} {!sum.zero && <> <b>{fmt(round1(sum.minTotal), 1)} → {fmt(round1(sum.maxTotal), 1)}</b>, {t('tức từ')} {pill(letterOfTotal(sum.minTotal))} {t('đến')} {pill(letterOfTotal(sum.maxTotal))}</>}.</>}
          </div>

          {finished ? (
            <div className="banner ok">
              {sum.zero ? <>{t('Có thành phần 0 điểm nên môn này')} <b>{t('rớt (F)')}</b>.{' '}<button className="primary" onClick={() => onUpdate(a.id, { score: 0, special: undefined })}>{t('Ghi điểm F vào bảng điểm')}</button></>
                : <>{t('Đã đủ điểm thành phần: tổng kết')} <b>{fmt(total, 1)}</b> → {pill(letterOfTotal(total))}.{' '}<button className="primary" onClick={() => onUpdate(a.id, { score: total, special: undefined })}>{t('Ghi vào bảng điểm')}</button></>}
            </div>
          ) : (
            <>
              <div className="chips" role="group" aria-label={t('Mức điểm mong muốn')}>
                <span className="muted small">{t('Mức mong muốn:')}</span>
                {LETTERS.map((l) => <button key={l} className={`ghost${targets.includes(l) ? ' on' : ''}`} onClick={() => setTargets((t) => (t.includes(l) ? t.filter((x) => x !== l) : [...t, l]))}>{l}</button>)}
              </div>

              {sorted.length > 0 && (
                <div className="tblwrap"><table className="tbl compact grid">
                  <thead><tr><th>{t('Mức')}</th><th className="num" title={t('Điểm tổng kết (sau làm tròn 1 chữ số) tối thiểu cho mức này')}>{t('Tổng kết tối thiểu')}</th>
                    <th className="num" title={t('Điểm bạn cần đạt ở mỗi phần còn lại, nếu các phần đó có điểm bằng nhau. Cách tính ghi bên dưới bảng.')}>{sum.free.length === 1 ? t('Cần ở “{v1}”', { v1: sum.free[0].name }) : t('Cần ở mỗi phần còn lại (nếu bằng nhau)')}</th><th>{t('Độ vừa sức')}</th>{cum && <th className="num" title={t('Dòng trên: GPA tích lũy nếu chỉ riêng môn này đạt đúng mức tối thiểu. Dòng dưới: cộng dồn cùng các môn khác đã tích ở mức mong muốn của chúng.')}>{t('GPA tích lũy')}</th>}{pickGoal && <th className="center" title={t('Mức điểm của môn này dùng để cộng vào GPA tích lũy chung')}>{t('Cộng GPA')}</th>}</tr></thead>
                  <tbody>{results.map(({ r, gpa, delta, cumGpa, cumDelta, others }) => {
                    const e = effort(r.state === 'impossible' || r.state === 'failed' ? 11 : r.needed, eb.base);
                    const use = pickGoal && <td className="center"><input type="radio" name={`goal-${a.id}`} checked={(a.goal ?? 'B') === r.letter} onChange={() => onUpdate(a.id, { goal: r.letter })} aria-label={t('Dùng mức {l} để cộng GPA', { l: r.letter })} /></td>;
                    if (!hasInfo) return (
                      <tr key={r.letter}><td>{pill(r.letter)}</td><td className="num">{fmt(r.minTotal, 1)}</td>
                        <td className="center muted" colSpan={cum ? 3 : 2}>{t('Không đủ thông tin')}</td>{use}</tr>);
                    return (
                      <tr key={r.letter} className={pickGoal && (a.goal ?? 'B') === r.letter ? 'sel' : undefined}>
                        <td>{pill(r.letter)}</td>
                        <td className="num">{fmt(r.minTotal, 1)}</td>
                        <td className="num">{r.state === 'failed' ? <span className="err">{t('Rớt (có thành phần 0 điểm)')}</span> : r.state === 'done' ? <span className="ok">{t('Đã chắc chắn')} <small className="muted">{t('(mỗi phần còn lại  0)')}</small></span> : r.state === 'impossible' ? <span className="err">{t('Không thể')} ({r.needed !== null ? t('cần {v1}', { v1: fmt(r.needed, 1) }) : t('đã hết phần thi')})</span> : <><b>{fmt(r.needed, 1)}</b> <small className="muted" title={t('Điểm thành phần được chấm theo bước 0,5')}>≈ {fmt(r.neededStep, 1)}</small></>}</td>
                        <td><span className={`tagx ${r.state === 'failed' ? 'bad' : ['good', 'good', 'warn', 'bad', 'bad'][e.level]}`} title={r.state === 'ok' && r.needed !== null ? t('{d} so với mốc {avg}', { d: fmt(r.needed - eb.base, 2).replace(/^(?!-)/, '+'), avg: fmt(eb.base, 2) }) : undefined}>{r.state === 'failed' ? t('Rớt môn') : r.state === 'done' ? t('Đã đủ') : t(e.label)}</span></td>
                        {cum && <td className="num">{fmt(gpa, 3)} <small className="muted">({fmtDelta(delta, 3)})</small>
                          {cumGpa !== null && <div className="small muted">{t('cộng dồn')} <b>{fmt(cumGpa, 3)}</b> ({fmtDelta(cumDelta ?? 0, 3)}, {t('cùng {n} môn khác', { n: others })})</div>}</td>}
                        {use}
                      </tr>);
                  })}</tbody>
                </table></div>
              )}
              {hasInfo && (
                <details className="grp"><summary><span className="gtitle">{t('Cách tính?')}</span>{eb.p !== null && eb.rough && <small className="muted"> · {t('ước lượng sơ bộ')}</small>}</summary>
              {hasInfo && !sum.zero && sum.freeWeight > 0 && results[0] && (
                <div className="explain">
                  <p><b>{t('Cách tính cột “Cần ở {v}”', { v: sum.free.length === 1 ? sum.free[0].name : t('mỗi phần còn lại') })}</b>{t(': (Tổng kết tối thiểu − 0,05 − điểm đã góp) ÷ trọng số các phần còn lại. Số 0,05 là biên làm tròn: tổng kết 7,95 được làm tròn thành 8,0. Lưu ý: mỗi phần còn lại phải khác 0, vì có thành phần 0 điểm là rớt môn.')}</p>
                  <p>{t('Ví dụ với mức')} {results[0].r.letter}: ({fmt(results[0].r.minTotal, 1)} − 0.05 − {fmt(sum.secured, 2)}) ÷ {fmt(sum.freeWeight / 100, 2)} = <b>{results[0].r.needed === null ? '—' : fmt((results[0].r.minTotal - 0.05 - sum.secured) * 100 / sum.freeWeight, 2)}</b>
                    {sum.free.length > 1 ? <>. {t('Nghĩa là nếu {names} đều đạt cùng mức này thì tổng kết vừa đủ {letter}. Muốn dồn điểm vào phần này, bớt phần kia thì xem bảng cân đối bên dưới.', { names: sum.free.map((c) => c.name).join(', '), letter: results[0].r.letter })}</> : '.'}</p>
                </div>)}
              {hasInfo && eb.p !== null && eb.rough && <p className="muted small">{t('Ước lượng sơ bộ: mới có {a}% trọng số có điểm, mốc đánh giá chủ yếu dựa vào điểm trung bình toàn bộ của bạn.', { a: Math.round(eb.alpha * 100) })}</p>}
              <p className="muted small">{t('Điểm tổng kết được làm tròn 1 chữ số thập phân nên 7.95 vẫn tính là 8.0.')}</p>
                </details>)}
              {eb.spread !== null && eb.spread > SPREAD_WARN && <p className="note small">{t('Điểm các thành phần đã có chênh nhau {d} điểm, mức đánh giá kém chắc chắn. Thí nghiệm, bài tập thường điểm cao hơn thi cuối kỳ.', { d: fmt(eb.spread, 1) })}</p>}
              <EffortLegend avg10={avg10} basis={eb} needed={results.find((x) => x.r.needed !== null)?.r.needed} what={t('điểm cần ở phần còn lại')} />

              {!two && sum.free.length > 2 && <p className="note">{t('Để xem bảng cân đối điểm, vui lòng nhập ô')} <b>{t('Dự kiến')}</b> {t('hoặc')} <b>{t('Điểm đã có')}</b> {t('cho ít nhất 1 thành phần, sao cho chỉ còn đúng 2 thành phần chưa có điểm.')}</p>}
              {two && (
                <>
                  <TradeGrid title={t('Bảng 1: nếu “{v1}” được … thì “{v2}” cần', { v1: sum.free[0].name, v2: sum.free[1].name })} given={sum.free[0].name} other={sum.free[1].name} letters={sorted}
                    note={t('Hàng ngang là điểm “{v1}” đạt được; ô là điểm tối thiểu “{v2}” cần để đạt từng mức (“—” là không thể, “>0” là chỉ cần khác 0). Chia theo bước 0,5.', { v1: sum.free[0].name, v2: sum.free[1].name })}
                    rowsFor={(l) => tradeoff(comps, l, 0.5, 0)} />
                  <TradeGrid title={t('Bảng 2 (ngược lại): nếu “{v1}” được … thì “{v2}” cần', { v1: sum.free[1].name, v2: sum.free[0].name })} given={sum.free[1].name} other={sum.free[0].name} letters={sorted}
                    note={t('Đổi chiều: biết trước điểm “{v1}”, xem “{v2}” cần tối thiểu bao nhiêu.', { v1: sum.free[1].name, v2: sum.free[0].name })}
                    rowsFor={(l) => tradeoff(comps, l, 0.5, 1)} />
                </>
              )}
            </>
          )}
        </>
      )}
      {!valid && comps.length > 0 && <p className="warnbox">{t('Tổng trọng số phải bằng 100% mới tính được. Hiện là {w}%.', { w: fmt(sum.weightSum, 0) })}</p>}
      {comps.length === 0 && <p className="muted">{t('Chọn một mẫu ở trên hoặc thêm thành phần điểm (giữa kỳ, thí nghiệm, cuối kỳ…).')}</p>}
    </div>
  );
}

/** GPA cộng dồn các môn đang học đã tích “Tính vào GPA tích lũy chung”, lần lượt từ trên xuống. */
function useCumulative(data: AppData) {
  const { attempts, settings } = data;
  const picked = attempts.filter((a) => a.inCumulative && a.score === null && !a.excluded && a.credits > 0);
  return useMemo(() => {
    const base = summarize(attempts, settings.retakePolicy);
    const changes: { attemptId: string; newScore: number }[] = [];
    let prev = base.gpa ?? 0;
    const out = picked.map((a) => {
      const g = resolveGoal(a);
      const alone = g.score === null ? null : whatIf(attempts, settings.retakePolicy, [{ attemptId: a.id, newScore: g.score }]);
      let run: number | null = null, step: number | null = null;
      if (g.score !== null) {
        changes.push({ attemptId: a.id, newScore: g.score });
        run = whatIf(attempts, settings.retakePolicy, changes).after.gpa;
        step = (run ?? 0) - prev; prev = run ?? prev;
      }
      return { a, g, alone: alone ? alone.delta : null, run, step };
    });
    const fin = changes.length ? whatIf(attempts, settings.retakePolicy, changes) : null;
    return { base, out, fin };
  }, [attempts, settings.retakePolicy, picked.map((a) => `${a.id}${a.goal}${a.goalMode}${a.goalScore}${JSON.stringify(a.components)}`).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
}

function CumulativePanel({ cum }: { cum: ReturnType<typeof useCumulative> }) {
  const { base, out, fin } = cum;
  if (out.length === 0) return null;
  const after = fin?.after;
  return (
    <div className="card">
      <details className="grp"><summary><span className="gtitle">{t('GPA tích lũy chung (cộng dồn các môn đang học đã tích)')}</span></summary>
      <p className="muted small">{t('Mỗi môn lấy điểm theo cách bạn chọn ở môn đó:')} <b>{t('mức điểm chữ')}</b> {t('(đúng điểm tổng kết thấp nhất của mức đó),')} <b>{t('trung bình các thành phần đã nhập')}</b> {t('(khi nhập đủ), hoặc')} <b>{t('điểm tự nhập')}</b>{t('. “Cộng thêm” là phần GPA tăng thêm; cột cộng dồn cộng lần lượt từ trên xuống. Môn có thành phần 0 điểm tính là F; môn chưa xác định được điểm (chưa nhập đủ, không thể đạt mức chọn) bị bỏ qua.')}</p>
      <div className="tblwrap"><table className="tbl compact grid">
        <thead><tr><th>{t('Môn')}</th><th className="num">{t('Tín chỉ')}</th><th className="center">{t('Mức')}</th><th className="num">{t('Điểm tổng kết dùng để tính')}</th><th className="num" title={t('GPA tăng thêm nếu chỉ riêng môn này')}>{t('Cộng thêm (riêng)')}</th><th className="num" title={t('GPA tích lũy sau khi cộng dồn từ môn đầu đến môn này')}>{t('GPA cộng dồn')}</th><th className="num">{t('Cộng thêm (bước này)')}</th></tr></thead>
        <tbody>
          <tr><td colSpan={5}><b>{t('Hiện tại')}</b> <small className="muted">({t('{n} tín chỉ có điểm', { n: base.countedCredits })})</small></td><td className="num"><b>{fmt(base.gpa, 3)}</b></td><td /></tr>
          {out.map(({ a, g, alone, run, step }) => (
            <tr key={a.id}>
              <td>{a.code ? <b>{a.code} </b> : null}{a.name}</td>
              <td className="num">{a.credits}</td>
              <td className="center">{g.letter ? pill(g.letter) : '—'}<small className="muted"> {a.goalMode === 'components' ? t('TB thành phần') : a.goalMode === 'score' ? t('tự nhập') : t('mức chữ')}</small></td>
              <td className="num">{g.score === null ? <span className="err">{g.note}</span> : fmt(g.score, 1)}</td>
              <td className="num">{alone === null ? '—' : <span className={alone >= 0 ? 'ok' : 'err'}>{fmtDelta(alone, 3)}</span>}</td>
              <td className="num">{run === null ? '—' : fmt(run, 3)}</td>
              <td className="num">{step === null ? '—' : fmtDelta(step, 3)}</td>
            </tr>))}
          <tr className="total"><td colSpan={4}><b>{t('Tổng sau {n} môn', { n: out.filter((o) => o.g.score !== null).length })}</b></td>
            <td className="num" colSpan={2}><b>{fmt(after?.gpa ?? base.gpa, 3)}</b> <small className="muted">{t(after?.classification ?? base.classification ?? '—')}</small></td>
            <td className="num"><b className={fin && fin.delta >= 0 ? 'ok' : 'err'}>{fin ? fmtDelta(fin.delta, 3) : '—'}</b></td></tr>
        </tbody>
      </table></div>
      <p className="small">{t('Từ')} <b>{fmt(base.gpa, 3)}</b> ({t(base.classification ?? '—')}) → <b>{fmt(after?.gpa ?? base.gpa, 3)}</b> ({t(after?.classification ?? base.classification ?? '—')}), {t('tín chỉ có điểm')} {base.countedCredits} → {after?.countedCredits ?? base.countedCredits}. {after && after.gpa !== null && classify(after.gpa) !== classify(base.gpa ?? 0) ? t('Học lực thay đổi so với hiện tại.') : ''}</p>
      </details>
    </div>
  );
}

export function Courses({ data, adding, onAdd, onUpdate, onRemove }: { data: AppData; adding: boolean; onAdd: (rows: Attempt[]) => void; onUpdate: (id: string, p: Partial<Attempt>) => void; onRemove: (id: string) => void }) {
  const toast = useToast();
  const ongoing = data.attempts.filter((a) => a.score === null && (!a.special || a.special === 'CH') && !a.excluded && a.credits > 0);
  const sems = orderSemesters(data.attempts);
  const lookup = useMemo(() => buildLookup(data), [data]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [credits, setCredits] = useState('3');
  const [semester, setSemester] = useState(semesterLabel(semesterAt()));
  const [err, setErr] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const current = ongoing.find((a) => a.id === sel) ?? ongoing[0];
  const cum = useCumulative(data);
  const avg10 = useMemo(() => summarize(data.attempts, data.settings.retakePolicy).avg10, [data.attempts, data.settings.retakePolicy]);
  const add = () => {
    const c = toNum(credits);
    if (!name.trim()) return setErr(t('Nhập tên môn học.'));
    if (!(c > 0 && c <= 20)) return setErr(t('Số tín chỉ phải từ 1 đến 20.'));
    setErr('');
    const id = newId();
    setSel(id);
    onAdd([{ id, ...(code.trim() ? { code: code.trim().toUpperCase() } : {}), name: name.trim(), credits: c, score: null, semester: canonSemester(semester) || 'Chưa phân loại', source: 'manual', components: mkComps(presets()[0].parts) }]);
    toast(t('Đã thêm môn {name}', { name: name.trim() }), { undo: true });
    setCode(''); setName('');
  };
  void bandOf;

  return (
    <div className="stack">
      {(adding || ongoing.length === 0) && (
        <div className="card">
          <CardTitle hint={<>
            <p className="hhead">{t('Môn đang học')}</p>
            <ol>
              <li>{t('Nhập trọng số và điểm đã có của từng thành phần (giữa kỳ, thí nghiệm, bài tập lớn, cuối kỳ…).')}</li>
              <li>{t('Chọn mức điểm chữ mong muốn (B, B+, A…).')}</li>
              <li>{t('App cho biết phần còn lại cần đạt bao nhiêu và có vừa sức không.')}</li>
            </ol></>}>{t('Thêm môn đang học')}</CardTitle>
          <form className="form-row" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <CodeName lookup={lookup} code={code} name={name} setCode={setCode} setName={setName} setCredits={setCredits} />
            <label>{t('Tín chỉ')}<input value={credits} onChange={(e) => setCredits(e.target.value)} inputMode="decimal" className="w60" /></label>
            <label>{t('Học kỳ')}<SemesterSelect value={semester} onChange={setSemester} existing={sems} className="w300" recentOnly /></label>
            <button type="submit" className="primary">{t('Thêm môn')}</button>
          </form>
          {err && <p className="err" role="alert">{err}</p>}
        </div>
      )}
      {ongoing.length === 0 || !current ? <div className="card"><p className="muted">{t('Chưa có môn đang học. Thêm môn ở trên (môn chưa có điểm tổng kết ở trang “Bảng điểm” cũng sẽ hiện ở đây).')}</p></div> : (
        <div className="split">
          <div className="split-side">
            <div className="card mlist-card">
              <h3>{t('Môn đang học')} <small className="muted">({ongoing.length})</small></h3>
              <ul className="mlist">{ongoing.map((a) => {
                const b = courseBrief(a, avg10);
                return (
                  <li key={a.id}><button className={a.id === current.id ? 'on' : undefined} aria-current={a.id === current.id ? 'true' : undefined} onClick={() => setSel(a.id)}>
                    <i className={`dot ${b.tone}`} aria-hidden />
                    <span className="mname"><b>{a.code ?? a.name}</b>{a.code && <small>{a.name}</small>}</span>
                    <span className="mbrief"><small className="muted">{t('{n} tín chỉ', { n: a.credits })}{a.inCumulative ? ' · ✓' : ''}</small><small className={b.tone === 'idle' ? 'muted' : b.tone === 'bad' ? 'err' : undefined}>{b.text}</small></span>
                  </button></li>);
              })}</ul>
              <p className="mlist-foot">{cum.fin
                ? <>{t('GPA')} <b>{fmt(cum.base.gpa, 3)}</b> → <b>{fmt(cum.fin.after.gpa, 3)}</b> <span className={cum.fin.delta >= 0 ? 'ok' : 'err'}>({fmtDelta(cum.fin.delta, 3)})</span><br /><small className="muted">{t('cộng {n} môn đã tích ✓', { n: cum.out.filter((o) => o.g.score !== null).length })}</small></>
                : <small className="muted">{t('Tích “Tính vào GPA tích lũy chung” ở môn để xem GPA sau kỳ này.')}</small>}</p>
            </div>
          </div>
          <div className="split-main stack">
            <CourseCard key={current.id} a={current} data={data} onUpdate={onUpdate} onRemove={onRemove} />
            <CumulativePanel cum={cum} />
          </div>
        </div>
      )}
    </div>
  );
}

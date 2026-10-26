import { useMemo, useState } from 'react';
import type { AppData, Settings } from '../engine';
import { CLASSIFICATIONS, classify, computeProgress, degreeClass, effectiveTotal, enrollingCredits, hardness, isUndeclared, plan, resolveGoal, summarize } from '../engine';
import { HardnessLegend } from './EffortLegend';
import { fmt, fmtDelta } from '../format';
import { Improve } from './Improve';
import { CardTitle } from './ui';
import { t } from '../i18n';

/** Điểm 4 → mức chữ gần nhất cần đạt trung bình (để dễ hình dung). */
const letterNear = (x: number) => (x > 3.75 ? t('gần như toàn A/A+') : x > 3.25 ? t('giữa B+ và A') : x > 2.75 ? t('khoảng B đến B+') : x > 2.25 ? t('khoảng C+ đến B') : x > 1.75 ? t('khoảng C') : t('chỉ cần đạt'));

const LADDER: [string, number][] = [['D', 1], ['D+', 1.5], ['C', 2], ['C+', 2.5], ['B', 3], ['B+', 3.5], ['A', 4]];
const pill = (l: string) => <span className={`pill l-${l.replace('+', 'p')}`}>{l}</span>;
const MIX_ROWS = 8;

/** Bảng phối điểm: với mỗi số tín chỉ đạt A (bước 2 vì mỗi môn tối thiểu 2 tín chỉ), phần còn lại cần tối thiểu mức nào và GPA cuối là bao nhiêu. */
function Mix({ remaining: R, counted: N, points: S, target }: { remaining: number; counted: number; points: number; target: number }) {
  const rows = useMemo(() => {
    const out: { h: number; rest: number; low: string | null; final: number; ok: boolean }[] = [];
    for (let h = 0; ; h = Math.min(R, h + 2)) {
      const rest = R - h;
      const need = rest > 0 ? (target * (N + R) - S - 4 * h) / rest : null;
      const low = need === null ? null : LADDER.find(([, pt]) => pt >= need - 1e-9) ?? null;
      const final = (S + 4 * h + (low ? low[1] * rest : 0)) / (N + R);
      const ok = rest === 0 ? final >= target - 1e-9 : low !== null;
      // Phần còn lại vẫn phải toàn A thì thêm tín chỉ A không đổi gì: chỉ giữ dòng đầu
      const prev = out[out.length - 1];
      if (!(rest > 0 && low?.[0] === 'A' && prev && prev.rest > 0 && prev.low === 'A')) out.push({ h, rest, low: low ? low[0] : null, final, ok });
      // Từ đây thêm tín chỉ A không làm giảm mức tối thiểu của phần còn lại nữa (đã xuống D)
      if (h >= R || (need !== null && need <= 1 + 1e-9)) break;
    }
    return out;
  }, [R, N, S, target]);
  const first = rows.findIndex((r) => r.ok);
  const [pick, setPick] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  const sel = pick !== null && pick < rows.length ? pick : first;
  const shown = all ? rows : rows.slice(0, MIX_ROWS);
  const cur = sel >= 0 ? rows[sel] : null;
  return (
    <div className="card">
      <CardTitle hint={<>
        <p className="hhead">{t('Phối điểm')}</p>
        <ul>
          <li>{t('Mỗi dòng: số tín chỉ đạt A / A+ (quy đổi 4.0) và mức tối thiểu phần còn lại để vẫn đạt mục tiêu.')}</li>
          <li>{t('Bấm một dòng để xem tóm tắt.')}</li>
          <li>{t('Số tín chỉ điểm A tăng theo bội của 2 vì mỗi môn tối thiểu 2 tín chỉ.')}</li>
        </ul></>}>{t('Phối điểm cho {n} tín chỉ còn lại', { n: R })}</CardTitle>
      {cur && (
        <p className="banner ok mixout">{cur.rest > 0 && cur.low
          ? <>{t('{h} tín chỉ đạt A / A+ thì {r} tín chỉ còn lại cần tối thiểu', { h: cur.h, r: cur.rest })} {pill(cur.low)}</>
          : t('Cả {n} tín chỉ đạt A / A+', { n: R })} · {t('GPA cuối')} <b>{fmt(cur.final, 3)}</b> <span className={cur.final >= target ? 'ok' : 'err'}>({fmtDelta(cur.final - target)} {t('so với mục tiêu')})</span></p>
      )}
      <div className="tblwrap"><table className="tbl compact grid">
        <thead><tr><th className="num">{t('Tín chỉ đạt A / A+')}</th><th>{t('Phần còn lại cần tối thiểu')}</th><th className="num">{t('GPA cuối')}</th><th className="num">{t('Dư / thiếu so với mục tiêu')}</th></tr></thead>
        <tbody>{shown.map((r, i) => (
          <tr key={r.h} className={i === sel ? 'sel' : undefined}>
            <td className="num"><button className="linkbtn" aria-pressed={i === sel} onClick={() => setPick(i)}>{r.h} / {R}</button>{i === first && <> <span className="tagx good">{t('ít A nhất')}</span></>}</td>
            <td>{r.rest === 0 ? <span className="muted">—</span> : r.low ? <>{pill(r.low)} <small className="muted">{t('cho {n} tín chỉ', { n: r.rest })}</small></> : <span className="err">{t('Không đủ')}</span>}</td>
            <td className="num">{fmt(r.final, 3)}</td>
            <td className={`num ${r.ok ? 'ok' : 'err'}`}>{fmtDelta(r.final - target, 3)}</td>
          </tr>))}</tbody>
      </table></div>
      {rows.length > MIX_ROWS && <button className="ghost mt" onClick={() => setAll((v) => !v)}>{all ? t('Chỉ hiện {n} dòng đầu', { n: MIX_ROWS }) : t('Hiện tất cả {length} dòng', { length: rows.length })}</button>}
    </div>
  );
}

export function Planner({ data, onSettings }: { data: AppData; onSettings: (p: Partial<Settings>) => void }) {
  const { attempts, settings } = data;
  const s = useMemo(() => summarize(attempts, settings.retakePolicy), [attempts, settings.retakePolicy]);
  const progress = useMemo(() => (data.program ? computeProgress(data.program, attempts, settings.retakePolicy, data.freeCourses) : null), [data.program, attempts, settings.retakePolicy, data.freeCourses]);
  const undeclared = isUndeclared(data.official);
  const prog = undeclared ? null : progress;
  const fromProgram = !!prog;
  const total = prog ? prog.required : effectiveTotal(settings, data.official);
  // Môn đang học đã có điểm dự kiến (trang Tính điểm môn đang học) được tính như đã có điểm, giống phần Improve
  const [withOngoing, setWithOngoing] = useState(true);
  const ongoing = useMemo(() => attempts.filter((a) => a.inCumulative && a.score === null && !a.excluded && a.credits > 0).flatMap((a) => { const g = resolveGoal(a); return g.score === null ? [] : [{ id: a.id, score: g.score }]; }), [attempts]);
  const planAttempts = useMemo(() => {
    if (!withOngoing || !ongoing.length) return attempts;
    const m = new Map(ongoing.map((o) => [o.id, o.score]));
    return attempts.map((a) => (m.has(a.id) ? { ...a, score: m.get(a.id)! } : a));
  }, [attempts, ongoing, withOngoing]);
  // Tín chỉ tích lũy theo CTĐT + phần môn đang học dự kiến đạt thêm
  const earned = useMemo(() => (prog ? prog.earned + summarize(planAttempts, settings.retakePolicy).passedCredits - s.passedCredits : undefined), [prog, planAttempts, settings.retakePolicy, s.passedCredits]);
  // Mốc 3.20 (chắc chắn) và mốc tối thiểu 3.195 (GPA hiển thị 2 chữ số làm tròn lên 3.20)
  const [useMin, setUseMin] = useState(false);
  const minTarget = Math.max(0.1, Math.round((settings.targetGpa - 0.005) * 1000) / 1000);
  const target = useMin ? minTarget : settings.targetGpa;
  const pStd = useMemo(() => plan(planAttempts, settings.retakePolicy, settings.targetGpa, total, earned), [planAttempts, settings.retakePolicy, settings.targetGpa, total, earned]);
  const pMin = useMemo(() => plan(planAttempts, settings.retakePolicy, minTarget, total, earned), [planAttempts, settings.retakePolicy, minTarget, total, earned]);
  const p = useMin ? pMin : pStd;
  const enrolling = enrollingCredits(attempts, settings.retakePolicy);
  const counted = withOngoing ? ongoing.length : 0;
  // Ngưỡng tín chỉ rớt 5%: mục tiêu Giỏi / Xuất sắc bị hạ một bậc nếu vượt (Khá không bị hạ)
  const dc = degreeClass(attempts, s.gpa, total);
  const highGoal = settings.targetGpa >= 3.2;

  const [tab, setTab] = useState<'mix' | 'improve'>('mix');
  const side = p.status === 'ok' ? tab : 'improve';
  const need = p.requiredAvg;

  const stepGoal = (d: number) => onSettings({ targetGpa: Math.min(4, Math.max(0.1, Math.round((settings.targetGpa + d) * 100) / 100)) });

  const goalCard = (
    <div className="card">
      <CardTitle hint={<>
        <p className="hhead">{t('Cách tính mục tiêu')}</p>
        <ul>
          <li><b>{t('Mốc {a}', { a: fmt(settings.targetGpa) })}:</b> {t('chắc chắn đạt mục tiêu.')}</li>
          <li><b>{t('Mốc {b}', { b: fmt(minTarget, 3) })}:</b> {t('mức tối thiểu để GPA làm tròn 2 chữ số thành {a}. Chỉ đúng nếu trường làm tròn như vậy (chưa xác nhận), nên không phải mức an toàn.', { a: fmt(settings.targetGpa) })}</li>
          <li><b>{t('Công thức')}:</b> {t('(GPA hiện tại × tín chỉ đã tính + điểm TB cần × tín chỉ còn lại) ÷ tổng tín chỉ = GPA mục tiêu.')}</li>
          <li>{t('App giải ngược ra “điểm TB cần đạt” cho các tín chỉ còn lại.')}</li>
        </ul></>}>{t('GPA mục tiêu')}</CardTitle>
      <div className="goal-main">
        <div className="goal-gpa">
          <span className="goal-lbl">{t('GPA mục tiêu (0–4)')}</span>
          <div className="stepper">
            <button type="button" aria-label="−" disabled={settings.targetGpa <= 0.1} onClick={() => stepGoal(-0.05)}>−</button>
            <input id="goal-gpa" type="number" min={0.1} max={4} step={0.05} value={settings.targetGpa}
              onChange={(e) => { const v = parseFloat(e.target.value); if (v > 0 && v <= 4) onSettings({ targetGpa: v }); }} />
            <button type="button" aria-label="+" disabled={settings.targetGpa >= 4} onClick={() => stepGoal(0.05)}>+</button>
          </div>
          <span className="tagx goal-class">{t(classify(settings.targetGpa))}</span>
        </div>
        <label className="goal-credits">{t('Tổng tín chỉ chương trình')}
          <input type="number" min={1} max={300} value={total} disabled={fromProgram} title={fromProgram ? t('Lấy từ chương trình đào tạo đã nhập') : undefined}
            onChange={(e) => { const v = parseInt(e.target.value, 10); if (v > 0) onSettings({ totalCredits: v }); }} />
        </label>
      </div>
      <div className="gscale" aria-hidden="true">
        <div className="gscale-track"><i style={{ width: `${(settings.targetGpa / 4) * 100}%` }} /></div>
        {CLASSIFICATIONS.filter((c) => c.min >= 2.5).map((c) => (
          <span key={c.label} className="gscale-tick" style={{ left: `${(c.min / 4) * 100}%` }}><em>{fmt(c.min, 1)}</em></span>
        ))}
      </div>
      <div className="presets">
        {CLASSIFICATIONS.filter((c) => c.min >= 2.5).map((c) => (
          <button key={c.label} type="button" className={`chip btn${settings.targetGpa === c.min ? ' on' : ''}`} onClick={() => onSettings({ targetGpa: c.min })}>{t(c.label)} <b>{fmt(c.min, 1)}</b></button>
        ))}
      </div>
      <label className="switch"><input type="checkbox" checked={useMin} onChange={(e) => setUseMin(e.target.checked)} />
        <span className="switch-ui" />
        <span className="switch-txt">{t('Tính theo mốc tối thiểu {b} (chưa xác nhận)', { b: fmt(minTarget, 3) })}</span></label>
      {ongoing.length > 0 && <label className="switch"><input type="checkbox" checked={withOngoing} onChange={(e) => setWithOngoing(e.target.checked)} />
        <span className="switch-ui" />
        <span className="switch-txt">{t('Tính cả điểm dự kiến của {n} môn đang học', { n: ongoing.length })}</span></label>}
    </div>
  );

  if (s.gpa === null) return <div className="stack">{goalCard}<div className="card"><p className="muted">{t('Hãy nhập điểm các môn đã học ở trang “Bảng điểm” trước.')}</p></div></div>;

  return (
    <div className="split">
      <div className="stack split-side">
        {goalCard}
        <div className={`hero${p.status === 'impossible' ? ' bad' : p.status === 'achieved' ? ' good' : ''}`}>
          <span className="k">{p.status === 'no-credits' ? t('Đã đủ tín chỉ chương trình') : t('Điểm TB cần đạt cho {n} tín chỉ còn lại', { n: p.remainingCredits })}</span>
          <span className="v">{need === null || p.status === 'no-credits' ? '—' : need <= 0 ? t('Đã đạt') : <>{fmt(need, 3)}<small> / 4</small></>}</span>
          {p.status === 'ok' && need !== null && <span className="sub">{letterNear(need)} <span className={`tagx ${hardness(need).cls}`}>{t(hardness(need).label)}</span></span>}
          <div className="hero-rows">
            <div><span>{t('GPA hiện tại')}</span><b>{fmt(s.gpa)}</b> <small>{t(classify(s.gpa))}</small></div>
            <div><span>{t('GPA mục tiêu')}</span><b>{fmt(target, useMin ? 3 : 2)}</b> <small>{t(classify(settings.targetGpa))}</small></div>
            <div><span>{t('Tín chỉ còn lại')}</span><b>{p.remainingCredits}</b> <small>/ {total}</small></div>
            {p.maxPossibleGpa !== null && p.status !== 'no-credits' && <div><span>{t('GPA tối đa (toàn A)')}</span><b>{fmt(p.maxPossibleGpa)}</b></div>}
          </div>
          <span className="foot">{t('đã tích lũy {n} tín chỉ', { n: prog ? prog.earned : s.passedCredits })}{counted > 0 ? ' · ' + t('đã tính {n} môn đang học theo điểm dự kiến', { n: counted }) : enrolling > 0 && ' · ' + t('{e} đang học → sau kỳ này còn {r}', { e: enrolling, r: Math.max(0, p.remainingCredits - enrolling) })}</span>
          {useMin && pStd.requiredAvg !== null && pMin.requiredAvg !== null && pStd.status !== 'no-credits' && <span className="foot">{fmt(settings.targetGpa)}: {pStd.requiredAvg <= 0 ? t('Đã đạt') : fmt(pStd.requiredAvg, 3)} · {fmt(minTarget, 3)}: {pMin.requiredAvg <= 0 ? t('Đã đạt') : fmt(pMin.requiredAvg, 3)}</span>}
        </div>
        {highGoal && dc.exceeded && <p className="warnbox">{t('Bạn đã có {n} tín chỉ chưa qua môn, vượt ngưỡng {v} tín chỉ (5%): dù GPA đạt {g}, bằng {c} vẫn bị hạ một bậc.', { n: dc.failedCredits, v: dc.limit, g: fmt(settings.targetGpa), c: t(classify(settings.targetGpa)) })}</p>}
        {highGoal && !dc.exceeded && dc.failedCredits > 0 && <p className="note">{t('Đã có {n}/{v} tín chỉ chưa qua môn: rớt thêm quá {m} tín chỉ nữa thì bằng {c} bị hạ một bậc.', { n: dc.failedCredits, v: dc.limit, m: dc.limit - dc.failedCredits, c: t(classify(settings.targetGpa)) })}</p>}
        {p.status === 'no-credits' && <p className="note">{t('Bạn đã đủ số tín chỉ của chương trình, GPA không còn thay đổi nếu không học lại/cải thiện.')}</p>}
        {p.status === 'achieved' && <p className="banner ok">{t('Đã chắc chắn đạt mục tiêu: dù các môn còn lại chỉ đạt mức thấp nhất thì GPA vẫn ≥ {target}.', { target: fmt(target, 3) })}</p>}
        {p.status === 'impossible' && <p className="warnbox err">{t('Không thể đạt {target} chỉ bằng các môn còn lại: cần trung bình {avg} > 4.0 (tối đa của thang điểm).', { target: fmt(target, 3), avg: fmt(need, 3) })} {t('Muốn cao hơn cần')} <b>{t('học cải thiện')}</b> {t('các môn điểm thấp (xem danh sách môn nên cải thiện).')}</p>}
        {p.status === 'ok' && need !== null && need > 3.75 && <p className="warnbox">{t('Chỉ cần một vài môn B+ là sẽ không kịp. Nên cân nhắc hạ mục tiêu hoặc kết hợp học cải thiện.')}</p>}
      </div>

      <div className="stack split-main">
        <div className="seg" role="group" aria-label={t('Công cụ')}>
          <button aria-pressed={side === 'mix'} disabled={p.status !== 'ok'} title={p.status !== 'ok' ? t('Chỉ dùng khi mục tiêu còn cần đạt và đạt được') : undefined} onClick={() => setTab('mix')}>{t('Phối điểm A')}</button>
          <button aria-pressed={side === 'improve'} onClick={() => setTab('improve')}>{t('Môn nên cải thiện')}</button>
        </div>
        {side === 'mix' && p.status === 'ok' && need !== null ? (
          <>
            <Mix remaining={p.remainingCredits} counted={p.base} points={p.points} target={target} />
            <div className="card"><h3>{t('Mức độ khó của điểm TB cần đạt')}</h3><HardnessLegend value={need} /></div>
          </>
        ) : <div className="card"><Improve data={data} /></div>}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import type { AppData } from '../engine';
import { GOAL_LETTERS, GRADE_SCALE, bandOf, classify, effectiveAttempts, effort, resolveGoal, summarize, whatIf } from '../engine';
import { fmt, fmtDelta } from '../format';
import { semesterShort } from '../engine';
import { EffortLegend } from './EffortLegend';
import { t } from '../i18n';

const pill = (l: string) => <span className={`pill l-${l.replace('+', 'p')}`}>{l}</span>;
const minOf = (l: string) => GRADE_SCALE.find((b) => b.letter === l)!.min;
const LEVEL_TXT = ['Dễ', 'Vừa sức', 'Cần cố gắng'];

interface Cand { id: string; code?: string; name: string; credits: number; score: number; letter: string; semester: string; options: { letter: string; level: number; gain: number }[] }

/**
 * Đề xuất các môn đã có điểm nên cải thiện: với mỗi môn, chỉ liệt kê các mức điểm “khả thi”
 * (điểm tổng kết cần đạt không vượt điểm TB hệ 10 hiện tại quá 1,5 điểm), kèm GPA tăng thêm.
 * Tích chọn nhiều môn thì cộng dồn. Học cải thiện lấy lần cao nhất nên điểm cũ được thay bằng điểm mới, không cộng trùng tín chỉ.
 */
export function Improve({ data }: { data: AppData }) {
  const { attempts, settings } = data;
  const policy = settings.retakePolicy;
  const base = useMemo(() => summarize(attempts, policy), [attempts, policy]);
  const [ticked, setTicked] = useState<string[]>([]);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [withOngoing, setWithOngoing] = useState(true);
  const [all, setAll] = useState(false);

  const ongoing = useMemo(() => attempts.filter((a) => a.inCumulative && a.score === null && !a.excluded && a.credits > 0).flatMap((a) => { const g = resolveGoal(a); return g.score === null ? [] : [{ attemptId: a.id, newScore: g.score }]; }), [attempts]);
  const ongoingOn = withOngoing ? ongoing : [];

  const cands = useMemo<Cand[]>(() => {
    if (base.gpa === null) return [];
    const avg = base.avg10;
    const out: Cand[] = [];
    for (const a of effectiveAttempts(attempts, policy)) {
      const cur = a.score as number, curPoint = bandOf(cur).point;
      const seen = new Set<string>();
      const options = GOAL_LETTERS.filter((l) => { const b = GRADE_SCALE.find((x) => x.letter === l)!; if (b.point <= curPoint || minOf(l) <= cur || seen.has(l)) return false; seen.add(l); return true; })
        .map((l) => ({ letter: l, level: effort(minOf(l), avg).level, gain: whatIf(attempts, policy, [{ attemptId: a.id, newScore: minOf(l) }]).delta }))
        .filter((o) => o.level <= 2).sort((x, y) => x.gain - y.gain || minOf(x.letter) - minOf(y.letter));
      if (options.length) out.push({ id: a.id, code: a.code, name: a.name, credits: a.credits, score: cur, letter: bandOf(cur).letter, semester: a.semester, options });
    }
    return out.sort((x, y) => y.options[y.options.length - 1].gain - x.options[x.options.length - 1].gain);
  }, [attempts, policy, base]);

  const shown = all ? cands : cands.slice(0, 10);
  const chosen = (c: Cand) => c.options.find((o) => o.letter === pick[c.id]) ?? c.options[c.options.length - 1];

  const calc = useMemo(() => {
    const changes = [...ongoingOn];
    let prev = whatIf(attempts, policy, changes).after.gpa ?? base.gpa ?? 0;
    const start = prev;
    const rows = new Map<string, { run: number; step: number }>();
    for (const c of cands) {
      if (!ticked.includes(c.id)) continue;
      changes.push({ attemptId: c.id, newScore: minOf(chosen(c).letter) });
      const run = whatIf(attempts, policy, changes).after.gpa ?? prev;
      rows.set(c.id, { run, step: run - prev }); prev = run;
    }
    const fin = whatIf(attempts, policy, changes);
    return { rows, start, fin };
  }, [attempts, policy, cands, ticked, pick, ongoingOn, base.gpa]); // eslint-disable-line react-hooks/exhaustive-deps

  if (base.gpa === null) return null;
  const nTick = ticked.filter((id) => cands.some((c) => c.id === id)).length;
  const after = calc.fin.after;

  return (
    <div className="improve">
      <h4>{t('Môn nên cân nhắc cải thiện')}</h4>
      <p className="muted small">{t('Sắp theo mức GPA tăng thêm (ở mức khả thi cao nhất của từng môn). Mức chữ “khả thi” là mức có điểm tổng kết cần đạt không vượt điểm trung bình hệ 10 hiện tại của bạn ({avg}) quá 1,5 điểm. Tích chọn các môn để xem GPA cộng dồn. Học cải thiện lấy lần điểm cao nhất, nên điểm cũ được thay bằng điểm mới và tín chỉ không bị cộng hai lần. Đây là ước tính từ điểm tổng kết, chưa tính độ khó thực tế của từng môn.', { avg: fmt(base.avg10, 2) })}</p>
      {ongoing.length > 0 && <label className="check small"><input type="checkbox" checked={withOngoing} onChange={(e) => setWithOngoing(e.target.checked)} /> {t('Cộng cả {n} môn đang học đã tích “Tính vào GPA tích lũy chung” (trang Mục tiêu → Tính điểm môn đang học)', { n: ongoing.length })}</label>}
      {cands.length === 0 ? <p className="muted">{t('Không có môn nào còn cải thiện được ở mức khả thi.')}</p> : (
        <>
          <div className="tblwrap"><table className="tbl compact grid">
            <thead><tr><th className="center" title={t('Tích để cộng dồn')}>{t('Chọn')}</th><th>{t('Mã môn - Tên môn')}</th><th className="num">{t('Tín chỉ')}</th><th>{t('Điểm hiện tại')}</th><th>{t('Cải thiện lên')}</th><th className="num" title={t('GPA tăng thêm nếu chỉ riêng môn này')}>{t('Cộng thêm (riêng)')}</th><th className="num" title={t('GPA sau khi cộng dồn các môn đã chọn từ trên xuống')}>{t('GPA cộng dồn')}</th></tr></thead>
            <tbody>{shown.map((c) => {
              const o = chosen(c), r = calc.rows.get(c.id);
              return (
                <tr key={c.id}>
                  <td className="center"><input type="checkbox" checked={ticked.includes(c.id)} onChange={(e) => setTicked((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)))} aria-label={t('Chọn cải thiện {name}', { name: c.name })} /></td>
                  <td>{c.code ? <b>{c.code} - </b> : null}{c.name} <small className="muted">({semesterShort(c.semester)})</small></td>
                  <td className="num">{c.credits}</td>
                  <td>{fmt(c.score, 1)} {pill(c.letter)}</td>
                  <td><select className="mini" value={o.letter} onChange={(e) => setPick((p) => ({ ...p, [c.id]: e.target.value }))} aria-label={t('Mức cải thiện {name}', { name: c.name })}>
                    {c.options.map((x) => <option key={x.letter} value={x.letter}>{x.letter} · {t('cần')} ≥ {fmt(minOf(x.letter), 1)} ({t(LEVEL_TXT[x.level])})</option>)}</select></td>
                  <td className="num ok">{fmtDelta(o.gain, 3)}</td>
                  <td className="num">{r ? <>{fmt(r.run, 3)} <small className="muted">({fmtDelta(r.step, 3)})</small></> : <span className="muted">—</span>}</td>
                </tr>);
            })}</tbody>
          </table></div>
          <EffortLegend avg10={base.avg10} what={t('điểm tổng kết cần đạt')} />
          {cands.length > 10 && <button className="ghost" onClick={() => setAll((v) => !v)}>{all ? t('Chỉ hiện 10 môn đầu') : t('Hiện tất cả {length} môn', { length: cands.length })}</button>}
          {(nTick > 0 || ongoingOn.length > 0) && (
            <div className="improve-sum">
              <div>{t('GPA hiện tại:')} <b>{fmt(base.gpa, 3)}</b> ({t(classify(base.gpa))})</div>
              {ongoingOn.length > 0 && <div>{t('+ Cộng {n} môn đang học đã tích:', { n: ongoingOn.length })} <b>{fmt(calc.start, 3)}</b> <span className={calc.start - base.gpa >= 0 ? 'ok' : 'err'}>({fmtDelta(calc.start - base.gpa, 3)})</span></div>}
              {nTick > 0 && <div>{t('+ Cải thiện {n} môn đã chọn:', { n: nTick })} <b>{fmt(after.gpa, 3)}</b> <span className={(after.gpa ?? 0) - calc.start >= 0 ? 'ok' : 'err'}>({fmtDelta((after.gpa ?? 0) - calc.start, 3)})</span></div>}
              <div className="total">{t('Kết quả:')} <b>{fmt(after.gpa, 3)}</b> ({t(after.classification ?? '—')}), {t('tổng cộng thêm')} <b className={calc.fin.delta >= 0 ? 'ok' : 'err'}>{fmtDelta(calc.fin.delta, 3)}</b> {t('so với hiện tại.')}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

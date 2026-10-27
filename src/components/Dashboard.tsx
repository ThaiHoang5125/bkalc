import { useMemo, useState, type ReactNode } from 'react';
import type { AppData, Attempt } from '../engine';
import { accumulatedCredits, bySemester, canonSemester, classify, computeProgress, degreeClass, distribution, effectiveTotal, findConflicts, improvementSuggestions, isUndeclared, keyer, overCapSemesters, plan as goalPlan, planWarnings, semesterAt, semesterLabel, semesterShort, summarize, targetFor } from '../engine';
import { fmt } from '../format';
import { OfficialCheck } from './Official';
import { CardTitle, PageHeader } from './ui';
import { backupDays, snoozeBackup } from '../backup';
import type { Go } from '../App';
import { t } from '../i18n';

const r2 = (v: number) => Math.round((v + 1e-9) * 100) / 100;

/** C6: Kỳ này đạt trung bình X (thang 4) với N tín chỉ thì GPA tích lũy thành bao nhiêu. */
function QuickCalc({ gpa, credits, points, target }: { gpa: number | null; credits: number; points: number; target: number }) {
  const [cr, setCr] = useState('15');
  const [avg, setAvg] = useState('3.2');
  const n = Math.max(0, Math.min(40, parseFloat(cr) || 0)), a = Math.max(0, Math.min(4, parseFloat(avg.replace(',', '.')) || 0));
  const next = credits + n > 0 ? (points + n * a) / (credits + n) : null;
  return (
    <div className="card">
      <CardTitle hint={<>
        <p className="hhead">{t('Tính nhanh')}</p>
        <ul>
          <li>{t('Ước tính nhanh GPA tích lũy sau kỳ này.')}</li>
          <li>{t('Giả định mọi môn kỳ này đều tính vào GPA.')}</li>
          <li>{t('Không có môn học lại.')}</li>
        </ul></>}>{t('Tính nhanh GPA tích lũy dự kiến')}</CardTitle>
      <div className="form-row">
        <label>{t('Số tín chỉ kỳ này')}<input type="number" min={0} max={40} className="w120" value={cr} onChange={(e) => setCr(e.target.value)} /></label>
        <label>{t('GPA kỳ này (thang 4)')}<input type="number" min={0} max={4} step={0.1} className="w120" value={avg} onChange={(e) => setAvg(e.target.value)} /></label>
      </div>
      {next !== null && <p>{t('GPA tích lũy sẽ là')} <b>{fmt(next)}</b>{gpa !== null && <> ({next - gpa >= 0 ? '+' : '−'}{fmt(Math.abs(next - gpa), 3)} {t('so với hiện tại')})</>} · {r2(next) >= target ? <span className="ok">{t('đạt mục tiêu {target}', { target: fmt(target) })}</span> : <span className="warnnote">{t('còn thiếu {v1} so với mục tiêu {target}', { v1: fmt(target - r2(next), 2), target: fmt(target) })}</span>}</p>}
    </div>
  );
}

/** Họa tiết mạch điện mờ làm nền banner hồ sơ. */
function Circuit() {
  return (
    <svg className="profile-bg" viewBox="0 0 600 240" preserveAspectRatio="xMaxYMid slice" aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M600 30H500l-30 30H380M600 90H520l-20 20H430l-25 25" />
        <path d="M600 160H470l-35 35H350M600 215H540l-20-20H460" />
        <path d="M300 20H250l-25 25H160M330 235H280l-30-30H190" />
      </g>
      <g fill="currentColor">
        {[[380, 60], [430, 110], [405, 135], [350, 195], [460, 195], [160, 45], [190, 205]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" />)}
      </g>
    </svg>
  );
}

function ProfileBadge() {
  return (
    <svg className="profile-badge" viewBox="0 0 120 120" aria-hidden>
      <defs><linearGradient id="pbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFD35C" /><stop offset="1" stopColor="#F29A1F" /></linearGradient></defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" />
      <circle cx="60" cy="60" r="48" fill="url(#pbg)" />
      <circle cx="60" cy="48" r="13" fill="#1B2F66" />
      <path d="M32 92c3-16 15-23 28-23s25 7 28 23a48 48 0 0 1-56 0z" fill="#1B2F66" />
      <path d="M60 22 26 38l34 16 34-16z" fill="#2457B8" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      <path d="M42 46v9c0 5 8 9 18 9s18-4 18-9v-9l-18 8z" fill="#1B3F8F" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M94 38v14" stroke="#FFD35C" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Banner hồ sơ sinh viên ở đầu Tổng quan: thông tin cá nhân bên trái, chỉ số học tập bên phải. */
function ProfileBanner({ st, gpa, earned, total, classification, dc, action }: {
  st: AppData['student']; gpa: number | null; earned: number; total: number; classification: string | null; dc: ReturnType<typeof degreeClass>; action: ReactNode;
}) {
  const info: [string, string | undefined][] = [[t('Mã số sinh viên'), st?.id], [t('Lớp'), st?.className], [t('Khoa'), st?.faculty]];
  const updated = [st?.transcriptUpdated && t('Bảng điểm cập nhật {transcriptUpdated}', { transcriptUpdated: st.transcriptUpdated }), st?.progressUpdated && t('Tiến độ cập nhật {progressUpdated}', { progressUpdated: st.progressUpdated })].filter(Boolean).join(' · ');
  const failSub = dc.exceeded ? t('Đã vượt ngưỡng 5% ({v1} tín chỉ)', { v1: dc.limit }) : t('Ngưỡng 5% = {v1} tín chỉ · chưa vượt', { v1: dc.limit });
  const finalSub = dc.downgraded ? t('Theo GPA: {byGpa}, hạ 1 bậc do tín chỉ rớt vượt 5%', { byGpa: t(dc.byGpa ?? '—') }) : dc.exceeded ? t('Vượt 5%, bằng Khá không bị hạ') : t('Chưa vượt 5%, không bị hạ bằng');
  return (
    <section className="profile" aria-label={t('Hồ sơ sinh viên')}>
      <Circuit />
      <div className="profile-main">
        <ProfileBadge />
        <div className="profile-info">
          <span className="profile-eyebrow">{t('Hồ sơ sinh viên')}</span>
          <h1>{st?.name || t('Tổng quan')}</h1>
          <div className="profile-grid">
            {info.filter(([, v]) => v).map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
            {st?.major && <div className="wide"><small>{t('Chương trình / ngành')}</small><b>{st.major}</b></div>}
          </div>
          {updated && <p className="profile-upd">{updated}</p>}
          <div className="profile-act">{action}</div>
        </div>
      </div>
      <div className="profile-stats">
        <div className="pstat"><small>{t('GPA tích lũy')}</small><b className="gold">{fmt(gpa)}</b><span>{t('thang 4')}</span></div>
        <div className="pstat"><small>{t('Tín chỉ tích lũy')}</small><b className="gold">{earned}</b><span>/ {total}</span></div>
        <div className="pstat"><small>{t('Học lực')}</small><b className="gold">{t(classification ?? '—')}</b><span>{t('theo GPA tích lũy')}</span></div>
        <div className="pstat wide2"><small>{t('Số tín chỉ chưa qua môn')}</small><b>{dc.failedCredits}<i> {t('tín chỉ')}</i></b><span>{failSub}</span></div>
        <div className="pstat wide2"><small>{t('Xếp loại cuối cùng')}</small><b>{t(dc.final ?? '—')}</b><span>{finalSub}</span></div>
      </div>
    </section>
  );
}

/** Mô tả tiến độ điểm thành phần của một môn đang học. */
function courseLine(a: Attempt): { line: string; pct: number } {
  const cs = a.components ?? [];
  if (!cs.length) return { line: t('Chưa nhập điểm thành phần'), pct: 0 };
  const done = cs.filter((c) => c.score !== null);
  const w = done.reduce((s, c) => s + c.weight, 0);
  const avg = w > 0 ? done.reduce((s, c) => s + (c.weight * (c.score as number)) / w, 0) : null;
  const head = t('Đã có {k}/{n} cột điểm', { k: done.length, n: cs.length });
  const sum = cs.reduce((s, c) => s + c.weight, 0);
  const pct = cs.length ? (done.length / cs.length) * 100 : 0;
  if (a.goal && Math.abs(sum - 100) < 0.01 && done.length > 0 && done.length < cs.length) {
    const r = targetFor(cs, a.goal);
    if (r.state === 'ok' && r.needed !== null) return { line: `${head} · ${t('cần {v} ở phần còn lại để đạt {g}', { v: fmt(r.needed, 1), g: a.goal })}`, pct };
  }
  return { line: avg === null ? head : `${head} · ${t('TB hiện tại {v}', { v: fmt(avg, 1) })}`, pct };
}

interface Row { id: string; n: number; err?: boolean; text: string; small?: string; link?: [string, () => void]; extra?: [string, () => void] }

export type DashView = 'summary' | 'charts' | 'tools';

export function Dashboard({ data, go, view, setView }: { data: AppData; go: Go; view: DashView; setView: (v: DashView) => void }) {
  const { attempts, settings } = data;
  const [, bump] = useState(0);
  const s = useMemo(() => summarize(attempts, settings.retakePolicy), [attempts, settings.retakePolicy]);
  const sems = useMemo(() => bySemester(attempts, settings.retakePolicy), [attempts, settings.retakePolicy]);
  const dist = useMemo(() => distribution(attempts, settings.retakePolicy), [attempts, settings.retakePolicy]);
  const maxCr = Math.max(1, ...dist.map((d) => d.credits));
  const improve = useMemo(() => improvementSuggestions(attempts, settings.retakePolicy, 'A', 3), [attempts, settings.retakePolicy]);
  const total = effectiveTotal(settings, data.official);
  const earned = accumulatedCredits(attempts, settings.retakePolicy);
  const dc = degreeClass(attempts, s.gpa, total);
  const progress = useMemo(() => (data.program ? computeProgress(data.program, attempts, settings.retakePolicy, data.freeCourses) : null), [data.program, attempts, settings.retakePolicy, data.freeCourses]);
  const goal = useMemo(() => goalPlan(attempts, settings.retakePolicy, settings.targetGpa, total, isUndeclared(data.official) ? undefined : progress?.earned), [attempts, settings.retakePolicy, settings.targetGpa, total, progress, data.official]);

  const nowSem = semesterLabel(semesterAt());
  const ongoing = useMemo(() => {
    const k = keyer(attempts);
    const seen = new Set<string>();
    const list = attempts.filter((a) => a.score === null && !a.special && !a.excluded && a.credits > 0 && !seen.has(k(a)) && (seen.add(k(a)), true));
    const here = list.filter((a) => canonSemester(a.semester) === nowSem);
    return here.length ? here : list;
  }, [attempts, nowSem]);

  const warns = useMemo(() => planWarnings(data), [data]);
  const over = useMemo(() => overCapSemesters(data), [data]);
  const conflicts = useMemo(() => findConflicts(data.timetable?.current ?? []), [data.timetable]);
  const days = backupDays(attempts.length > 0);

  const rows: Row[] = [];
  if (dc.exceeded) rows.push({ id: 'fail5', n: 1, text: t('Tín chỉ chưa qua môn {n} đã vượt ngưỡng 5% ({v} tín chỉ)', { n: dc.failedCredits, v: dc.limit }) + (dc.downgraded ? ' · ' + t('xếp loại cuối cùng: {c}', { c: dc.final }) : ''), link: [t('Xem bảng điểm →'), () => go('transcript')] });
  for (const o of over) rows.push({ id: 'cap' + o.sem, n: 1, text: t('Kế hoạch {sem} vượt {cap} tín chỉ (đang {n})', { sem: semesterShort(o.sem), cap: o.cap, n: o.credits }), link: [t('Mở Kế hoạch →'), () => go('semplan')] });
  if (warns.length) {
    const list = [...new Set(warns.map((w) => `${w.code} (${semesterShort(w.sem)})`))];
    rows.push({ id: 'plan', n: warns.length, text: t('Kế hoạch có {n} lưu ý về chuẩn đăng ký môn', { n: warns.length }), small: list.slice(0, 5).join(', ') + (list.length > 5 ? '…' : ''), link: [t('Mở Kế hoạch →'), () => go('semplan')] });
  }
  if (conflicts.length) rows.push({ id: 'tt', n: conflicts.length, err: true, text: t('Thời khóa biểu có {n} cặp môn trùng giờ: {l}', { n: conflicts.length, l: conflicts.map((c) => `${c.a.code}/${c.b.code}`).join(', ') }), link: [t('Mở Xếp lịch →'), () => go('timetable', '2')] });
  if (days >= 30) rows.push({ id: 'backup', n: 1, text: t('Chưa sao lưu dữ liệu {n} ngày', { n: days }), link: [t('Sao lưu ngay →'), () => go('data', 'data')], extra: [t('Nhắc lại sau 1 tuần'), () => { snoozeBackup(); bump((x) => x + 1); }] });
  const count = rows.reduce((a, r) => a + r.n, 0);

  const st = data.student;
  const sub = [st?.name, st?.id && `${t('MSSV')} ${st.id}`, st?.major, st?.transcriptUpdated && t('cập nhật từ bảng điểm ngày {d}', { d: st.transcriptUpdated })].filter(Boolean).join(' · ') || t('Điểm tích lũy & tiến độ học tập');
  const head = <PageHeader title={t('Tổng quan')} sub={sub} primary={<button className="primary" onClick={() => go('data', 'data')}>{t('Nhập bảng điểm')}</button>} />;

  if (attempts.length === 0) {
    return (
      <div className="page">{head}
        <div className="card empty"><h2>{t('Chào mừng!')}</h2><p>{t('Chưa có dữ liệu. Nhập PDF Bảng điểm và Tiến độ từ cổng sinh viên ở mục “Dữ liệu & cài đặt”, hoặc tự thêm môn ở trang “Bảng điểm”.')}</p>
          <button className="primary" onClick={() => go('data', 'data')}>{t('Nhập dữ liệu')}</button>{' '}<button onClick={() => go('guide')}>{t('Xem hướng dẫn')}</button></div>
      </div>);
  }

  const series = sems.filter((r) => r.gpa !== null).slice(-10);
  const goalVal = goal.status === 'achieved' ? t('Đã đạt') : goal.status === 'no-credits' || goal.requiredAvg === null || goal.status === 'impossible' ? '—' : fmt(goal.requiredAvg, 2);
  const goalSub = goal.status === 'achieved' ? t('chắc chắn đạt dù các môn còn lại ở mức thấp nhất') : goal.status === 'no-credits' ? t('đã đủ tín chỉ chương trình') : goal.status === 'impossible' ? t('không thể chỉ bằng {n} tín chỉ còn lại', { n: goal.remainingCredits }) : t('điểm TB cần đạt cho {n} tín chỉ còn lại', { n: goal.remainingCredits });

  return (
    <div className="page">
      <ProfileBanner st={st} gpa={s.gpa} earned={earned} total={total} classification={s.classification} dc={dc} action={<button onClick={() => go('data', 'data')}>{t('Nhập bảng điểm')}</button>} />
      <div className="seg" role="group" aria-label={t('Chế độ xem')}>
        {([['summary', t('Tóm tắt')], ['charts', t('Biểu đồ')], ['tools', t('Công cụ')]] as [DashView, string][]).map(([k, l]) => <button key={k} aria-pressed={view === k} onClick={() => setView(k)}>{l}</button>)}
      </div>

      {view === 'summary' && <section className="kpis" aria-label={t('Chỉ số chính')}>
        <div className="card stat kpi"><span className="k">{t('Đang học')}</span><span className="v">{ongoing.reduce((a, o) => a + o.credits, 0)}<small> {t('tín chỉ')}</small></span><span className="sub">{t('{n} môn', { n: ongoing.length })}{ongoing.length > 0 && ` · ${semesterShort(nowSem)}`}</span></div>
        {improve.length > 0 && (
          <div className="card stat kpi">
            <span className="k" title={t('Ước tính GPA tích lũy tăng thêm nếu chỉ học cải thiện riêng môn đó và đạt A; môn có nhiều tín chỉ và điểm thấp đứng đầu. Chỉ là gợi ý, chưa tính khả năng đạt điểm.')}>{t('Nên cải thiện (đạt A)')}</span>
            <div className="imp-list">
              {improve.map((m, i) => (
                <div key={m.attemptId} className="imp">
                  <span className="rank">{i + 1}</span>
                  <div><b title={m.name}>{m.name}</b><small>{m.credits} {t('tín chỉ')} · {m.currentLetter} → {m.targetLetter}</small></div>
                  <span className="gain">+{fmt(m.gain, 2)}</span>
                </div>))}
            </div>
          </div>)}
        <div className="card stat kpi goal"><span className="k">{t('Mục tiêu: {c} ({g})', { c: t(classify(settings.targetGpa)), g: fmt(settings.targetGpa) })}</span><span className="v">{goalVal}</span><span className="sub">{goalSub}</span></div>
      </section>}

      {view === 'summary' && rows.length > 0 && (
        <section className="attn" aria-label={t('Cần chú ý')}>
          <b>{t('Cần chú ý ({n})', { n: count })}</b>
          {rows.map((r) => (
            <div key={r.id} className={`attn-row${r.err ? ' err' : ''}`}>
              <span className="txt">{r.text}{r.small && <small>{r.small}</small>}</span>
              {r.link && <button className="linkbtn" onClick={r.link[1]}>{r.link[0]}</button>}
              {r.extra && <button className="linkbtn quiet" onClick={r.extra[1]}>{r.extra[0]}</button>}
            </div>))}
        </section>
      )}

      {view === 'summary' && (
        <section className="card colstack" aria-label={t('Học kỳ này')}>
          <div className="head-row"><h3 className="m0">{t('Học kỳ này')} · {semesterShort(nowSem)}</h3><button className="linkbtn small" onClick={() => go('goals', 'courses')}>{t('Tính điểm →')}</button></div>
          {ongoing.length === 0 ? <p className="muted">{t('Chưa có môn đang học.')}</p> : (
            <div className="curgrid">
              {ongoing.map((a) => {
                const c = courseLine(a);
                return (
                  <div className="curcourse" key={a.id}>
                    <div className="row"><b>{a.code ? a.code + ' ' : ''}{a.name}</b><span className="muted nowrap">{a.credits} {t('TC')}</span></div>
                    <span className="small muted">{c.line}</span>
                    <div className="bar"><i style={{ width: `${c.pct}%` }} /></div>
                  </div>);
              })}
            </div>)}
        </section>
      )}

      {view === 'charts' && (<div className="cols">
        <section className="card grow3" aria-label={t('GPA theo học kỳ')}>
          <div className="head-row mb"><h3 className="m0">{t('GPA theo học kỳ')}</h3><span className="small muted">{t('thang 4')}</span></div>
          {series.length === 0 ? <p className="muted">{t('Chưa có dữ liệu để vẽ biểu đồ.')}</p> : (
            <div className="hbars" role="img" aria-label={t('GPA theo học kỳ')}>
              {series.map((r, i) => (
                <div key={r.semester} className={`hbar${i === series.length - 1 ? ' last' : ''}`} title={`${semesterShort(r.semester)}: ${t('GPA kỳ')} ${fmt(r.gpa)} · ${t('tích lũy')} ${fmt(r.cumulativeGpa)}`}>
                  <span className="hl">{semesterShort(r.semester)}</span>
                  <span className="ht"><i style={{ width: `${Math.max(2, ((r.gpa ?? 0) / 4) * 100)}%` }} /></span>
                  <span className="hv">{fmt(r.gpa)}</span>
                </div>))}
            </div>)}
        </section>
        <div className="card grow2">
          <CardTitle>{t('Phân bố điểm chữ (theo tín chỉ)')}</CardTitle>
          <div className="dist">
            {dist.map((d) => (
              <div className="drow" key={d.letter}>
                <b>{d.letter}</b>
                <div className="bar wide"><i className={`l-${d.letter.replace('+', 'p')}`} style={{ width: `${(d.credits / maxCr) * 100}%` }} /></div>
                <span>{t('{credits} tín chỉ · {courses} môn', { credits: d.credits, courses: d.courses })}</span>
              </div>))}
          </div>
        </div>
      </div>)}

      {view === 'tools' && (
        <div className="colstack">
          <QuickCalc gpa={s.gpa} credits={s.countedCredits} points={s.qualityPoints} target={settings.targetGpa} />
          <OfficialCheck data={data} />
        </div>
      )}
    </div>
  );
}

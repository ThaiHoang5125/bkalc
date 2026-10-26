import { useMemo, useState } from 'react';
import type { AppData } from '../engine';
import { MAX_YEARS, STANDARD_YEARS, autoPlan, bandOf, capOf, computeProgress, fillPlaceholders, isInternship, isPlaceholder, PLACEHOLDER_NAME, graduationSemester, isSummer, isUndeclared, semesterDisplay, semesterShort, summarize, unmet, withPolitical, isCertCode, planInfo, planWarnings, needCredits, TTNT_PCT } from '../engine';
import type { ElectiveNeed, PlanCourse, PlanData, PlanItem } from '../engine';
import { canonSemester } from '../engine';
import { COURSE_DB, PROGRAMS } from '../data/programs';
import { TEACHING_PLAN } from '../data/teachingPlan';
import { guessProgram } from './LookupCard';
import { fmt } from '../format';
import { ConfirmButton } from './ConfirmButton';
import { Hint, Menu, PageHeader, useToast } from './ui';
import { warnText } from './warnText';
import type { Go } from '../App';
import { t } from '../i18n';

const HAVE_YEARS = [...new Set(PROGRAMS.map((p) => p.year))].sort();
const baseYear = (y: number) => [...HAVE_YEARS].reverse().find((v) => v <= y) ?? HAVE_YEARS[0];
const MAJORS = [...new Map(PROGRAMS.map((p) => [p.major, p.majorName])).entries()];

const KIND_NOTE: Record<string, string> = {
  TQ: 'tiên quyết: phải học và đạt ở kỳ trước',
  HT: 'học trước: phải học xong ở kỳ trước',
  SH: 'song hành: học cùng kỳ hoặc đã học trước',
  SHT: 'song hành hoặc học trước',
};
/** "EE3065 (SH)" → "EE3065 · song hành: học cùng kỳ hoặc đã học trước" */
const condText = (s: string) => {
  const m = s.match(/^(\S+) \((\w+)\)$/);
  const nm = m ? COURSE_DB[m[1]]?.n : undefined;
  return m ? `${m[1]}${nm ? ' ' + nm : ''} · ${t(KIND_NOTE[m[2]] ?? m[2])}` : s;
};

function Stat({ k, v, unit, desc, tone }: { k: string; v: number | string; unit?: string; desc: string; tone?: 'warn' | 'ok' }) {
  return (
    <div className={`card stat${tone ? ' ' + tone : ''}`}>
      <span className="k">{k}</span>
      <span className="v">{v}{unit && <small> {unit}</small>}</span>
      <span className="sub">{desc}</span>
    </div>
  );
}

export function SemPlan({ data, onPlan, go }: { data: AppData; onPlan: (fn: (p: PlanData) => PlanData) => void; go: Go }) {
  const toast = useToast();
  const info = useMemo(() => planInfo(data), [data]);
  const { plan, cohort, labels, curIdx, firstFuture, passed, enrolled, earnedNow, enrolledCredits, total, credOf } = info;
  const guess = useMemo(() => guessProgram(data.student), [data.student]);
  const [major, setMajor] = useState(guess.major);
  const progYear = baseYear(cohort ?? guess.year);
  const undeclared = isUndeclared(data.official);
  const useForm = !!data.program && !undeclared;

  const prog = PROGRAMS.find((p) => p.year === progYear && p.major === major);
  const catalogCond = (code: string) => withPolitical(code, prog?.courses.find((c) => c[0] === code)?.[2] ?? '');

  const formProg = useMemo(() => (useForm && data.program ? computeProgress(data.program, data.attempts, data.settings.retakePolicy, data.freeCourses) : null), [useForm, data.program, data.attempts, data.settings.retakePolicy, data.freeCourses]);
  const courses = useMemo<PlanCourse[]>(() => {
    const out: PlanCourse[] = [];
    if (formProg) {
      for (const g of formProg.groups) for (const c of g.courses) if (c.status !== 'passed' && !isCertCode(c.course.code)) out.push({ code: c.course.code, name: c.course.name, credits: c.course.credits, cond: catalogCond(c.course.code), required: g.group.kind === 'required', group: g.group.name });
    } else if (prog) {
      for (const [code, gi, cond] of prog.courses) {
        if (passed.has(code)) continue;
        const g = prog.groups[gi];
        out.push({ code, name: COURSE_DB[code]?.n ?? code, credits: COURSE_DB[code]?.c ?? 0, cond, required: g?.kind === 'bb', group: g?.t });
      }
    }
    const seen = new Set<string>();
    return out.filter((c) => (seen.has(c.code) ? false : (seen.add(c.code), true)));
  }, [formProg, prog, passed]); // eslint-disable-line react-hooks/exhaustive-deps

  const placed = useMemo(() => {
    const m = new Map<string, number>();
    labels.forEach((l, i) => { if (i >= firstFuture) (plan.sems[l] ?? []).forEach((it) => m.set(it.code, i)); });
    return m;
  }, [labels, plan, firstFuture]);
  const ctx = useMemo(() => ({ passed, enrolled, placed, nowIdx: firstFuture }), [passed, enrolled, placed, firstFuture]);
  const plannedTotal = labels.slice(firstFuture).reduce((s, l) => s + credOf(l), 0);
  const missing = Math.max(0, total - earnedNow - enrolledCredits - plannedTotal);
  const grad = graduationSemester(earnedNow + enrolledCredits, labels.slice(firstFuture), plan, total);
  const gradYear = grad ? Math.floor(labels.indexOf(grad) / 3) + 1 : 0;

  // Chuẩn C_TTNT: thực tập ngoài trường cần tích lũy ≥ 65% số tín chỉ chương trình; tính cả các môn đang học và đã xếp ở các kỳ trước
  const ttntNeed = needCredits(TTNT_PCT, total);
  /** Cảnh báo chuẩn đăng ký (theo mã môn, thực tập, đồ án) gom theo học kỳ và mã môn */
  const warnsOf = useMemo(() => {
    const m = new Map<string, ReturnType<typeof planWarnings>>();
    for (const w of planWarnings(data)) m.set(`${w.sem}|${w.code}`, [...(m.get(`${w.sem}|${w.code}`) ?? []), w]);
    return m;
  }, [data]);
  const warnLines = (l: string, code: string) => (warnsOf.get(`${l}|${code}`) ?? []).map((w, k) => <span key={k} className="warnline">⚠ {warnText(w)}</span>);

  /** Môn có thể thêm vào kế hoạch: chưa học, chưa đang học, chưa xếp; môn bắt buộc đứng đầu */
  const candidates = useMemo(() => courses.filter((c) => !placed.has(c.code) && !enrolled.has(c.code)).sort((a, b) => Number(b.required) - Number(a.required)), [courses, placed, enrolled]);
  const requiredLeft = courses.filter((c) => c.required && !placed.has(c.code) && !enrolled.has(c.code));

  const setSem = (l: string, fn: (items: PlanItem[]) => PlanItem[]) => onPlan((p) => ({ ...p, sems: { ...p.sems, [l]: fn(p.sems[l] ?? []) } }));
  const add = (l: string, c: PlanCourse) => setSem(l, (it) => (it.some((x) => x.code === c.code) ? it : [...it, { code: c.code, name: c.name, credits: c.credits }]));
  const remove = (l: string, code: string) => setSem(l, (it) => it.filter((x) => x.code !== code));
  const move = (from: string, code: string, to: string) => onPlan((p) => {
    const item = (p.sems[from] ?? []).find((x) => x.code === code);
    if (!item) return p;
    return { ...p, sems: { ...p.sems, [from]: (p.sems[from] ?? []).filter((x) => x.code !== code), [to]: [...(p.sems[to] ?? []).filter((x) => x.code !== code), item] } };
  });
  /** Các nhóm tự chọn (tự chọn tự do, tự chọn chuyên ngành - nhóm A…) còn thiếu bao nhiêu tín chỉ sau khi trừ môn đã đạt, đang học và đã xếp */
  const electiveNeeds = (sems: Record<string, PlanItem[]>): ElectiveNeed[] => {
    const plannedCodes = new Set(labels.slice(firstFuture).flatMap((l) => (sems[l] ?? []).filter((x) => !isPlaceholder(x.code)).map((x) => x.code)));
    const out: ElectiveNeed[] = [];
    if (formProg) {
      for (const g of formProg.groups) {
        if (g.group.kind !== 'elective' || g.required <= 0) continue;
        const busy = g.courses.filter((c) => c.status === 'enrolled' || (c.status === 'todo' && plannedCodes.has(c.course.code))).reduce((a, c) => a + c.course.credits, 0);
        const left = g.required - g.earned - busy;
        if (left > 0) out.push({ name: g.group.name, credits: left });
      }
    } else if (prog) {
      prog.groups.forEach((g, gi) => {
        if (g.kind !== 'tc' || !g.req || (g.unit && g.unit !== 'tc')) return;
        const mine = prog.courses.filter((c) => c[1] === gi).map((c) => c[0]);
        const done = mine.filter((c) => passed.has(c) || enrolled.has(c) || plannedCodes.has(c)).reduce((a, c) => a + (COURSE_DB[c]?.c ?? 0), 0);
        if (g.req - done > 0) out.push({ name: g.t, credits: g.req - done });
      });
    }
    return out;
  };
  const runAuto = () => onPlan((p) => {
    const from = firstFuture + (curIdx >= 0 ? 1 : 0);
    const sems = autoPlan(courses, { passed, enrolled, placed: new Map(), nowIdx: firstFuture, baseEarned: earnedNow + enrolledCredits, internshipNeed: ttntNeed }, labels, p, from);
    const planned = labels.slice(firstFuture).reduce((acc, l) => acc + (sems[l] ?? []).reduce((a, x) => a + x.credits, 0), 0);
    return { ...p, sems: fillPlaceholders(sems, labels, from, Math.max(0, total - earnedNow - enrolledCredits - planned), p, electiveNeeds(sems)) };
  });
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [extraErr, setExtraErr] = useState('');
  const submitExtra = (l: string) => {
    const q = (extra[l] ?? '').trim();
    if (!q) return;
    const fold = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
    let c = (q.match(/^[A-Za-z]{2}\d{4}[A-Za-z]?/)?.[0] ?? '').toUpperCase();
    if (!c || !COURSE_DB[c]) {
      const hits = Object.entries(COURSE_DB).filter(([k, v]) => fold(v.n).includes(fold(q)) || k.includes(q.toUpperCase()));
      if (hits.length === 1) c = hits[0][0];
      else { setExtraErr(hits.length ? t('Có {n} môn khớp “{q}”, hãy chọn một môn trong danh sách gợi ý.', { n: hits.length, q }) : t('Không tìm thấy môn “{q}” trong danh mục.', { q })); return; }
    }
    const info = COURSE_DB[c];
    setExtraErr('');
    add(l, { code: c, name: info.n, credits: info.c, cond: catalogCond(c), required: false });
    setExtra({ ...extra, [l]: '' });
  };

  // Trình tự theo chương trình đào tạo: học kỳ chính thứ k của chương trình = k-th học kỳ không phải hè kể từ HK đầu của khóa
  const progTerm = (i: number) => (isSummer(labels[i]) ? 0 : labels.slice(0, i + 1).filter((l) => !isSummer(l)).length);
  const planCodes = (i: number) => TEACHING_PLAN[major]?.[progTerm(i) - 1] ?? [];
  const wantedAt = (i: number) => planCodes(i).map((c) => courses.find((x) => x.code === c)).filter((c): c is PlanCourse => !!c && !enrolled.has(c.code));
  /** Đưa các môn của học kỳ chương trình thứ i vào đúng kỳ i (gỡ khỏi các kỳ khác); sửa trực tiếp `sems`. */
  const placeTerm = (sems: PlanData['sems'], i: number) => {
    const wanted = wantedAt(i);
    for (const c of wanted) for (const l of Object.keys(sems)) sems[l] = sems[l].filter((x) => x.code !== c.code);
    sems[labels[i]] = [...(sems[labels[i]] ?? []), ...wanted.map((c) => ({ code: c.code, name: c.name, credits: c.credits }))];
  };
  const byProgram = (i: number) => onPlan((p) => { const sems = { ...p.sems }; placeTerm(sems, i); return { ...p, sems }; });
  const allByProgram = () => onPlan((p) => {
    const sems: PlanData['sems'] = { ...p.sems };
    for (let i = firstFuture; i < labels.length; i++) placeTerm(sems, i);
    return { ...p, sems };
  });
  const attemptsOf = (l: string) => data.attempts.filter((a) => canonSemester(a.semester) === l && !a.excluded);
  const hasPlan = !!TEACHING_PLAN[major];

  /** Nhãn học kỳ trong danh sách “Chuyển…”: kèm cảnh báo nếu môn chưa đủ điều kiện ở kỳ đó */
  const optLabel = (x: string, cond: string) => {
    const miss = unmet(cond, labels.indexOf(x), ctx);
    return semesterShort(x) + (miss.length ? ' ⚠ ' + t('thiếu {m}', { m: miss.map((m) => m.split(' ')[0]).join(', ') }) : '');
  };
  const enrollingOf = (l: string) => data.attempts.filter((a) => canonSemester(a.semester) === l && a.score === null && !a.special && !a.excluded && a.code);
  const years = labels.length / 3;
  const yCur = Math.min(Math.floor(Math.max(curIdx, 0) / 3), years - 1);
  const auto = () => { runAuto(); toast(t('Đã xếp các môn bắt buộc còn lại vào kế hoạch.'), { undo: true }); };
  const clearAll = () => { onPlan((p) => ({ ...p, sems: {} })); toast(t('Đã xóa kế hoạch các học kỳ sắp tới.'), { undo: true }); };

  return (
    <div className="stack">
      <PageHeader
        title={t('Kế hoạch')}
        sub={cohort ? t('Toàn khóa K{k}: {y} năm học, mỗi năm gồm HK1, HK2 và kỳ hè.', { k: String(cohort).slice(-2), y: MAX_YEARS }) : t('15 học kỳ tính từ học kỳ hiện tại.')}
        primary={<button className="primary" onClick={auto} disabled={!courses.length}>{t('Tự xếp các môn bắt buộc còn lại')}</button>}>
        <Menu label={t('Thêm thao tác')}>
          <button role="menuitem" data-close onClick={allByProgram} disabled={!hasPlan || !courses.length}>{t('Xếp toàn bộ theo Chương trình đào tạo')}<span className="mdesc">{t('Đưa từng môn vào đúng học kỳ theo kế hoạch giảng dạy mẫu của ngành.')}</span></button>
          <ConfirmButton label={t('Xóa kế hoạch')} question={t('Xóa toàn bộ kế hoạch các học kỳ sắp tới?')} onConfirm={clearAll} />
        </Menu>
      </PageHeader>

      <div className={`planalert ${missing === 0 ? 'ok' : 'warn'}`} role="status">
        <b>{missing === 0 ? '✓ ' + t('Kế hoạch đã đủ tổng tín chỉ để tốt nghiệp') : t('Kế hoạch còn thiếu {m} tín chỉ so với tổng {total}', { m: missing, total })}</b>
        {missing === 0 && <span>{grad ? t('Dự kiến đủ tín chỉ vào {s}, năm học thứ {y}{extra}.', { s: semesterDisplay(grad), y: gradYear, extra: gradYear > STANDARD_YEARS ? t(' (vượt chuẩn {n} năm)', { n: STANDARD_YEARS }) : '' }) : t('Bạn đã đủ tín chỉ.')}</span>}
      </div>

      <div className="cards">
        <Stat k={t('Đã tích lũy')} v={earnedNow} unit={t('tín chỉ')} desc={t('Các môn đã qua')} />
        <Stat k={t('Đang học')} v={enrolledCredits} unit={t('tín chỉ')} desc={t('Học kỳ hiện tại')} />
        <Stat k={t('Đã xếp')} v={plannedTotal} unit={t('tín chỉ')} desc={t('Từ học kỳ hiện tại trở đi')} />
        <Stat k={t('Môn bắt buộc chưa xếp')} v={requiredLeft.length} unit={t('môn')} tone={requiredLeft.length === 0 ? 'ok' : undefined} desc={t('Chưa học, chưa có trong kế hoạch')} />
      </div>

      <div className="card progbar">
        <div className="form-row">
          {cohort && <span className="chip">{t('Khóa')} <b>K{String(cohort).slice(-2)}</b> · {t('chương trình đào tạo khóa {y}', { y: progYear })}{progYear !== cohort ? ` (${t('khóa 2024 và 2025 dùng chung 1 chương trình đào tạo')})` : ''}</span>}
          <label>{t('Ngành')}<select value={major} onChange={(e) => setMajor(e.target.value)}>{MAJORS.map(([m, n]) => <option key={m} value={m}>{t(n)}</option>)}</select></label>
          <Hint><>
          <p className="hhead">{t('Kế hoạch toàn khóa')}</p>
          <ul>
            <li><b>{t('Phạm vi')}:</b> {cohort
              ? t('từ HK{k}1 (2 số đầu MSSV) đến hết {y} năm học; {s} năm là chuẩn, năm 5–6 là kéo dài.', { k: String(cohort).slice(-2), y: MAX_YEARS, s: STANDARD_YEARS })
              : t('15 học kỳ từ học kỳ hiện tại (chưa đọc được khóa từ MSSV, hãy nhập Bảng điểm hoặc Tiến độ).')}</li>
            <li><b>{t('Trần tín chỉ')}:</b> {t('{a} ở kỳ chính, {b} ở kỳ hè.', { a: capOf(labels[0]), b: capOf(labels[2]) })}</li>
            <li><b>{t('Tự xếp')}:</b> {t('xếp môn bắt buộc theo thứ tự mở khóa, từ kỳ kế tiếp; môn xếp tay được giữ nguyên.')}</li>
            <li><b>{t('Tự chọn')}:</b> {t('bạn tự thêm.')}</li>
            <li><b>{t('Theo CTĐT')}:</b> {t('xếp đúng kỳ theo kế hoạch giảng dạy mẫu của ngành (Khoa chỉ công bố từ khóa 2026).')}</li>
          </ul>
        </></Hint>
        </div>
        {!useForm && <p className="muted small">{undeclared ? t('Bạn chưa phân ngành: danh sách môn lấy theo chương trình của khóa và ngành chọn ở trên (dự kiến). Khi phân ngành, hãy nhập lại form Tiến độ.') : t('Chưa nhập form Tiến độ: danh sách môn lấy theo chương trình của khóa và ngành chọn ở trên.')}{' '}<button className="linkbtn" onClick={() => go('data')}>{t('Nhập dữ liệu')}</button></p>}
      </div>

      {requiredLeft.length > 0 && (
        <details className="card">
          <summary className="strong">{t('Môn bắt buộc chưa xếp')} ({requiredLeft.length})</summary>
          <table className="tbl compact"><tbody>{requiredLeft.map((c) => (
            <tr key={c.code}>
              <td><b>{c.code}</b> {c.name}</td><td className="num">{c.credits}</td>
              <td className="nowrap"><select className="mini" aria-label={t('Xếp vào học kỳ')} value="" onChange={(e) => { if (e.target.value) add(e.target.value, c); }}>
                <option value="">{t('Xếp vào kỳ…')}</option>
                {labels.slice(firstFuture).map((x) => <option key={x} value={x}>{optLabel(x, c.cond)}</option>)}
              </select></td>
            </tr>))}</tbody></table>
        </details>)}

      {extraErr && <p className="err small" role="alert">{extraErr}</p>}
      <datalist id="plan-codes">
        {candidates.map((c) => <option key={c.code} value={`${c.code} · ${c.name}`} label={`${c.required ? t('Bắt buộc') : t('Tự chọn')} · ${c.credits} ${t('tín chỉ')}`} />)}
        {Object.entries(COURSE_DB).filter(([c]) => !candidates.some((x) => x.code === c)).map(([c, v]) => <option key={c} value={`${c} · ${v.n}`} />)}
      </datalist>

      {Array.from({ length: years }, (_, y) => {
        const yLabels = labels.slice(y * 3, y * 3 + 3);
        const yearPast = y * 3 + 2 < curIdx;
        const yAtt = data.attempts.filter((a) => !a.excluded && yLabels.includes(canonSemester(a.semester)) && a.score !== null);
        const yCredits = yAtt.filter((a) => bandOf(a.score as number).passed).reduce((acc, a) => acc + a.credits, 0);
        const yGpa = summarize(yAtt, data.settings.retakePolicy).gpa;
        const yPlanned = yLabels.reduce((acc, l) => acc + credOf(l), 0);
        const open = y === yCur || y === yCur + 1;
        return (
        <details key={y + (open ? 'o' : 'c')} className="year" open={open}>
          <summary>
            <h3 className="sectitle">{t('Năm học thứ {n}', { n: y + 1 })} · {labels[y * 3] && semesterDisplay(labels[y * 3]).replace(/Năm học |Academic year /, '').replace(/ \/.*$/, '')} {y >= STANDARD_YEARS && <span className="badge">{t('kéo dài')}</span>}</h3>
            <span className="muted small">{yearPast ? <>{yCredits} {t('tín chỉ')} · GPA {fmt(yGpa)}</> : <>{t('đã xếp')} {yPlanned} {t('tín chỉ')}</>}</span>
          </summary>
          <div className="semgrid">
            {yLabels.map((l, j) => {
              const i = y * 3 + j;
              const past = i < curIdx;
              const items = plan.sems[l] ?? [];
              const enr = i === curIdx ? enrollingOf(l) : [];
              const cr = credOf(l) + enr.reduce((acc, a) => acc + a.credits, 0), cap = capOf(l);
              const had = past ? attemptsOf(l) : [];
              const pCodes = planCodes(i);
              return (
                <div key={l} id={`sem-${l}`} className={`card sem${i === curIdx ? ' cur' : ''}${isSummer(l) ? ' summer' : ''}${past ? ' past' : ''}`}>
                  <h3>{semesterShort(l)} {i === curIdx && <span className="badge">{t('hiện tại')}</span>} {isSummer(l) && <span className="badge">{t('kỳ hè')}</span>} {past && <span className="badge">{t('đã qua')}</span>}</h3>
                  {past ? (
                    had.length === 0 ? <p className="muted small">{t('Không có môn nào trong bảng điểm.')}</p> : (
                      <table className="tbl compact"><tbody>{had.map((a) => (
                        <tr key={a.id}><td><b>{a.code}</b> {a.name}</td><td className="num">{a.credits}</td><td className="small">{a.special ?? (a.score === null ? '' : bandOf(a.score).letter)}</td></tr>))}</tbody></table>)
                  ) : (<>
                    <table className="tbl compact"><tbody>
                      {enr.map((a) => (
                        <tr key={a.id} className="locked"><td><b>{a.code}</b> {a.name} <span className="badge">{t('đang học')}</span>{passed.has((a.code ?? '').toUpperCase()) && <span className="badge">{t('học cải thiện')}</span>}</td><td className="num">{a.credits}</td><td /></tr>))}
                      {items.map((it) => {
                        const miss = unmet(courses.find((c) => c.code === it.code)?.cond ?? catalogCond(it.code), i, ctx);
                        return (
                          <tr key={it.code}>
                            <td>{isPlaceholder(it.code) ? (it.name === PLACEHOLDER_NAME ? <><b>{t('Tự chọn')}</b> {t(PLACEHOLDER_NAME)}</> : <><b>{it.name}</b> <span className="muted small">({t('chưa chọn môn')})</span></>) : <><b>{it.code}</b> {it.name}</>}
                              {isInternship(it.name) && (isSummer(l) ? <div className="warnnote small">{t('Thực tập ngoài trường đăng ký ở HK1 (đi thực tập HK2) hoặc HK2 (đi thực tập kỳ hè), không đăng ký ở kỳ hè.')}</div> : <div className="muted small">{t('Đăng ký kỳ này, đi thực tập ở kỳ kế tiếp.')}</div>)}
                              {miss.length > 0 && <div className="errline">{t('Chưa đủ điều kiện')}: {miss.map(condText).join('; ')}</div>}
                              {warnLines(l, it.code)}</td>
                            <td className="num">{it.credits}</td>
                            <td className="nowrap">
                              <select className="mini" aria-label={t('Chuyển sang học kỳ khác')} value="" onChange={(e) => { if (e.target.value) move(l, it.code, e.target.value); }}>
                                <option value="">{t('Chuyển…')}</option>
                                {labels.slice(firstFuture).filter((x) => x !== l).map((x) => <option key={x} value={x}>{optLabel(x, courses.find((c) => c.code === it.code)?.cond ?? catalogCond(it.code))}</option>)}
                              </select>
                              <button className="ghost" aria-label={t('Xóa')} onClick={() => remove(l, it.code)}>✕</button>
                            </td>
                          </tr>);
                      })}
                      {items.length === 0 && enr.length === 0 && <tr><td className="muted">{t('Chưa có môn')}</td><td /><td /></tr>}
                    </tbody></table>
                    <div className="semfoot">
                      <span className={cr > cap ? 'warnnote' : ''}><b>{cr}</b> / {cap} {t('tín chỉ')}{cr > cap ? ' · ' + t('vượt trần') : ''}</span>
                      <input className="mini w240" list="plan-codes" aria-label={t('Thêm môn')} placeholder={t('Thêm môn: gõ mã hoặc tên…')} value={extra[l] ?? ''} onChange={(e) => setExtra({ ...extra, [l]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') submitExtra(l); }} />
                      <button className="ghost" onClick={() => submitExtra(l)}>{t('Thêm')}</button>
                      <Menu label={t('Khác')}>
                        {!isSummer(l) && <button role="menuitem" data-close disabled={!hasPlan || pCodes.length === 0} onClick={() => byProgram(i)}>{t('Theo sắp xếp của Chương trình đào tạo')}</button>}
                        {items.length > 0 && <ConfirmButton label={t('Xóa hết')} question={t('Xóa hết các môn đã xếp trong học kỳ này?')} onConfirm={() => setSem(l, () => [])} />}
                      </Menu>
                    </div>
                  </>)}
                </div>);
            })}
          </div>
        </details>);
      })}
    </div>
  );
}

import { Fragment, useMemo, useState } from 'react';
import type { AppData, Attempt } from '../engine';
import { MAX_FREE_OUTSIDE, bandOf, computeProgress, enrollingCredits, isUndeclared, keyer, semesterShort } from '../engine';
import type { CourseProgress, CourseStatus } from '../engine';
import { CardTitle, ConfirmDialog, Hint } from './ui';
import { t } from '../i18n';

type Filter = 'all' | 'todo' | 'required' | 'elective';

const statusMark = (c: CourseProgress) =>
  c.status === 'passed' ? <span className="ok" title={t('Đạt')}>✓</span> : c.status === 'failed' ? <span className="err" title={t('Chưa đạt')}>✗</span>
    : c.status === 'enrolled' ? <span className="muted" title={c.score !== null ? t('Đang học lại') : t('Đang học')}>…</span> : <span className="muted" title={t('Chưa học')}>—</span>;

/** Điểm hệ 10 một chữ số thập phân, cùng định dạng với bảng theo học kỳ */
const scoreStr = (s: number) => (Math.round(s * 10 + 1e-9) / 10).toFixed(1);

/** Nhóm tự chọn: môn đã đạt lên đầu, môn chưa học xuống cuối */
const RANK: Record<CourseStatus, number> = { passed: 0, enrolled: 1, failed: 2, todo: 3 };

/** Bảng điểm theo nhóm môn (khối kiến thức của chương trình đào tạo): dải tổng quan + bảng nhóm, bấm một nhóm để xem các môn. `query`: lọc môn theo mã/tên (khi đang tìm thì bỏ qua bộ lọc nhóm). `onOpenCourse`: mở môn trong bảng điểm theo học kỳ. `onFreeCourse`: chọn / bỏ chọn môn ngoài chương trình làm tín chỉ tự chọn tự do. */
export function Progress({ data, transcriptCredits, query, goData, onOpenCourse, onFreeCourse }: { data: AppData; transcriptCredits: number; query: string; goData: () => void; onOpenCourse: (code: string) => void; onFreeCourse: (key: string, on: boolean) => void }) {
  const { attempts, settings, program } = data;
  const [filter, setFilter] = useState<Filter>('todo');
  const [open, setOpen] = useState<Set<string>>(new Set()); // nhóm đang mở danh sách môn
  const [showTodo, setShowTodo] = useState<Set<string>>(new Set()); // nhóm tự chọn đã đủ nhưng đang xem cả môn chưa học
  const [pending, setPending] = useState<{ a: Attempt; on: boolean } | null>(null); // môn ngoài chương trình đang chờ xác nhận chọn / bỏ chọn
  const pr = useMemo(() => (program ? computeProgress(program, attempts, settings.retakePolicy, data.freeCourses) : null), [program, attempts, settings.retakePolicy, data.freeCourses]);

  if (!program || !pr) {
    return (
      <div className="card empty">
        <h2>{t('Chưa có chương trình đào tạo')}</h2>
        <p>{t('Nhập PDF “Tiến độ hoàn thành chương trình đào tạo” từ cổng sinh viên để xem tiến độ theo từng khối kiến thức và biết còn thiếu môn nào.')}</p>
        <button className="primary" onClick={goData}>{t('Nhập PDF')}</button>
      </div>
    );
  }

  const toggle = (set: Set<string>, key: string) => { const n = new Set(set); if (n.has(key)) n.delete(key); else n.add(key); return n; };
  const missing = pr.required - pr.earned;
  const enrolling = enrollingCredits(attempts, settings.retakePolicy);
  const accumulated = transcriptCredits;
  const pct = pr.required ? Math.min(100, (pr.earned / pr.required) * 100) : 0;
  const incomplete = pr.groups.filter((g) => g.earned < g.required);
  const q = query.trim().toLowerCase();
  const searching = q !== '';
  const courseOk = (c: CourseProgress) => !q || c.course.name.toLowerCase().includes(q) || c.course.code.toLowerCase().includes(q);
  /** Xem trước kết quả khi chọn / bỏ chọn một môn, để hộp thoại xác nhận nói rõ ảnh hưởng */
  const preview = pending ? (() => {
    const key = keyer(attempts)(pending.a);
    const cur = (data.freeCourses ?? []).filter((x) => x !== key);
    return computeProgress(program, attempts, settings.retakePolicy, pending.on ? [...cur, key] : cur);
  })() : null;
  const shown = pr.groups.filter((g) => (searching ? g.courses.some(courseOk) : filter === 'all' || (filter === 'todo' ? g.earned < g.required : g.group.kind === filter)));

  return (
    <div className="stack">
      {isUndeclared(data.official) && <div className="note"><b>{t('Chưa phân ngành')}</b> {t('Form tiến độ hiện chỉ gồm các khối kiến thức chung ({n} tín chỉ). Khi tính số tín chỉ chưa qua môn (ngưỡng 5%) và mục tiêu GPA, app vẫn lấy tổng 132 tín chỉ của bằng cử nhân.', { n: pr.required })}</div>}

      <div className="card ovw">
        <div className="ovwtop">
          <span className="v">{pr.earned}<small> / {pr.required} {t('tín chỉ')}{isUndeclared(data.official) ? ' · ' + t('chưa phân ngành') : ''}</small></span>
          <div className="bar wide" role="img" aria-label={`${pr.earned} / ${pr.required}`}><i style={{ width: `${pct}%` }} /></div>
        </div>
        <span className="sub">
          {t('Còn thiếu')} <b>{missing}</b> {t('tín chỉ')} · {t('{n} nhóm chưa đủ', { n: incomplete.length })}
          {enrolling > 0 && ' · ' + t('{e} đang học → sau kỳ này còn {r}', { e: enrolling, r: Math.max(0, missing - enrolling) })}
          {accumulated !== pr.earned && <> · <span title={t('Tính theo khối kiến thức; bảng điểm hiện {n} tín chỉ (gồm phần vượt nhóm)', { n: accumulated })}>{t('bảng điểm: {n} TC', { n: accumulated })}</span></>}
        </span>
      </div>

      <div className="card">
        <div className="ctitle">
          <h3>{t('Khối kiến thức')}</h3>
          <Hint><>
            <p className="hhead">{t('Thứ tự ưu tiên khi xét')}</p>
            <ol>
              <li><b>{t('Khối')}:</b> {t('bắt buộc > tự chọn > tự chọn tự do.')}</li>
              <li><b>{t('Điểm')}:</b> {t('điểm số > điểm MT > điểm DT.')}</li>
              <li><b>{t('Môn')}:</b> {t('trong chương trình > ngoài chương trình.')}</li>
            </ol></></Hint>
          <div className="seg sm push" role="group" aria-label={t('Lọc nhóm')}>
            {([['todo', t('Chưa đủ')], ['all', t('Tất cả')], ['required', t('Bắt buộc')], ['elective', t('Tự chọn')]] as const).map(([k, l]) => (
              <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
        </div>
        {shown.length === 0 ? <p className={searching ? 'muted' : 'ok'}>{searching ? t('Không có môn nào khớp.') : t('Tất cả các nhóm trong bộ lọc này đã đủ tín chỉ.')}</p> : (
          <div className="tblwrap"><table className="tbl gtbl">
            <thead><tr><th>{t('Nhóm')}</th><th>{t('Loại')}</th><th className="num">{t('Tín chỉ')}</th><th>{t('Tiến độ')}</th><th className="center">{t('Còn thiếu')}</th></tr></thead>
            <tbody>{shown.map((g) => {
              const gkey = pr.groups.indexOf(g) + g.group.name;
              const done = g.earned >= g.required;
              const elective = g.group.kind === 'elective';
              const isOpen = searching || open.has(gkey);
              const matched = g.courses.filter(courseOk);
              const ordered = elective ? [...matched].sort((a, b) => RANK[a.status] - RANK[b.status]) : matched;
              // Nhóm tự chọn đã đủ: thu gọn các môn chưa học cho ngắn danh sách
              const todoCount = ordered.filter((c) => c.status === 'todo').length;
              const foldable = elective && done && !searching && todoCount > 0;
              const folded = foldable && !showTodo.has(gkey);
              const courses = folded ? ordered.filter((c) => c.status !== 'todo') : ordered;
              const enrolledCr = g.courses.filter((c) => c.status === 'enrolled').reduce((s, c) => s + c.course.credits, 0);
              const enrolledPct = g.required > 0 ? Math.min(Math.max(0, g.required - g.earned), enrolledCr) / g.required * 100 : 0;
              return (
                <Fragment key={gkey}>
                  <tr className={`grow${isOpen ? ' on' : ''}`} onClick={() => !searching && setOpen((s) => toggle(s, gkey))}>
                    <td>
                      <button type="button" className="gname" aria-expanded={isOpen} disabled={searching}>
                        <span className="caret" aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
                        <span className={done ? 'ok' : ''}>{g.group.name}</span>
                      </button>
                      {g.overflow > 0 && <span className="badge" title={t('Phần học vượt yêu cầu của nhóm được tính vào nhóm Tự chọn tự do.')}>{t('+{n} TC dư → Tự chọn tự do', { n: g.overflow })}</span>}
                    </td>
                    <td><span className="badge">{elective ? t('Tự chọn') : t('Bắt buộc')}</span></td>
                    <td className="num">{g.required > 0 ? <b className={done ? 'ok' : ''}>{g.earned}/{g.required}</b> : <span className="muted">—</span>}</td>
                    <td>{g.required > 0 && <span className="bar mini" title={enrolledCr > 0 ? t('{e} tín chỉ đang học', { e: enrolledCr }) : undefined}><i style={{ width: `${Math.min(100, (g.earned / g.required) * 100)}%` }} />{enrolledPct > 0 && <i className="enr" style={{ width: `${enrolledPct}%` }} />}</span>}</td>
                    <td className="center">{g.required > 0 ? (done ? <span className="ok">✓</span> : <b className="err">{g.required - g.earned}</b>) : <span className="muted">—</span>}</td>
                  </tr>
                  {isOpen && (
                    <tr className="gdetail"><td colSpan={5}>
                      {g.courses.length === 0 ? (
                        <>
                        <p className="muted pad">{g.group.free ? t('Chọn môn tự do bất kỳ. Phần dư của nhóm tự chọn và các môn ngoài chương trình mà bạn chọn được tính vào đây (hiện {rawEarned} tín chỉ).', { rawEarned: g.rawEarned }) : t('Nhóm này không có môn cụ thể.')}</p>                        </>
                      ) : (
                        <>
                          <table className="tbl compact">
                            <thead><tr><th>{t('Mã')}</th><th>{t('Môn học')}</th><th className="num">{t('TC')}</th><th className="num">{t('Điểm')}</th><th className="center">{t('Chữ')}</th><th>{t('HK')}</th><th className="center">{t('Đạt')}</th></tr></thead>
                            <tbody>{courses.map((c) => (
                              <tr key={c.course.code} className={!done && (c.status === 'todo' || c.status === 'failed') ? 'miss' : c.status === 'todo' ? 'dim' : ''}>
                                <td>{c.status === 'todo' ? c.course.code : <button type="button" className="linkbtn" onClick={() => onOpenCourse(c.course.code)} title={t('Xem / sửa trong bảng điểm theo học kỳ')}>{c.course.code}</button>}</td>
                                <td>{c.course.name}</td><td className="num">{c.course.credits}</td>
                                <td className="num">{c.special ?? (c.score === null ? '—' : scoreStr(c.score))}</td>
                                <td className="center">{c.letter ? <span className={`pill l-${c.letter.replace('+', 'p')}`}>{c.letter}</span> : <span className="muted">—</span>}</td>
                                <td>{c.semester ? semesterShort(c.semester) : <span className="muted">—</span>}</td>
                                <td className="center">{statusMark(c)}</td>
                              </tr>
                            ))}</tbody>
                          </table>
                          {foldable && <p className="pad"><button type="button" className="linkbtn quiet" onClick={() => setShowTodo((s) => toggle(s, gkey))}>{folded ? t('Hiện {n} môn chưa học', { n: todoCount }) : t('Ẩn môn chưa học')}</button></p>}
                        </>
                      )}
                    </td></tr>
                  )}
                </Fragment>
              );
            })}</tbody>
          </table></div>
        )}
      </div>

      {pr.outside.length > 0 && (
        <div className="card">
          <CardTitle>{t('Môn học ngoài chương trình đào tạo')}</CardTitle>
          <p className="muted small">{t('Môn ngoài chương trình không tự động được tính. Chọn môn bạn muốn tính vào nhóm Tự chọn tự do; chỉ tính tối đa {n} môn điểm cao nhất, các môn điểm thấp hơn bị bỏ.', { n: MAX_FREE_OUTSIDE })}</p>
          <div className="tblwrap"><table className="tbl compact"><thead><tr><th>{t('Mã')}</th><th>{t('Môn học')}</th><th className="num">{t('TC')}</th><th className="num">{t('Điểm')}</th><th className="center">{t('Chữ')}</th><th className="center">{t('Tự chọn tự do')}</th></tr></thead>
            <tbody>{pr.outside.filter((a) => !q || a.name.toLowerCase().includes(q) || (a.code ?? '').toLowerCase().includes(q)).map((a) => {
              const letter = bandOf(a.score as number).letter;
              const used = pr.freeUsed.get(a.id);
              const skipped = pr.freeSkipped.includes(a);
              return <tr key={a.id}><td>{a.code ?? '—'}</td><td>{a.name}</td><td className="num">{a.credits}</td><td className="num">{scoreStr(a.score as number)}</td><td className="center"><span className={`pill l-${letter.replace('+', 'p')}`}>{letter}</span></td>
                <td className="center">{used !== undefined || skipped
                  ? <>{used !== undefined ? <span className="ok">{used < a.credits ? t('✓ Tính {used}/{n} TC', { used, n: a.credits }) : t('✓ Đã tính')}</span> : <span className="muted" title={t('Đã chọn nhưng không tính: chỉ lấy {n} môn điểm cao nhất, trong số tín chỉ nhóm còn nhận.', { n: MAX_FREE_OUTSIDE })}>{t('Không tính')}</span>} <button type="button" className="linkbtn quiet" onClick={() => setPending({ a, on: false })}>{t('Bỏ chọn')}</button></>
                  : <button type="button" className="linkbtn" onClick={() => setPending({ a, on: true })}>{t('Chọn làm TC Tự do')}</button>}</td></tr>;
            })}</tbody></table></div>
        </div>
      )}

      {pending && preview && (() => {
        const { a, on } = pending;
        const label = a.code ? `${a.code} · ${a.name}` : a.name;
        const letter = bandOf(a.score as number).letter;
        const free = preview.groups.find((g) => g.group.free);
        const used = preview.freeUsed.get(a.id) ?? 0;
        // Các môn khác đổi số tín chỉ được tính (bị loại / giảm / được tính lại)
        const changes = pr.outside.filter((b) => b.id !== a.id && (pr.freeUsed.get(b.id) ?? 0) !== (preview.freeUsed.get(b.id) ?? 0));
        const earnedOf = (p: typeof pr) => p.groups.find((g) => g.group.free)?.earned ?? 0;
        return (
          <ConfirmDialog
            title={on ? t('Tính vào Tự chọn tự do?') : t('Bỏ khỏi Tự chọn tự do?')}
            confirmLabel={on ? t('Tính vào Tự chọn tự do') : t('Bỏ chọn')}
            onConfirm={() => { onFreeCourse(keyer(attempts)(a), on); setPending(null); }}
            onCancel={() => setPending(null)}>
            <div className="cinfo"><b>{label}</b><span>{a.credits} {t('tín chỉ')} · {scoreStr(a.score as number)} ({letter})</span></div>
            <ul className="cres">
              {on && (used >= a.credits ? <li>{t('Môn này được tính đủ {n} tín chỉ.', { n: a.credits })}</li>
                : used > 0 ? <li className="warnline">{t('Môn này chỉ được tính {used}/{n} tín chỉ vì nhóm Tự chọn tự do chỉ cần {req} tín chỉ.', { used, n: a.credits, req: free?.required ?? 0 })}</li>
                  : <li className="warnline">{t('Môn này sẽ không được tính: đã có {max} môn điểm cao hơn hoặc nhóm đã đủ tín chỉ.', { max: MAX_FREE_OUTSIDE })}</li>)}
              {changes.map((b) => <li key={b.id} className="warnline">{b.code ?? b.name}: {pr.freeUsed.get(b.id) ?? 0} → {preview.freeUsed.get(b.id) ?? 0} {t('tín chỉ được tính')}</li>)}
              <li>{t('Nhóm Tự chọn tự do')}: {earnedOf(pr)}/{free?.required ?? 0} → <b>{earnedOf(preview)}/{free?.required ?? 0}</b> {t('tín chỉ')}</li>
            </ul>
          </ConfirmDialog>
        );
      })()}
    </div>
  );
}

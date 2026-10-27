import { useRef, useState } from 'react';
import type { AppData, Attempt, Settings } from '../engine';
import { canonSemester, computeProgress, effectiveTotal, failLimit, parsePasted, programTotal, semesterAt, semesterLabel, verify } from '../engine';
import { SemesterSelect } from './SemesterSelect';
import { fmt } from '../format';
import type { PdfResult } from '../pdf';
import { buildExcel, readExcel } from '../excel';
import { saveBytes, saveText } from '../files';
import { emptyData, sanitize } from '../store';
import { ocrAvailable, readImages } from '../ocr/read';
import { t, LANGS, setLang, useLang } from '../i18n';
import { CardTitle, Menu, PageHeader, useToast } from './ui';
import { CurriculumImport } from './CurriculumImport';
import { setTheme, useTheme } from '../theme';
import type { ThemePref } from '../theme';
import { writeBackup } from '../backup';
import { PrivacyDialog } from './Privacy';
import type { Go } from '../App';

type View = 'data' | 'settings';
interface Props {
  data: AppData;
  view: View;
  setView: (v: View) => void;
  go: Go;
  onAdd: (rows: Attempt[]) => void;
  onSettings: (p: Partial<Settings>) => void;
  onReplace: (d: AppData) => void;
  onTranscript: (r: Extract<PdfResult, { kind: 'transcript' }>) => void;
  onProgress: (r: Extract<PdfResult, { kind: 'progress' }>) => void;
}

interface Preview { id: number; file: string; result?: PdfResult; error?: string; ocr?: boolean }

async function readPdfFile(f: File): Promise<PdfResult> {
  const [{ extractItems }, { parsePdfItems }] = await Promise.all([import('../pdf/extract'), import('../pdf')]);
  return parsePdfItems(await extractItems(await f.arrayBuffer()));
}

function Warnings({ list, ocr }: { list: string[]; ocr?: boolean }) {
  if (!list.length && !ocr) return null;
  return (
    <>
      {ocr && <p className="warnnote small">{t('Dữ liệu được nhận dạng từ ảnh nên có thể sai ở một số ô. Hãy đối chiếu với trường trước khi nhập.')}</p>}
      {list.length > 0 && <details className="small" open={list.length <= 4}><summary className="warnnote">{t('{n} cảnh báo', { n: list.length })}</summary>{list.map((w, i) => <p key={i} className="err small">{w}</p>)}</details>}
    </>
  );
}

export function DataPage({ data, view, setView, onAdd, onSettings, onReplace, onTranscript, onProgress }: Props) {
  useLang();
  const toast = useToast();
  const theme = useTheme();
  const [text, setText] = useState('');
  const [sem, setSem] = useState(semesterLabel(semesterAt()));
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState(false);
  const setMsg = (m: { kind: 'ok' | 'err'; text: string } | null) => { if (!m) setErrMsg(null); else if (m.kind === 'err') setErrMsg(m.text); else { setErrMsg(null); toast(m.text, { undo: true }); } };
  const [errors, setErrors] = useState<{ line: number; text: string; reason: string }[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [over, setOver] = useState(false);
  const pdfRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [ocrBusy, setOcrBusy] = useState<string | null>(null);
  const [overImg, setOverImg] = useState(false);
  const seq = useRef(0);
  const xlsRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  const onPdf = async (files: FileList | File[] | null | undefined) => {
    const list = Array.from(files ?? []).filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
    if (!list.length) return void setMsg({ kind: 'err', text: t('Hãy chọn file .pdf (Bảng điểm hoặc Tiến độ hoàn thành chương trình đào tạo).') });
    for (const f of list) {
      const id = ++seq.current;
      try { const result = await readPdfFile(f); setPreviews((p) => [...p, { id, file: f.name, result }]); }
      catch (e) { setPreviews((p) => [...p, { id, file: f.name, error: (e as Error).message }]); }
    }
    if (pdfRef.current) pdfRef.current.value = '';
  };
  const onImages = async (files: FileList | File[] | null | undefined) => {
    const list = Array.from(files ?? []).filter((f) => /^image\//.test(f.type) || /\.(png|jpe?g|bmp|webp)$/i.test(f.name));
    if (imgRef.current) imgRef.current.value = '';
    if (!list.length) return void setMsg({ kind: 'err', text: t('Hãy chọn ảnh .png hoặc .jpg chụp màn hình trang Bảng điểm / Tiến độ.') });
    if (!ocrAvailable()) return void setMsg({ kind: 'err', text: t('Đọc ảnh chỉ có trong bản cài trên máy tính (file .exe), không có khi mở bằng trình duyệt.') });
    setMsg(null);
    setOcrBusy(t('Đang nhận dạng ảnh 1/{length}…', { length: list.length }));
    try {
      const outs = await readImages(list, { program: data.program, attempts: data.attempts }, (done, total) => setOcrBusy(done < total ? t('Đang nhận dạng ảnh {i}/{total}…', { i: done + 1, total }) : t('Đang phân tích…')));
      setPreviews((p) => [...p, ...outs.map((o) => ({ id: ++seq.current, file: o.label, result: o.result, error: o.error, ocr: true }))]);
    } catch (e) { setMsg({ kind: 'err', text: t('Không đọc được ảnh: {v1}', { v1: (e as Error).message }) }); }
    setOcrBusy(null);
  };
  const drop = (id: number) => setPreviews((p) => p.filter((x) => x.id !== id));
  const accept = (pv: Preview) => {
    const r = pv.result!;
    if (r.kind === 'transcript') { onTranscript(r); setMsg({ kind: 'ok', text: t('Đã nhập bảng điểm: {length} môn. Số liệu được đối chiếu với trường ở trang “Tổng quan”.', { length: r.attempts.length }) }); }
    else { onProgress(r); setMsg({ kind: 'ok', text: t('Đã nhập chương trình đào tạo: {length} nhóm, {v2} tín chỉ.', { length: r.program.groups.length, v2: programTotal(r.program) }) }); }
    drop(pv.id);
  };

  const doPaste = () => {
    const r = parsePasted(text, canonSemester(sem) || t('Chưa phân loại'));
    setErrors(r.errors);
    if (r.attempts.length) onAdd(r.attempts);
    setMsg(r.attempts.length ? { kind: 'ok', text: r.errors.length ? t('Đã thêm {n} môn, bỏ qua {e} dòng lỗi.', { n: r.attempts.length, e: r.errors.length }) : t('Đã thêm {n} môn.', { n: r.attempts.length }) } : { kind: 'err', text: t('Không có dòng hợp lệ nào.') });
    if (!r.errors.length) setText('');
  };

  const onExcel = async (f?: File) => {
    if (!f) return;
    try {
      const rows = await readExcel(await f.arrayBuffer());
      if (!rows.length) setMsg({ kind: 'err', text: t('Không tìm thấy bảng điểm trong file (cần cột Môn học / Số tín chỉ / Điểm 10).') });
      else { onAdd(rows); setMsg({ kind: 'ok', text: t('Đã nhập {length} môn từ “{name}”.', { length: rows.length, name: f.name }) }); }
    } catch (e) { setMsg({ kind: 'err', text: t('Không đọc được file: {v1}', { v1: (e as Error).message }) }); }
    if (xlsRef.current) xlsRef.current.value = '';
  };

  const onJson = async (f?: File) => {
    if (!f) return;
    try {
      const d = sanitize(JSON.parse(await f.text()));
      onReplace(d);
      setMsg({ kind: 'ok', text: t('Đã khôi phục {length} môn từ bản sao lưu (dữ liệu cũ được thay thế).', { length: d.attempts.length }) });
    } catch { setMsg({ kind: 'err', text: t('File sao lưu không hợp lệ.') }); }
    if (jsonRef.current) jsonRef.current.value = '';
  };

  const doBackup = async () => {
    const ok = await saveText('hcmut-gpa-backup.json', JSON.stringify(data, null, 2), 'application/json', 'json');
    if (ok) writeBackup(Date.now());
    toast(ok ? t('Đã sao lưu.') : t('Đã hủy.'));
  };
  const doExport = async () => {
    const ok = await saveBytes('bang-diem.xlsx', await buildExcel(data.attempts, data.student, data.settings.retakePolicy), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx');
    toast(ok ? t('Đã xuất file Excel.') : t('Đã hủy.'));
  };
  const themes: [ThemePref, string][] = [['light', t('Sáng')], ['dark', t('Tối')], ['system', t('Theo hệ thống')]];
  const lang = useLang();
  const views: [View, string][] = [['data', t('Dữ liệu')], ['settings', t('Cài đặt')]];

  return (
    <div className="stack">
      <PageHeader
        title={t('Dữ liệu & cài đặt')}
        sub={t('Nhập bảng điểm, sao lưu và chỉnh giao diện.')}
        primary={view === 'data' ? <button className="primary" onClick={() => pdfRef.current?.click()}>{t('Chọn file PDF…')}</button> : undefined}>
        <Menu>
          <button role="menuitem" data-close onClick={() => xlsRef.current?.click()}>{t('Nhập từ Excel (.xlsx, .xlsm)')}</button>
          <button role="menuitem" data-close onClick={() => void doExport()}>{t('Xuất Excel')}</button>
          <button role="menuitem" data-close onClick={() => void doBackup()}>{t('Sao lưu dữ liệu')}</button>
          <button role="menuitem" data-close onClick={() => jsonRef.current?.click()}>{t('Khôi phục từ file sao lưu')}</button>
        </Menu>
      </PageHeader>
      <input ref={pdfRef} type="file" accept=".pdf,application/pdf" multiple hidden onChange={(e) => void onPdf(e.target.files)} />
      <input ref={xlsRef} type="file" accept=".xlsx,.xlsm" hidden onChange={(e) => void onExcel(e.target.files?.[0])} />
      <input ref={jsonRef} type="file" accept=".json,application/json" hidden onChange={(e) => void onJson(e.target.files?.[0])} />

      <div className="seg" role="group" aria-label={t('Chế độ xem')}>
        {views.map(([k, l]) => <button key={k} aria-pressed={view === k} onClick={() => setView(k)}>{l}</button>)}
      </div>
      {errMsg && <div className="banner err" role="alert">{errMsg}</div>}

      {privacy && <PrivacyDialog onClose={() => setPrivacy(false)} />}

      {view === 'settings' && (<>
        <div className="card">
          <CardTitle>{t('Giao diện')}</CardTitle>
          <div className="setrow"><div className="lbl"><b>{t('Chế độ màu')}</b><small>{t('Mặc định theo hệ thống.')}</small></div>
            <div className="seg" role="group" aria-label={t('Chế độ màu')}>{themes.map(([k, l]) => <button key={k} aria-pressed={theme.pref === k} onClick={() => setTheme(k)}>{l}</button>)}</div></div>
          <div className="setrow"><div className="lbl"><b>{t('Ngôn ngữ')}</b></div>
            <select value={lang} onChange={(e) => setLang(e.target.value as 'vi' | 'en')} aria-label={t('Ngôn ngữ')}>{LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select></div>
          <div className="setrow"><div className="lbl"><b>{t('Quyền riêng tư')}</b><small>{t('Dữ liệu chỉ nằm trên máy này.')}</small></div>
            <button onClick={() => setPrivacy(true)}>{t('Chính sách và Quyền riêng tư')}</button></div>
        </div>

        <div className="card">
          <CardTitle>{t('Tổng số tín chỉ chương trình')}</CardTitle>
          <input type="number" min={1} max={300} value={data.settings.totalCredits} className="w120" aria-label={t('Tổng số tín chỉ chương trình')}
            onChange={(e) => { const v = parseInt(e.target.value, 10); if (v > 0) onSettings({ totalCredits: v }); }} />
        </div>

        <div className="card">
          <CardTitle>{t('Quy tắc tính điểm')}</CardTitle>
          <ul className="rules">
          <li><b>{t('Thang điểm')}</b> {t('(Quy định học vụ, Điều 17 và 20): A+ 9,5–10 · A 8,5–9,4 · B+ 8,0–8,4 · B 7,0–7,9 · C+ 6,5–6,9 · C 5,5–6,4 · D+ 5,0–5,4 · D 4,0–4,9 · F dưới 4,0, quy đổi 4 · 4 · 3,5 · 3 · 2,5 · 2 · 1,5 · 1 · 0. Học lực: ≥3,6 Xuất sắc · ≥3,2 Giỏi · ≥2,5 Khá · ≥2,0 Trung bình · ≥1,0 Yếu · dưới 1,0 Kém, xét trên GPA đã làm tròn 2 chữ số thập phân (Giỏi 3,20–3,59; Khá 2,50–3,19).')}</li>
          <li><b>{t('Học cải thiện')}</b> {t('(Điều 22): môn có nhiều lần học chỉ tính')} <b>{t('lần điểm cao nhất')}</b> {t('vào GPA.')}</li>
          <li><b>{t('Học lại môn rớt:')}</b> {t('mỗi lần điểm F đều được cộng vào')} <b>{t('tín chỉ rớt')}</b>{t(', kể cả khi đã học lại và đạt.')}</li>
          <li><b>{t('Điểm đặc biệt:')}</b> {t('MT (miễn) được cộng tín chỉ tích lũy nhưng không tính vào GPA; DT chỉ ghi nhận đạt; RT (rút môn) không tính. Cùng một môn có điểm số và điểm miễn thì chỉ tính một lần, ưu tiên điểm số.')}</li>
          <li><b>{t('Hạ bằng:')}</b> {t('nếu tín chỉ rớt vượt 5% tổng tín chỉ ({limit} tín chỉ với {total} tín chỉ) thì hạ một bậc: Xuất sắc → Giỏi, Giỏi → Khá. Bằng Khá không bị hạ xuống Trung bình. (Quy tắc 5% do bạn cung cấp, không có trong văn bản Quy định học vụ.)', { limit: fmt(failLimit(effectiveTotal(data.settings, data.official)), 1), total: effectiveTotal(data.settings, data.official) })}</li>
          <li><b>{t('Điểm thành phần')}</b> {t('(trang Mục tiêu → Tính điểm môn đang học): điểm tổng kết làm tròn 1 chữ số thập phân; theo quy tắc bạn cung cấp, bất kỳ thành phần nào bị 0 điểm thì rớt môn (F), nên mỗi phần còn lại phải khác 0.')}</li>
          <li><b>{t('Tốt nghiệp')}</b> {t('(Điều 31.1): cần GPA tích lũy toàn khóa từ 2,0 trở lên và đủ tín chỉ chương trình.')}</li>
          </ul>
          <p className="muted small">{t('Hai môn được coi là cùng một môn nếu trùng mã môn (không có mã thì trùng tên, không phân biệt hoa/thường).')}</p>
        </div>

        <div className="card">
          <CardTitle>{t('Xóa toàn bộ dữ liệu')}</CardTitle>
          {!confirmClear ? <button className="danger" onClick={() => setConfirmClear(true)}>{t('Xóa tất cả…')}</button> : (
            <div className="btn-row">
              <span className="err">{t('Xóa vĩnh viễn {n} môn? Nên sao lưu dữ liệu trước.', { n: data.attempts.length })}</span>
              <button className="danger" onClick={() => { onReplace(emptyData()); setConfirmClear(false); toast(t('Đã xóa dữ liệu.'), { undo: true }); }}>{t('Xác nhận xóa')}</button>
              <button onClick={() => setConfirmClear(false)}>{t('Hủy')}</button>
            </div>
          )}
        </div>
      </>)}

      {view === 'data' && (<>
        <div className="card">
          <CardTitle>{t('Sao lưu & khôi phục')}</CardTitle>
          <p className="muted small">{t('Khôi phục thay toàn bộ dữ liệu hiện tại bằng nội dung file sao lưu (.json).')}</p>
          <div className="btn-row">
            <button className="accent" onClick={() => jsonRef.current?.click()}>{t('Khôi phục từ file sao lưu')}</button>
            <button onClick={() => void doBackup()}>{t('Sao lưu dữ liệu')}</button>
          </div>
        </div>
        <div className="card">
          <CardTitle hint={<ul>
            <li><b>{t('Riêng tư')}:</b> {t('file đọc ngay trên máy, không gửi đi đâu.')}</li>
            <li><b>{t('Định dạng')}:</b> {t('chỉ PDF có chữ (xuất từ cổng sinh viên); ảnh chụp dùng mục bên dưới.')}</li>
            <li><b>{t('Nhập lại')}:</b> {t('thay dữ liệu từ PDF trước; môn bạn tự thêm vẫn được giữ.')}</li>
          </ul>}>{t('Nhập từ PDF của trường')}</CardTitle>
          <div className={`drop ${over ? 'over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); void onPdf(e.dataTransfer.files); }}>
            <p>{t('Kéo thả hoặc chọn file')} <b>{t('Bảng điểm')}</b> {t('và/hoặc')} <b>{t('Tiến độ hoàn thành chương trình đào tạo')}</b> {t('(PDF tải từ cổng sinh viên).')}</p>
            <button onClick={() => pdfRef.current?.click()}>{t('Chọn file PDF…')}</button>
          </div>
        </div>

        <CurriculumImport data={data} onReplace={onReplace} />
        <div className="card">
          <CardTitle hint={<ul>
            <li><b>{t('Riêng tư')}:</b> {t('nhận dạng chữ ngay trong app, không cần Internet, không gửi đi đâu.')}</li>
            <li><b>{t('Độ chính xác')}:</b> {t('không tuyệt đối như PDF; nên dùng PDF nếu có.')}</li>
            <li><b>{t('Cách chụp')}:</b> {t('rõ, đủ cột, không bị che; phóng to trang web 125–150% (Ctrl +).')}</li>
            <li><b>{t('Trước khi nhập')}:</b> {t('luôn xem lại kết quả và cảnh báo.')}</li>
          </ul>}>{t('Nhập từ ảnh chụp màn hình')}</CardTitle>
          <div className={`drop ${overImg ? 'over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setOverImg(true); }} onDragLeave={() => setOverImg(false)}
            onDrop={(e) => { e.preventDefault(); setOverImg(false); void onImages(e.dataTransfer.files); }}>
            <p>{t('Chụp màn hình trang')} <b>{t('Bảng điểm')}</b> {t('hoặc')} <b>{t('Tiến độ hoàn thành chương trình đào tạo')}</b> {t('trên web của trường rồi kéo thả ảnh vào đây. Bảng dài thì chụp nhiều ảnh (từ trên xuống) và chọn cùng lúc.')}</p>
            <button disabled={!!ocrBusy} onClick={() => imgRef.current?.click()}>{ocrBusy ?? t('Chọn ảnh…')}</button>
            <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/bmp,image/webp,.png,.jpg,.jpeg,.bmp,.webp" multiple hidden onChange={(e) => void onImages(e.target.files)} />
          </div>
        </div>

      {previews.length > 0 && (
        <div className="card">
          <CardTitle>{t('Kết quả đọc được')}</CardTitle>
        {previews.map((pv) => {
          const r = pv.result;
          const checks = r?.kind === 'transcript' ? verify(r.attempts, data.settings.retakePolicy, r.official) : [];
          const bad = checks.filter((c) => !c.ok);
          // Ưu tiên bảng điểm PDF đang chờ nhập (nếu có); nếu không thì dùng dữ liệu hiện có
          const pendingT = previews.find((x) => x.result?.kind === 'transcript')?.result;
          const baseAttempts = pendingT?.kind === 'transcript' ? pendingT.attempts : data.attempts.filter((a) => a.source !== 'progress');
          const prog = r?.kind === 'progress' ? computeProgress(r.program, baseAttempts, data.settings.retakePolicy, data.freeCourses) : null;
          return (
            <div className="pv" key={pv.id}>
              {pv.error && <><h4 className="err">{pv.file}</h4><p className="err">{pv.error}</p><button onClick={() => drop(pv.id)}>{t('Đóng')}</button></>}
              {r?.kind === 'transcript' && (
                <>
                  <h4>{t('Bảng điểm')} · {pv.file}{pv.ocr ? t(' (đọc từ ảnh)') : ''}</h4>
                  <p>{t('{name} · MSSV {id} · {n} môn · {sems} học kỳ', { name: r.student.name, id: r.student.id, n: r.attempts.length, sems: r.official.semesters?.length ?? 0 })}{r.skipped ? t(' · bỏ qua {skipped} dòng 0 tín chỉ không in trên bảng điểm', { skipped: r.skipped }) : ''}</p>
                  <p className={bad.length ? 'err' : 'ok'}>{checks.length === 0 ? t('Không có số liệu của trường để đối chiếu.') : bad.length === 0 ? t('✓ App tính ra đúng {length}/{length_} số liệu của trường (GPA, tín chỉ tích lũy, điểm chữ và từng học kỳ).', { length: checks.length, length_: checks.length }) : t('Lệch {bad}/{all} số liệu so với trường: {list}', { bad: bad.length, all: checks.length, list: bad.map((c) => t(c.label)).join('; ') })}</p>
                  <Warnings list={r.warnings} ocr={pv.ocr} />
                  {pv.ocr && <details className="small"><summary>{t('Xem lại {n} môn đã đọc', { n: r.attempts.length })}</summary>
                    <div className="tblwrap"><table className="tbl"><thead><tr><th>{t('Mã')}</th><th>{t('Tên môn')}</th><th>{t('Điểm')}</th><th>TC</th><th>{t('Học kỳ')}</th></tr></thead><tbody>
                      {r.attempts.map((a) => <tr key={a.id} className={r.warnings.some((w) => a.code && w.startsWith(a.code)) ? 'flag' : ''}><td>{a.code}</td><td>{a.name}</td><td>{a.score ?? a.special ?? ''}</td><td>{a.credits}</td><td>{a.semester}</td></tr>)}
                    </tbody></table></div></details>}
                  <div className="btn-row"><button className="accent" onClick={() => accept(pv)}>{t('Nhập vào ứng dụng')}</button><button onClick={() => drop(pv.id)}>{t('Bỏ qua')}</button></div>
                </>
              )}
              {r?.kind === 'progress' && (
                <>
                  <h4>{t('Tiến độ học tập')} · {pv.file}{pv.ocr ? t(' (đọc từ ảnh)') : ''}</h4>
                  <p>{t('{name} · {major} · {groups} nhóm kiến thức · {credits} tín chỉ · đã đạt {earned}', { name: r.student.name, major: r.student.major, groups: r.program.groups.length, credits: programTotal(r.program), earned: r.official.credits ?? '?' })}</p>
                  <p className="muted small">{prog ? t('Với bảng điểm hiện có, app tính được {earned}/{required} tín chỉ.', { earned: prog.earned, required: prog.required }) : ''}{r.grades.length ? t(' Form có điểm của {length} môn.', { length: r.grades.length }) : ''}</p>
                  <Warnings list={r.warnings} ocr={pv.ocr} />
                  <div className="btn-row"><button className="accent" onClick={() => accept(pv)}>{t('Nhập vào ứng dụng')}</button><button onClick={() => drop(pv.id)}>{t('Bỏ qua')}</button></div>
                </>
              )}
            </div>
          );
        })}
        </div>
      )}

        <div className="card">
          <CardTitle hint={<>
            <p className="hhead">{t('Dán từ Excel hoặc bảng điểm')}</p>
            <ul>
              <li><b>{t('Mỗi dòng')}:</b> <code>{t('Tên môn ⇥ Số tín chỉ ⇥ Điểm 10')}</code></li>
              <li><b>{t('Cột thứ 4')}:</b> {t('học kỳ (tùy chọn).')}</li>
              <li><b>{t('Ngăn cách')}:</b> Tab, <code>;</code> {t('hoặc')} <code>|</code></li>
              <li><b>{t('Đang học')}:</b> {t('để trống điểm.')}</li>
            </ul></>}>{t('Nhập nhanh bằng cách dán')}</CardTitle>
          <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={t('Giải tích 1\t4\t8.4\nVật lí 1\t4\t6.5')} />
          <div className="form-row">
            <label>{t('Học kỳ mặc định')}<SemesterSelect value={sem} onChange={setSem} existing={data.attempts.map((a) => a.semester)} className="w300" /></label>
            <button disabled={!text.trim()} onClick={doPaste}>{t('Thêm vào bảng điểm')}</button>
          </div>
          {errors.length > 0 && (
            <ul className="errlist">{errors.map((e) => <li key={e.line}>{t('Dòng')} {e.line}: {t(e.reason)} — <code>{e.text}</code></li>)}</ul>
          )}
        </div>
      </>)}
    </div>
  );
}

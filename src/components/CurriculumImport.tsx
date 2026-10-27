import { useRef, useState } from 'react';
import type { AppData } from '../engine';
import type { CustomProgram } from '../data/curriculum';
import { MAX_CUSTOM, isBuiltinId, sanitizeCustomPrograms, validateProgram } from '../data/curriculum';
import { saveText } from '../files';
import { ConfirmButton } from './ConfirmButton';
import { CardTitle, useToast } from './ui';
import { t } from '../i18n';

interface Draft { file: string; program: CustomProgram; warnings: string[] }

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

/** Nhập chương trình đào tạo của ngành/khoa ngoài kho có sẵn: PDF mẫu "CHƯƠNG TRÌNH ĐÀO TẠO CỬ NHÂN KHÓA 20xx" hoặc file JSON đã xuất từ app. */
export function CurriculumImport({ data, onReplace }: { data: AppData; onReplace: (d: AppData) => void }) {
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [err, setErr] = useState('');
  const list = data.customPrograms ?? [];

  const read = async (f?: File) => {
    if (!f) return;
    setErr(''); setDraft(null);
    try {
      if (/\.json$/i.test(f.name)) {
        const raw = JSON.parse(await f.text());
        const p = sanitizeCustomPrograms([raw])[0];
        if (!p) throw new Error(t('File JSON không phải chương trình đào tạo hợp lệ hoặc đã trùng với chương trình có sẵn trong kho.'));
        setDraft({ file: f.name, program: p, warnings: validateProgram(p) });
      } else {
        const [{ extractItems }, { parseCurriculum }] = await Promise.all([import('../pdf/extract'), import('../pdf/curriculum')]);
        const r = parseCurriculum(await extractItems(await f.arrayBuffer()));
        const program = { ...r.program, source: f.name.replace(/\.pdf$/i, '') };
        setDraft({ file: f.name, program, warnings: [...r.warnings, ...validateProgram(program)] });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('Không đọc được file.'));
    } finally {
      if (ref.current) ref.current.value = '';
    }
  };

  const edit = (patch: Partial<CustomProgram>) => draft && setDraft({ ...draft, program: { ...draft.program, ...patch } });
  const p = draft?.program;
  const id = p ? `${p.year}-${p.major}` : '';
  const problem = !p ? '' : !p.majorName.trim() ? t('Hãy nhập tên ngành.')
    : !(p.year >= 2000 && p.year <= 2100) ? t('Khóa phải từ 2000 đến 2100.')
    : !p.major ? t('Hãy nhập mã ngành (chữ và số, dùng để phân biệt các ngành).')
    : !(p.credits > 0 && p.credits <= 400) ? t('Tổng tín chỉ không hợp lệ.')
    : isBuiltinId(id) ? t('Chương trình này đã có sẵn trong kho. Đổi mã ngành nếu đây là ngành khác.')
    : !list.some((x) => x.id === id) && list.length >= MAX_CUSTOM ? t('Đã đủ {n} chương trình, hãy xóa bớt.', { n: MAX_CUSTOM }) : '';
  const replacing = !!p && list.some((x) => x.id === id);

  const save = () => {
    if (!p || problem) return;
    const next = { ...p, id, majorName: p.majorName.trim(), ...(p.faculty?.trim() ? { faculty: p.faculty.trim() } : { faculty: undefined }) };
    onReplace({ ...data, customPrograms: [...list.filter((x) => x.id !== id), next] });
    setDraft(null);
    toast(t('Đã lưu chương trình {name}. Chọn ngành này ở mục Kế hoạch học kỳ.', { name: next.majorName }), { undo: true });
  };
  const remove = (pid: string) => onReplace({ ...data, customPrograms: list.filter((x) => x.id !== pid) });
  const exportOne = async (x: CustomProgram) => {
    const ok = await saveText(`ctdt-${x.id}.json`, JSON.stringify(x, null, 2), 'application/json', 'json');
    toast(ok ? t('Đã xuất file.') : t('Đã hủy.'));
  };

  return (
    <div className="card">
      <CardTitle hint={<ul>
        <li><b>{t('Dùng để')}:</b> {t('xếp kế hoạch học kỳ và tra điều kiện đăng ký cho ngành/khoa chưa có trong kho có sẵn.')}</li>
        <li><b>{t('Định dạng')}:</b> {t('PDF mẫu “CHƯƠNG TRÌNH ĐÀO TẠO CỬ NHÂN KHÓA 20xx” của trường (khóa 2024–2025), hoặc file JSON đã xuất từ app.')}</li>
        <li><b>{t('Riêng tư')}:</b> {t('file đọc ngay trên máy, không gửi đi đâu.')}</li>
      </ul>}>{t('Nhập chương trình đào tạo ngành khác')}</CardTitle>
      <p className="muted small">{t('Ngành hoặc khoa chưa có trong kho có sẵn: chọn file PDF chương trình đào tạo (hoặc JSON), kiểm tra lại rồi lưu.')}</p>
      <div className="btn-row"><button onClick={() => ref.current?.click()}>{t('Chọn PDF/JSON chương trình…')}</button></div>
      <input ref={ref} type="file" accept=".pdf,application/pdf,.json,application/json" hidden onChange={(e) => void read(e.target.files?.[0])} />
      {err && <p className="err small" role="alert">{err}</p>}

      {p && draft && (
        <div className="stack">
          <p><b>{draft.file}</b> · {t('{n} nhóm, {m} môn', { n: p.groups.length, m: p.courses.length })}</p>
          <div className="form-row">
            <label>{t('Khoa')}<input value={p.faculty ?? ''} onChange={(e) => edit({ faculty: e.target.value })} /></label>
            <label>{t('Khóa')}<input type="number" value={p.year || ''} onChange={(e) => edit({ year: parseInt(e.target.value, 10) || 0 })} /></label>
            <label>{t('Mã ngành')}<input value={p.major} onChange={(e) => edit({ major: slug(e.target.value) })} /></label>
          </div>
          <div className="form-row">
            <label>{t('Tên ngành')}<input value={p.majorName} onChange={(e) => edit({ majorName: e.target.value })} /></label>
            <label>{t('Tổng tín chỉ')}<input type="number" value={p.credits || ''} onChange={(e) => edit({ credits: parseFloat(e.target.value) || 0 })} /></label>
          </div>
          {p.groups.map((g, gi) => (
            <details key={gi}>
              <summary>{g.id ? `${g.id}. ` : ''}{g.t} <small className="muted">· {g.kind === 'tc' ? t('tự chọn') : t('bắt buộc')}{g.req !== undefined ? `, ${t('cần {n} tín chỉ', { n: g.req })}` : ''} · {t('{n} môn', { n: p.courses.filter((c) => c[1] === gi).length })}</small></summary>
              <p className="small">{p.courses.filter((c) => c[1] === gi).map(([code]) => `${code} ${p.names[code]?.n ?? ''}`).join('; ')}</p>
            </details>
          ))}
          {draft.warnings.length > 0 && <details className="small" open={draft.warnings.length <= 4}><summary className="warnnote">{t('{n} cảnh báo', { n: draft.warnings.length })}</summary>{draft.warnings.slice(0, 40).map((w, i) => <p key={i} className="warnnote small">{t(w)}</p>)}</details>}
          {problem && <p className="err small" role="alert">{problem}</p>}
          {replacing && !problem && <p className="warnnote small">{t('Đã có chương trình {id}; lưu sẽ thay thế bản cũ.', { id })}</p>}
          <div className="btn-row">
            <button className="primary" disabled={!!problem} onClick={save}>{t('Lưu chương trình')}</button>
            <button onClick={() => setDraft(null)}>{t('Hủy')}</button>
          </div>
        </div>
      )}

      {list.length > 0 && (
        <div className="tblwrap"><table className="tbl compact">
          <thead><tr><th>{t('Ngành')}</th><th>{t('Khóa')}</th><th>{t('Khoa')}</th><th className="center">{t('Môn')}</th><th /></tr></thead>
          <tbody>{list.map((x) => (
            <tr key={x.id}><td>{x.majorName}</td><td>{x.year}</td><td>{x.faculty ?? ''}</td><td className="center">{x.courses.length}</td>
              <td><span className="btn-row"><button className="ghost" onClick={() => void exportOne(x)}>{t('Xuất JSON')}</button>
                <ConfirmButton label={t('Xóa')} question={t('Xóa chương trình này?')} onConfirm={() => remove(x.id)} /></span></td></tr>))}</tbody>
        </table></div>
      )}
    </div>
  );
}

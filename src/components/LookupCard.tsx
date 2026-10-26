import { useMemo, useState } from 'react';
import type { Student } from '../engine';
import type { Lookup } from '../data/lookup';
import { norm } from '../data/lookup';
import { COURSE_DB, PROGRAMS } from '../data/programs';
import { describeCond, parseCond } from '../data/prereq';
import { t } from '../i18n';

const ORIGIN = { program: 'Tiến độ của bạn', transcript: 'Bảng điểm của bạn', catalog: 'Danh mục có sẵn' } as const;
const HAVE_YEARS = [...new Set(PROGRAMS.map((p) => p.year))].sort();
/** Khóa 2025 của Khoa chưa có file chương trình đào tạo: tạm dùng chương trình gần nhất trước đó (2024) để tra cứu. */
const YEARS = [...new Set([...HAVE_YEARS, 2025])].sort();
const baseYear = (y: number) => [...HAVE_YEARS].reverse().find((v) => v <= y) ?? HAVE_YEARS[0];
const MAJORS = [...new Map(PROGRAMS.map((p) => [p.major, p.majorName])).entries()];

/** Đoán khóa và ngành của sinh viên từ MSSV / năm áp dụng / tên ngành để chọn sẵn chương trình phù hợp. */
export function guessProgram(s?: Student): { year: number; major: string } {
  const y = parseInt(s?.appliedYear ?? '', 10) || (s?.id && /^\d{2}/.test(s.id) ? 2000 + parseInt(s.id.slice(0, 2), 10) : 0);
  const year = y ? [...YEARS].reverse().find((v) => v <= y) ?? YEARS[0] : YEARS[0];
  const m = norm(s?.major ?? '');
  const major = /thiet ke vi mach/.test(m) ? 'TKVM' : /vien thong/.test(m) ? 'DVT' : /dieu khien/.test(m) ? 'DTH' : /^ky thuat dien$/.test(m) || /\bdien\b/.test(m) && !/dien tu/.test(m) ? 'KDI' : 'DTH';
  return { year, major };
}

function Cond({ expr }: { expr: string }) {
  const c = useMemo(() => parseCond(expr), [expr]);
  if (!c) return <>{expr || '—'}</>;
  return <>{describeCond(c)}</>;
}

export function LookupCard({ lookup, student }: { lookup: Lookup; student?: Student }) {
  const [q, setQ] = useState('');
  const g = useMemo(() => guessProgram(student), [student?.appliedYear, student?.id, student?.major]); // eslint-disable-line react-hooks/exhaustive-deps
  const [year, setYear] = useState(g.year);
  const [major, setMajor] = useState(g.major);
  const progYear = baseYear(year);
  const prog = PROGRAMS.find((p) => p.year === progYear && p.major === major);
  const majors = MAJORS.filter(([m]) => PROGRAMS.some((p) => p.year === progYear && p.major === m));
  const res = lookup.search(q, 12);
  const condOf = (code: string) => prog?.courses.find((c) => c[0] === code);
  return (
    <details className="card">
      <summary><b>{t('Tra cứu mã môn ⇄ tên môn')}</b> <small className="muted">({t('{n} môn', { n: lookup.entries.length })})</small></summary>
      <p className="muted small">{t('Gõ mã (EE3017) hoặc tên (giải tích, “control”) để xem môn tương ứng. Nguồn: form Tiến độ và Bảng điểm bạn đã nhập, bổ sung {source}. Ngành khác chưa có trong danh mục có sẵn, nhưng môn nào đã có trong bảng điểm/tiến độ của bạn vẫn tra được.', { source: t('chương trình đào tạo Khoa Điện - Điện tử khóa 2023, 2024, 2026 (hcmut.edu.vn)') })}</p>
      <div className="form-row">
        <label>{t('Khóa')}<select value={year} onChange={(e) => { const y = +e.target.value; setYear(y); if (!PROGRAMS.some((p) => p.year === baseYear(y) && p.major === major)) setMajor(PROGRAMS.find((p) => p.year === baseYear(y))!.major); }} aria-label={t('Khóa chương trình đào tạo')}>
          {YEARS.map((y) => <option key={y} value={y}>{t('Khóa {y}', { y })}</option>)}</select></label>
        <label>{t('Ngành')}<select value={major} onChange={(e) => setMajor(e.target.value)} aria-label={t('Ngành chương trình đào tạo')}>
          {majors.map(([m, n]) => <option key={m} value={m}>{t(n)}</option>)}</select></label>
      </div>
      {year !== progYear && <p className="muted small">{progYear === 2024 && year === 2025 ? t('Khóa 2024 và 2025 dùng chung 1 chương trình đào tạo.') : t('Khoa chưa có file chương trình đào tạo khóa {y}; tạm hiển thị chương trình khóa {b} để tra cứu. Hãy đối chiếu khi Khoa công bố bản mới.', { y: year, b: progYear })}</p>}
      <input className="search" placeholder={t('Mã hoặc tên môn')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('Tra cứu mã hoặc tên môn')} />
      {q.trim() !== '' && (res.length === 0 ? <p className="muted">{t('Không tìm thấy.')}</p> :
        <div className="tblwrap"><table className="tbl compact"><thead><tr><th>{t('Mã môn')}</th><th>{t('Tên môn học')}</th><th>{t('Tên tiếng Anh')}</th><th className="center">{t('Tín chỉ')}</th><th>{t('Điều kiện đăng ký (khóa {y})', { y: year })}</th><th>{t('Nguồn')}</th></tr></thead>
          <tbody>{res.map((e) => { const pc = condOf(e.code); return (
            <tr key={e.code}><td><b>{e.code}</b></td><td>{e.name}</td><td className="muted">{e.en ?? ''}</td><td className="center">{e.credits ?? ''}</td>
              <td className="small">{pc ? (pc[2] ? <Cond expr={pc[2]} /> : <span className="muted">{t('không có')}</span>) : <span className="muted">{t('không thuộc chương trình này')}</span>}</td>
              <td className="muted small">{t(ORIGIN[e.origin])}</td></tr>); })}</tbody></table></div>)}

      {prog && (
        <details className="legend">
          <summary><b>{t('Chương trình đào tạo khóa {y}: {name}', { y: progYear, name: t(prog.majorName) })}</b> <small className="muted">({t('{n} môn, {c} tín chỉ', { n: prog.courses.length, c: prog.credits })})</small></summary>
          <p className="muted small">{t('Chỉ để tra cứu nhóm kiến thức và điều kiện đăng ký học phần (TQ tiên quyết, HT học trước, SH song hành, KN khuyến nghị). Khóa 2023 và 2024 của Khoa chỉ ghi danh sách điều kiện, không phân biệt “và/hoặc”. Chương trình có thể được Khoa điều chỉnh, hãy đối chiếu bản mới nhất.')}</p>
          {prog.groups.map((gr, gi) => {
            const cs = prog.courses.filter((c) => c[1] === gi);
            return (
              <div key={gi} style={{ marginLeft: Math.max(0, gr.lvl - 1) * 14 }}>
                <h4>{gr.id ? `${gr.id}. ` : ''}{t(gr.t)} <small className="muted">· {gr.kind === 'tc' ? t('tự chọn') : t('bắt buộc')}{gr.req !== undefined ? `, ${t(gr.unit === 'mon' ? 'cần {n} môn' : 'cần {n} tín chỉ', { n: gr.req })}` : ''}</small></h4>
                <div className="tblwrap"><table className="tbl compact"><thead><tr><th>{t('Mã môn')}</th><th>{t('Tên môn học')}</th><th className="center">{t('Tín chỉ')}</th><th>{t('Điều kiện đăng ký')}</th></tr></thead>
                  <tbody>{cs.map(([code, , pre]) => <tr key={code}><td><b>{code}</b></td><td>{COURSE_DB[code]?.n}{COURSE_DB[code]?.e && <small className="muted"> · {COURSE_DB[code].e}</small>}</td><td className="center">{COURSE_DB[code]?.c}</td><td className="small">{pre ? <Cond expr={pre} /> : <span className="muted">—</span>}</td></tr>)}</tbody></table></div>
              </div>);
          })}
        </details>
      )}
    </details>
  );
}

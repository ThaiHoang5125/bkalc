import { useMemo, useState } from 'react';
import type { AppData } from '../engine';
import { bandOf, effectiveAttempts, keyer } from '../engine';
import { FREE_MAJORS, FREE_SOURCE, guessFreeMajor } from '../data/freeElectives';
import type { FreeStatus } from '../data/freeElectives';
import { norm } from '../data/lookup';
import { fmt } from '../format';
import { t } from '../i18n';

const LABEL: Record<FreeStatus, string> = { free: 'Tính được là tự chọn tự do', excluded: 'Không được tính', once: 'Chỉ tính 1 lần', other: 'Có điều kiện / trùng lắp' };
const CLS: Record<FreeStatus, string> = { free: 'good', excluded: 'bad', once: 'warn', other: 'warn' };

/** Chỉ LIỆT KÊ danh sách môn tự chọn tự do do Khoa công bố; không phải gợi ý nên học môn nào. */
export function FreeList({ data }: { data: AppData }) {
  const guess = guessFreeMajor(data.student?.major, data.student?.className, data.program?.groups.map((g) => g.name).join(' '));
  const [major, setMajor] = useState(guess ?? FREE_MAJORS[0].key);
  const [st, setSt] = useState<'all' | FreeStatus>('all');
  const [q, setQ] = useState('');
  const m = FREE_MAJORS.find((x) => x.key === major) ?? FREE_MAJORS[0];
  const k = useMemo(() => keyer(data.attempts), [data.attempts]);
  const done = useMemo(() => new Map(effectiveAttempts(data.attempts, data.settings.retakePolicy).map((a) => [k(a), a])), [data.attempts, data.settings.retakePolicy, k]);
  const nq = norm(q);
  const rows = m.courses.filter((r) => (st === 'all' || r[2] === st) && (!nq || norm(`${r[0]} ${r[1]}`).includes(nq)));
  return (
    <div className="card">
      <div className="head-row"><h3>{t('Danh sách môn tự chọn tự do (chỉ để tham khảo)')}</h3><span className="tagx warn">{t('Chưa đầy đủ, đang bổ sung thêm')}</span></div>
      <div className="warnbox" role="note"><b>{t('Lưu ý để tránh hiểu lầm:')}</b> {t('đây chỉ là danh sách liệt kê theo file')} “{FREE_SOURCE}”. App <b>{t('không gợi ý')}</b> {t('bạn nên học môn nào. Môn có thể không mở lớp mỗi học kỳ; số tín chỉ, điều kiện tiên quyết và việc môn có được công nhận hay không hãy xác nhận lại với Khoa/BKSI. File nguồn của Khoa không ghi số tín chỉ.')}</div>
      <div className="form-row">
        <label>{t('Ngành / chương trình')}<select value={major} onChange={(e) => setMajor(e.target.value)}>{FREE_MAJORS.map((x) => <option key={x.key} value={x.key}>{t(x.label)}</option>)}</select></label>
        <label>{t('Lọc theo trạng thái')}<select value={st} onChange={(e) => setSt(e.target.value as 'all' | FreeStatus)}><option value="all">{t('Tất cả')}</option>{(Object.keys(LABEL) as FreeStatus[]).map((x) => <option key={x} value={x}>{t(LABEL[x])}</option>)}</select></label>
        <label className="grow">{t('Tìm môn')}<input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Mã hoặc tên môn')} /></label>
      </div>
      {!guess && <p className="muted small">{t('Chưa nhận ra ngành của bạn nên đang hiện “{label}”. Chọn đúng ngành ở ô trên.', { label: m.label })}</p>}
      <details className="grp">
        <summary><span className="gtitle">{t('{n} môn', { n: rows.length })}</span></summary>
        <div className="tblwrap"><table className="tbl compact grid">
          <thead><tr><th>{t('Mã môn - Tên môn')}</th><th>{t('Trạng thái theo Khoa')}</th><th>{t('Ghi chú')}</th><th>{t('Bạn đã học')}</th></tr></thead>
          <tbody>{rows.map((r) => {
            const a = done.get(r[0]);
            return (
              <tr key={r[0]}>
                <td><b>{r[0]}</b> - {r[1]}</td>
                <td><span className={`tagx ${CLS[r[2]]}`}>{t(LABEL[r[2]])}</span>{r[2] === 'other' && r[3] && <small className="tag">{r[3]}</small>}</td>
                <td className="small muted">{r[4]}</td>
                <td className="small">{a ? <>{fmt(a.score, 1)} ({bandOf(a.score as number).letter})</> : <span className="muted">—</span>}</td>
              </tr>);
          })}</tbody>
        </table></div>
      </details>
    </div>
  );
}

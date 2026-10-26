import { EFFORT_FALLBACK_AVG, EFFORT_OFFSETS, HARDNESS_STEPS, SPREAD_WARN, effort } from '../engine';
import type { EffortBase } from '../engine';
import { fmt } from '../format';
import { t } from '../i18n';

const CLS = ['good', 'good', 'warn', 'bad', 'bad'] as const;

/** Giải thích cụ thể cách đánh giá “Dễ / Vừa sức / Cần cố gắng / Rất khó” cho điểm cần đạt hệ 10. */
export function EffortLegend({ avg10, needed, what = t('điểm cần đạt'), basis }: { avg10: number | null; needed?: number | null; what?: string; basis?: EffortBase }) {
  const b = basis ? basis.base : avg10 ?? EFFORT_FALLBACK_AVG;
  const o = EFFORT_OFFSETS;
  const TB = basis ? t('mốc') : 'TB';
  const rows: { label: string; rule: string; range: string; level: number }[] = [
    { label: t('Đã đủ'), rule: `${what} ≤ 0`, range: t('không cần thêm điểm'), level: 0 },
    { label: t('Dễ'), rule: `${what} ≤ ${TB} − ${-o.easy}`, range: `≤ ${fmt(b + o.easy, 2)}`, level: 0 },
    { label: t('Vừa sức'), rule: `${TB} − ${-o.easy} < ${what} ≤ ${TB} + ${o.fit}`, range: t('{v1} đến {v2}', { v1: fmt(b + o.easy, 2), v2: fmt(b + o.fit, 2) }), level: 1 },
    { label: t('Cần cố gắng'), rule: `${TB} + ${o.fit} < ${what} ≤ ${TB} + ${o.hard}`, range: t('{v1} đến {v2}', { v1: fmt(b + o.fit, 2), v2: fmt(b + o.hard, 2) }), level: 2 },
    { label: t('Rất khó'), rule: t('{what} > TB + {hard} (và ≤ 10)', { what, hard: o.hard }).replace('TB', TB), range: t('{v1} đến 10', { v1: fmt(b + o.hard, 2) }), level: 3 },
    { label: t('Không khả thi'), rule: `${what} > 10`, range: t('trên 10, không thể đạt'), level: 4 },
  ];
  const e = needed === undefined || needed === null ? null : effort(needed, b);
  return (
    <details className="legend">
      <summary><b>{t('Cách đánh giá “Dễ / Vừa sức / Cần cố gắng / Rất khó”')}</b></summary>
      {basis && basis.p !== null ? (<>
        <p className="small">{t('So')} {what} {t('(hệ 10) với')} <b>{t('mốc')} = {fmt(basis.base, 2)}</b>. {t('Mốc trộn điểm các thành phần đã có của chính môn này với điểm trung bình hệ 10 toàn bộ, theo tỷ lệ trọng số đã có điểm:')}</p>
        <p className="small">{t('mốc = α × P + (1 − α) × TB')} = {fmt(basis.alpha, 2)} × {fmt(basis.p, 2)} + {fmt(1 - basis.alpha, 2)} × {fmt(basis.avg, 2)} = <b>{fmt(basis.base, 2)}</b></p>
        <ul className="small">
          <li>{t('P = trung bình có trọng số của các thành phần đã có điểm thật (điểm “dự kiến” không tính)')}: {fmt(basis.p, 2)}</li>
          <li>{t('α = phần trọng số đã có điểm')}: {fmt(basis.alpha * 100, 0)}%. {t('Có càng nhiều điểm thì mốc càng bám theo môn này.')}</li>
          <li>{t('TB = điểm trung bình hệ 10 toàn bộ')}: {fmt(basis.avg, 2)}{basis.fallback ? t(', tạm lấy 7 vì chưa có điểm') : ''}</li>
        </ul>
        {basis.rough && <p className="note small">{t('Ước lượng sơ bộ: mới có ít điểm thành phần nên mốc chủ yếu dựa vào điểm trung bình toàn bộ của bạn.')}</p>}
        {basis.spread !== null && basis.spread > SPREAD_WARN && <p className="note small">{t('Điểm các thành phần đã có chênh nhau {d} điểm, mức đánh giá kém chắc chắn. Thí nghiệm, bài tập thường điểm cao hơn thi cuối kỳ.', { d: fmt(basis.spread, 1) })}</p>}
      </>) : (
      <p className="small">{t('So')} {what} {t('(hệ 10) với')} <b>{t('điểm trung bình hệ 10 hiện tại của bạn')} ({t('TB')} = {fmt(avg10 ?? b, 2)}{avg10 === null ? t(', tạm lấy 7 vì chưa có điểm') : ''})</b>{basis ? t('. Môn này chưa có điểm thành phần nào; khi có, mốc sẽ pha thêm điểm của chính môn.') : ''}{t('. Ngưỡng tính theo công thức dưới đây và đổi theo TB của bạn mỗi khi điểm thay đổi.')}</p>)}
      
      <div className="tblwrap"><table className="tbl compact grid">
        <thead><tr><th>{t('Mức')}</th><th>{t('Điều kiện')}</th><th className="num">{t('Ứng với bạn')} ({what})</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.label}><td><span className={`tagx ${CLS[r.level]}`}>{t(r.label)}</span></td><td>{r.rule}</td><td className="num">{r.range}</td></tr>)}</tbody>
      </table></div>
      {e && needed !== undefined && needed !== null && <p className="small">{t('Ví dụ với số đang xem:')} {what} <b>{fmt(needed, 1)}</b>{basis ? t(', chênh so với mốc là') : t(', chênh so với TB là')} <b>{needed - b >= 0 ? '+' : '−'}{fmt(Math.abs(needed - b), 2)}</b> → <b>{t(e.label)}</b>.</p>}
      <p className="muted small">{t('Đây là thước đo tương đối theo năng lực hiện tại của bạn, không phản ánh độ khó thật của từng môn hay giảng viên.')}</p>
    </details>
  );
}

/** Giải thích mức khó của “điểm trung bình thang 4 cần đạt” ở trang Mục tiêu. */
export function HardnessLegend({ value }: { value?: number | null }) {
  let prev = -Infinity;
  return (
    <details className="legend">
      <summary><b>{t('Cách đánh giá mức khó của điểm TB thang 4 cần đạt')}</b></summary>
      <p className="small">{t('Điểm trung bình thang 4 mà các tín chỉ còn lại phải đạt (A, A+ = 4,0; B+ = 3,5; B = 3,0; C+ = 2,5; C = 2,0) được so với các ngưỡng cố định:')}</p>
      <div className="tblwrap"><table className="tbl compact grid">
        <thead><tr><th>{t('Mức')}</th><th className="num">{t('Điểm TB cần đạt (thang 4)')}</th><th>{t('Hình dung')}</th></tr></thead>
        <tbody>
          {HARDNESS_STEPS.map((h) => { const lo = prev; prev = h.max; return <tr key={h.label}><td><span className={`tagx ${h.cls}`}>{t(h.label)}</span></td><td className="num">{lo === -Infinity ? `≤ ${fmt(h.max, 2)}` : t('{v1} đến {v2}', { v1: fmt(lo, 2), v2: fmt(h.max, 2) })}</td>
            <td className="small">{h.max <= 2 ? t('chỉ cần quanh mức C') : h.max <= 2.8 ? t('khoảng C+ đến B') : h.max <= 3.4 ? t('khoảng B đến B+') : h.max <= 3.75 ? t('giữa B+ và A') : t('gần như toàn A/A+')}</td></tr>; })}
          <tr><td><span className="tagx bad">{t('Không thể')}</span></td><td className="num">&gt; 4,00</td><td className="small">{t('vượt thang điểm tối đa')}</td></tr>
        </tbody>
      </table></div>
      {value !== undefined && value !== null && value > 0 && <p className="small">{t('Với số đang xem: cần')} <b>{fmt(value, 3)}</b>/4.0 → {t('thuộc mức')} “{t(HARDNESS_STEPS.find((h) => value <= h.max)?.label ?? 'Không thể')}”.</p>}
    </details>
  );
}

import { useMemo } from 'react';
import type { AppData } from '../engine';
import { computeProgress, verify } from '../engine';
import { t } from '../i18n';

/** Đối chiếu số app tính với số in trên form của trường (chỉ hiện khi đã nhập PDF). */
export function OfficialCheck({ data }: { data: AppData }) {
  const checks = useMemo(() => (data.official ? verify(data.attempts, data.settings.retakePolicy, data.official) : []), [data]);
  const hint = useMemo(() => {
    if (!data.program || data.official?.credits === undefined) return '';
    const pr = computeProgress(data.program, data.attempts, data.settings.retakePolicy, data.freeCourses);
    const out = pr.outside.filter((a) => a.credits > 0);
    const over = pr.groups.filter((g) => g.overflow > 0);
    if (!out.length && !over.length) return '';
    const parts = [
      ...(out.length ? [t('môn ngoài chương trình: {list} ({n} tín chỉ)', { list: out.map((a) => a.code ?? a.name).join(', '), n: out.reduce((s, a) => s + a.credits, 0) })] : []),
      ...(over.length ? [t('khối đã đủ tín chỉ nên phần dư không được cộng: {list}', { list: over.map((g) => `${g.group.name} (+${g.overflow})`).join(', ') })] : []),
    ];
    return t('Nguyên nhân thường gặp: form Tiến độ chỉ cộng tín chỉ nằm trong chương trình và trong giới hạn từng khối, còn Bảng điểm cộng tất cả. Trong dữ liệu của bạn có {list}.', { list: parts.join('; ') });
  }, [data]);
  if (checks.length === 0) return null;
  const bad = checks.filter((c) => !c.ok);
  if (bad.length === 0) return <p className="ok small">{t('✓ Khớp form của trường ({length}/{length_} số liệu)', { length: checks.length, length_: checks.length })}</p>;
  return (
    <div className="card check bad">
      <h3>{t('Đối chiếu với form của trường')}</h3>
      <p className="err">{t('Lệch {length}/{length_} số liệu. Có thể bạn đã sửa/thêm môn sau khi nhập PDF, hoặc form của trường đã cập nhật.', { length: bad.length, length_: checks.length })}</p>
      {bad.some((c) => c.label === t('Tín chỉ tích lũy')) && hint && <p className="muted small">{hint}</p>}
      <table className="tbl compact">
        <thead><tr><th>{t('Hạng mục')}</th><th className="num">{t('App tính')}</th><th className="num">{t('Trường')}</th></tr></thead>
        <tbody>{bad.map((c) => <tr key={c.label}><td>{c.label}</td><td className="num">{c.computed}</td><td className="num">{c.official}</td></tr>)}</tbody>
      </table>
      <details><summary>{t('Xem tất cả')}</summary>
        <table className="tbl compact">
          <tbody>{checks.map((c) => <tr key={c.label}><td>{c.ok ? '✓' : '✗'} {c.label}</td><td className="num">{c.computed}</td><td className="num">{c.official}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}

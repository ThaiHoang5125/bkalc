import { useMemo } from 'react';
import { semesterChoices } from '../engine';
import { t } from '../i18n';

/** Chọn học kỳ theo lịch năm học: mặc định là học kỳ đang diễn ra hôm nay. `recentOnly`: chỉ kỳ hiện tại và kỳ kế tiếp (môn đang học). */
export function SemesterSelect({ value, onChange, existing, className, recentOnly }: { value: string; onChange: (v: string) => void; existing: string[]; className?: string; recentOnly?: boolean }) {
  const choices = useMemo(() => semesterChoices(recentOnly ? [] : existing), [existing, recentOnly]);
  const list = choices.some((c) => c.value === value) ? choices : [{ value, label: value, current: false }, ...choices];
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={className} aria-label={t('Học kỳ')}>
      {list.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
    </select>
  );
}

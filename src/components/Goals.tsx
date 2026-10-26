import { useState } from 'react';
import type { AppData, Attempt, Settings } from '../engine';
import { classify } from '../engine';
import { fmt } from '../format';
import { Courses } from './Courses';
import { Planner } from './Planner';
import { PageHeader } from './ui';
import { t } from '../i18n';

interface Props {
  data: AppData;
  view: 'target' | 'courses';
  setView: (v: string) => void;
  onSettings: (p: Partial<Settings>) => void;
  onAdd: (rows: Attempt[]) => void;
  onUpdate: (id: string, patch: Partial<Attempt>) => void;
  onRemove: (id: string) => void;
}

/** Trang Mục tiêu: điểm cần đạt để chạm GPA mục tiêu, và tính điểm cho các môn đang học. */
export function Goals({ data, view, setView, onSettings, onAdd, onUpdate, onRemove }: Props) {
  const [adding, setAdding] = useState(false);
  const target = data.settings.targetGpa;
  const sub = view === 'target' ? t('GPA mục tiêu {g} ({c})', { g: fmt(target), c: t(classify(target)) }) : t('Nhập điểm thành phần để biết cần đạt bao nhiêu ở phần còn lại');
  const primary = view === 'target'
    ? <button className="primary" onClick={() => { const el = document.getElementById('goal-gpa') as HTMLInputElement | null; el?.scrollIntoView({ block: 'center' }); el?.focus(); el?.select(); }}>{t('Đặt GPA mục tiêu')}</button>
    : <button className="primary" aria-expanded={adding} onClick={() => setAdding((v) => !v)}>{adding ? t('Đóng') : t('Thêm môn đang học')}</button>;
  return (
    <div className="page">
      <PageHeader title={t('Mục tiêu')} sub={sub} primary={primary} />
      <div className="toolbar">
        <div className="seg" role="group" aria-label={t('Chế độ')}>
          <button aria-pressed={view === 'target'} onClick={() => setView('target')}>{t('Điểm cần đạt')}</button>
          <button aria-pressed={view === 'courses'} onClick={() => setView('courses')}>{t('Tính điểm môn đang học')}</button>
        </div>
      </div>
      {view === 'target'
        ? <Planner data={data} onSettings={onSettings} />
        : <Courses data={data} adding={adding} onAdd={onAdd} onUpdate={onUpdate} onRemove={onRemove} />}
    </div>
  );
}

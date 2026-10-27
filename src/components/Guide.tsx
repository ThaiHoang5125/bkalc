import { useState } from 'react';
import type { ReactNode } from 'react';
import { t } from '../i18n';
import type { Go } from '../App';
import { PageHeader } from './ui';
import { STAGES, stepsFor } from '../guideSteps';
import type { Shot, Stage } from '../guideSteps';

const STAGE_KEY = 'hcmut-gpa-guide-stage';
const readStage = (): Stage => {
  try { const v = localStorage.getItem(STAGE_KEY); if (STAGES.some(([k]) => k === v)) return v as Stage; } catch { /* bỏ qua */ }
  return 'all';
};

/** `**chữ**` → in đậm */
const rich = (s: string): ReactNode[] => t(s).split('**').map((p, i) => (i % 2 ? <b key={i}>{p}</b> : p));

function Figure({ shot }: { shot: Shot }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <figure className="shot gshot">
      <img src={`guide/${shot.src}`} alt={t(shot.cap)} loading="lazy" onError={() => setBroken(true)} />
      <figcaption>{t(shot.cap)}</figcaption>
    </figure>
  );
}

export function Guide({ go }: { go: Go }) {
  const [stage, setStage] = useState<Stage>(readStage);
  const [idx, setIdx] = useState(0);
  const steps = stepsFor(stage);
  const i = Math.min(idx, steps.length - 1);
  const step = steps[i];
  const last = i === steps.length - 1;

  const pick = (s: Stage) => {
    setStage(s);
    setIdx(0);
    try { localStorage.setItem(STAGE_KEY, s); } catch { /* bỏ qua */ }
  };
  const move = (to: number) => { setIdx(to); window.scrollTo(0, 0); };

  return (
    <div className="stack">
      <PageHeader title={t('Hướng dẫn sử dụng')} sub={t('Ứng dụng giúp sinh viên tính GPA, theo dõi tiến độ chương trình đào tạo, lên kế hoạch học kỳ và xếp thời khóa biểu. Mọi dữ liệu chỉ nằm trên máy của bạn.')} />

      <div className="card guidetoc">
        <span className="muted small">{t('Bạn đang ở giai đoạn nào?')}</span>
        <div className="chips" role="group" aria-label={t('Bạn đang ở giai đoạn nào?')}>
          {STAGES.map(([k, label]) => <button key={k} className={`chip btn${stage === k ? ' on' : ''}`} aria-pressed={stage === k} onClick={() => pick(k)}>{t(label)}</button>)}
        </div>
        <ol className="gprog" aria-label={t('Tiến trình')}>
          {steps.map((s, n) => (
            <li key={s.id}><button className={n === i ? 'on' : n < i ? 'done' : ''} aria-current={n === i ? 'step' : undefined} onClick={() => move(n)} title={t(s.title)}>
              <span className="gdot">{n + 1}</span><span className="gname">{t(s.title)}</span>
            </button></li>
          ))}
        </ol>
      </div>

      <section className="card guide" key={step.id}>
        <div className="head-row">
          <div><span className="muted small">{t('Bước {n}/{total}', { n: i + 1, total: steps.length })}</span><h3>{t(step.title)}</h3></div>
          {step.page && <button className="ghost" onClick={() => go(step.page!, step.sub)}>{t('Mở trang này →')}</button>}
        </div>
        <ol className="gsteps">{step.lines.map((l) => <li key={l}>{rich(l)}</li>)}</ol>
        {step.shots.length > 0 && <div className="gshots">{step.shots.map((s) => <Figure key={s.src} shot={s} />)}</div>}
        {step.faq && (
          <dl className="faq">{step.faq.map(([q, a]) => <div key={q}><dt>{t(q)}</dt><dd>{t(a)}</dd></div>)}</dl>
        )}
        <div className="gnav">
          <button onClick={() => move(i - 1)} disabled={i === 0}>← {t('Quay lại')}</button>
          {last ? <button className="primary" onClick={() => go('overview')}>{t('Hoàn tất')}</button> : <button className="primary" onClick={() => move(i + 1)}>{t('Tiếp theo')} →</button>}
        </div>
      </section>
    </div>
  );
}

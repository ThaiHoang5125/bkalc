import { useState } from 'react';
import type { AppData } from '../engine';
import { bandOf } from '../engine';
import { CardTitle } from './ui';
import { t } from '../i18n';

const AV: [string, string][] = [['LA1003', 'Anh văn 1'], ['LA1005', 'Anh văn 2'], ['LA1007', 'Anh văn 3'], ['LA1009', 'Anh văn 4']];
/** Bảng quy đổi chứng chỉ → số môn Anh văn được xét miễn (theo trang “Ngoại ngữ” của trường): chỉ để xét miễn, không dùng xét tốt nghiệp. */
const VSTEP: [string, number][] = [['4.0', 1], ['4.5', 2], ['5.0', 3], ['5.5', 4]];
const EPT: [string, number][] = [['200', 0], ['218', 1], ['234', 2], ['250', 3], ['260', 4]];

/** Thẻ tiện ích: xét miễn Anh văn bằng VSTEP / VNU-EPT. */
export function Exemption({ data }: { data: AppData }) {
  const [kind, setKind] = useState<'vstep' | 'ept'>('vstep');
  const [score, setScore] = useState('');
  const status = (code: string) => {
    const a = data.attempts.filter((x) => (x.code ?? '').toUpperCase() === code && !x.excluded);
    if (a.some((x) => x.special === 'MT')) return 'exempt';
    if (a.some((x) => x.special === 'DT' || (x.score !== null && bandOf(x.score).passed))) return 'passed';
    return a.some((x) => x.score === null && !x.special) ? 'enrolled' : 'todo';
  };
  const table = kind === 'vstep' ? VSTEP : EPT;
  const n = table.find(([k]) => k === score)?.[1] ?? 0;
  const label = { exempt: t('đã miễn'), passed: t('đã đạt'), enrolled: t('đang học'), todo: t('chưa học') } as const;
  const needed = AV.slice(0, n).filter(([c]) => { const st = status(c); return st === 'todo' || st === 'enrolled'; });
  return (
    <div className="card">
      <CardTitle hint={<>
        <p className="hhead">{t('Xét miễn Anh văn')}</p>
        <ul>
          <li><b>{t('Nộp chứng chỉ')}:</b> {t('MyBK → Đăng ký nộp Chứng chỉ ngoại ngữ / Xét miễn (kèm ảnh hoặc bản scan), rồi đăng ký xét miễn và đóng lệ phí tại BKPay.')}</li>
          <li><b>{t('Thời hạn')}:</b> {t('chứng chỉ còn hiệu lực ít nhất 1 tháng khi nộp; nộp theo Lịch đăng ký môn học của học kỳ.')}</li>
          <li><b>{t('Điểm miễn')}:</b> {t('tính tín chỉ tích lũy, không tính vào điểm trung bình.')}</li>
          <li><b>{t('Anh văn theo nhu cầu (1A–4A)')}:</b> {t('đạt từ 5.5 tính Đạt cho môn Anh văn tương ứng (0 tín chỉ).')}</li>
          <li><b>VSTEP, VNU-EPT:</b> {t('chỉ xét miễn Anh văn 1–4, không dùng xét chuẩn ngoại ngữ tốt nghiệp. TOEFL iBT Home Edition không dùng cho cả hai.')}</li>
          <li><b>{t('Nói – Viết (tốt nghiệp)')}:</b> {t('tối thiểu “Đạt” = 200 điểm; chương trình tài năng và Kỹ sư Việt-Pháp: 245 điểm (kỳ kiểm tra do Trung tâm Ngoại ngữ ĐH Bách Khoa tổ chức).')}</li>
        </ul></>}>{t('Xét miễn Anh văn bằng VSTEP / VNU-EPT')}</CardTitle>
      <div className="chips">{AV.map(([c, nm]) => <span key={c} className="chip"><b>{t(nm)}</b> ({c}): {label[status(c)]}</span>)}</div>
      <div className="form-row mt">
        <label>{t('Chứng chỉ')}<select value={kind} onChange={(e) => { setKind(e.target.value as 'vstep' | 'ept'); setScore(''); }}><option value="vstep">VSTEP</option><option value="ept">VNU-EPT</option></select></label>
        <label>{t('Điểm')}<select value={score} onChange={(e) => setScore(e.target.value)}><option value="">—</option>{table.map(([k]) => <option key={k} value={k}>{k}{kind === 'ept' && k === '260' ? '+' : kind === 'vstep' && k === '5.5' ? '+' : ''}</option>)}</select></label>
      </div>
      {score && (n === 0
        ? <p className="muted small">{t('Mức này chỉ đạt “Anh văn cơ bản”, chưa đủ để miễn môn Anh văn nào.')}</p>
        : <p className={needed.length ? 'ok' : 'muted'}>{t('Có thể xét miễn Anh văn 1–{n}.', { n })} {needed.length ? t('Các môn bạn chưa có và sẽ được miễn: {l}.', { l: needed.map(([c, nm]) => t(nm) + ' (' + c + ')').join(', ') }) : t('Bạn đã có các môn này rồi.')}</p>)}
    </div>);
}

import { useState } from 'react';
import { t } from '../i18n';

/** Nút xóa hàng loạt: bấm lần đầu hiện câu hỏi xác nhận ngay trong app (không dùng hộp thoại của trình duyệt). */
export function ConfirmButton({ label, question, onConfirm, className = 'ghost' }: { label: string; question: string; onConfirm: () => void; className?: string }) {
  const [ask, setAsk] = useState(false);
  if (!ask) return <button className={className} onClick={() => setAsk(true)}>{label}</button>;
  return (
    <span className="btn-row" role="alertdialog" aria-label={question}>
      <span className="err small">{question}</span>
      <button className="danger" onClick={() => { setAsk(false); onConfirm(); }}>{t('Xác nhận xóa')}</button>
      <button onClick={() => setAsk(false)}>{t('Hủy')}</button>
    </span>
  );
}

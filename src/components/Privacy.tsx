import { createPortal } from 'react-dom';
import { t, useLang } from '../i18n';
import { PRIVACY_SUMMARY, privacyItems } from '../privacy';

/** Cửa sổ chính sách và quyền riêng tư (chỉ đọc). */
export function PrivacyDialog({ onClose }: { onClose: () => void }) {
  useLang();
  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-label={t('Chính sách và Quyền riêng tư')} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modalbox privacybox">
        <h3>🔒 {t('Chính sách và Quyền riêng tư')}</h3>
        <p>{t(PRIVACY_SUMMARY)}</p>
        <ol className="privacylist">{privacyItems().map((x) => <li key={x}>{t(x)}</li>)}</ol>
        <div className="btn-row"><button onClick={onClose}>{t('Đóng')}</button></div>
      </div>
    </div>, document.body);
}

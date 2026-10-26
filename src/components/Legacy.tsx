import { useEffect, useRef, useState } from 'react';
import type { AppData } from '../engine';
import type { VaultAccount } from '../accounts';
import { emptyData } from '../store';
import { saveData, unlockLegacy } from '../persist';
import { saveText } from '../files';
import { t, useLang } from '../i18n';
import { LangSwitch } from './ui';

/**
 * Chỉ hiện một lần cho người đã có tài khoản mã hóa từ bản cũ: nhập mật khẩu để giải mã,
 * sau đó dữ liệu được lưu thường và app không còn hỏi mật khẩu nữa.
 */
export function LegacyGate({ accounts, onDone }: { accounts: VaultAccount[]; onDone: (d: AppData) => void }) {
  useLang();
  const [sel, setSel] = useState(accounts[0].id);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [wipe, setWipe] = useState(false);
  const pwRef = useRef<HTMLInputElement>(null);
  useEffect(() => { pwRef.current?.focus(); }, [sel]);
  const acc = accounts.find((a) => a.id === sel) ?? accounts[0];
  const many = accounts.length > 1;

  const run = async (f: () => Promise<void>) => {
    setBusy(true); setErr(''); setInfo('');
    try { await f(); } catch (e) { setErr(e instanceof Error && e.message === 'wrong-password' ? t('Sai mật khẩu.') : t('Không thực hiện được, thử lại.')); }
    setBusy(false);
  };
  const adopt = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => { const d = await unlockLegacy(acc, pw); await saveData(d); onDone(d); });
  };
  const download = () => void run(async () => {
    const d = await unlockLegacy(acc, pw);
    const ok = await saveText(`hcmut-gpa-backup-${acc.name}.json`, JSON.stringify(d, null, 2), 'application/json', 'json');
    if (ok) setInfo(t('Đã tải bản sao lưu của “{name}”.', { name: acc.name }));
  });
  const reset = () => void run(async () => { const d = emptyData(); await saveData(d); onDone(d); });

  return (
    <div className="gate">
      <div className="gatebox">
        <div className="gatebrand"><img className="logo" src="icon.svg" alt="" aria-hidden /><div><b>BKalc</b><small>{t('Điểm tích lũy & tiến độ học tập')}</small></div><LangSwitch /></div>
        <h2>{t('Chuyển dữ liệu từ bản cũ')}</h2>
        <p className="muted small">{t('Phiên bản mới của BKalc không yêu cầu đăng nhập. Để giữ lại dữ liệu đã lưu, vui lòng xác thực bằng mật khẩu cũ một lần. Sau bước này, dữ liệu được lưu trực tiếp trên thiết bị của bạn và ứng dụng sẽ mở thẳng ở những lần sau.')}</p>

        {many && (
          <div className="acclist" role="radiogroup" aria-label={t('Chọn tài khoản')}>
            {accounts.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={a.id === sel} className={`accitem${a.id === sel ? ' on' : ''}`} onClick={() => { setSel(a.id); setErr(''); setInfo(''); setPw(''); }}>
                <span className="av" aria-hidden>{a.name.slice(0, 1).toUpperCase()}</span><span>{a.name}</span>
              </button>))}
          </div>
        )}

        <form onSubmit={adopt} className="gateform">
          <label>{many ? t('Mật khẩu của “{name}”', { name: acc.name }) : t('Mật khẩu')}<input ref={pwRef} type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></label>
          {err && <p className="err" role="alert">{err}</p>}
          {info && <p className="ok" role="status">{info}</p>}
          <button type="submit" className="primary" disabled={busy || !pw}>{busy ? t('Đang xử lý…') : t('Mở dữ liệu và tiếp tục')}</button>
          {many && <button type="button" disabled={busy || !pw} onClick={download}>{t('Chỉ tải bản sao lưu (.json) của tài khoản này')}</button>}
        </form>
        {many && <p className="warnbox">{t('Chỉ một tài khoản được giữ lại làm dữ liệu của app; các tài khoản còn lại sẽ bị xóa. Muốn giữ dữ liệu của tài khoản khác, hãy tải bản sao lưu của nó trước, sau này khôi phục ở Dữ liệu & cài đặt.')}</p>}

        {!wipe ? <div className="gatelinks"><button type="button" className="linkbtn danger" onClick={() => setWipe(true)}>{t('Quên mật khẩu? Bỏ dữ liệu cũ và bắt đầu mới…')}</button></div> : (
          <div className="warnbox err">
            <p>{t('Xóa vĩnh viễn toàn bộ dữ liệu cũ trên máy này và bắt đầu với dữ liệu trống? Không thể hoàn tác.')}</p>
            <div className="btn-row"><button className="danger" disabled={busy} onClick={reset}>{t('Xóa vĩnh viễn')}</button><button onClick={() => setWipe(false)}>{t('Hủy')}</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

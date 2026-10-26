import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Session } from '../vault';
import { MIN_PASSWORD, changeAccountPassword, getVault, hasLegacy, login, register, removeAccount } from '../vault';
import { LANGS, setLang, t, useLang } from '../i18n';
import { PRIVACY_ITEMS, PRIVACY_SUMMARY, acceptPrivacy, hasAcceptedPrivacy } from '../privacy';

/** Cửa sổ chính sách và quyền riêng tư. Có `onAccept` thì hiện ô tick + nút Đồng ý (màn hình đăng nhập); không có thì chỉ đọc. */
export function PrivacyDialog({ onClose, onAccept }: { onClose: () => void; onAccept?: () => void }) {
  useLang();
  const [tick, setTick] = useState(false);
  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-label={t('Chính sách và Quyền riêng tư')} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modalbox privacybox">
        <h3>🔒 {t('Chính sách và Quyền riêng tư')}</h3>
        <p>{t(PRIVACY_SUMMARY)}</p>
        <ol className="privacylist">{PRIVACY_ITEMS.map((x) => <li key={x}>{t(x)}</li>)}</ol>
        {onAccept && <label className="check small"><input type="checkbox" checked={tick} onChange={(e) => setTick(e.target.checked)} /> {t('Tôi đã đọc và đồng ý với chính sách quyền riêng tư')}</label>}
        <div className="btn-row">
          {onAccept && <button className="primary" disabled={!tick} onClick={onAccept}>{t('Đồng ý')}</button>}
          <button onClick={onClose}>{t('Đóng')}</button>
        </div>
      </div>
    </div>, document.body);
}

export function LangSwitch() {
  const lang = useLang();
  return (
    <label className="langsw" title={t('Ngôn ngữ')}>
      <span aria-hidden>🌐</span>
      <select value={lang} onChange={(e) => setLang(e.target.value as 'vi' | 'en')} aria-label={t('Ngôn ngữ')}>{LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select>
    </label>
  );
}

const errText = (e: unknown) => {
  const m = e instanceof Error ? e.message : '';
  return m === 'wrong-password' ? t('Sai mật khẩu.') : m === 'name-taken' ? t('Tên tài khoản đã tồn tại.') : m === 'no-name' ? t('Nhập tên tài khoản.') : m === 'short-password' ? t('Mật khẩu cần ít nhất {n} ký tự.', { n: MIN_PASSWORD }) : t('Không thực hiện được, thử lại.');
};

export function AuthGate({ onLogin }: { onLogin: (s: Session) => void }) {
  useLang();
  const accounts = getVault().accounts;
  const last = getVault().last;
  const [mode, setMode] = useState<'login' | 'register'>(accounts.length ? 'login' : 'register');
  const [sel, setSel] = useState<string>(accounts.find((a) => a.id === last)?.id ?? accounts[0]?.id ?? '');
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [adopt, setAdopt] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(hasAcceptedPrivacy);
  const [showPolicy, setShowPolicy] = useState(false);
  const [del, setDel] = useState(false);
  const [delName, setDelName] = useState('');
  const [, bump] = useState(0);
  const pwRef = useRef<HTMLInputElement>(null);
  useEffect(() => { pwRef.current?.focus(); }, [mode, sel]);

  const run = async (f: () => Promise<Session>) => { setBusy(true); setErr(''); try { onLogin(await f()); } catch (e) { setErr(errText(e)); setBusy(false); } };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    if (mode === 'login') void run(() => login(sel, pw));
    else if (pw !== pw2) setErr(t('Hai mật khẩu chưa giống nhau.'));
    else void run(() => register(name, pw, adopt));
  };
  const selAcc = accounts.find((a) => a.id === sel);

  return (
    <div className="gate">
      <div className="gatebox">
        <div className="gatebrand"><img className="logo" src="icon.svg" alt="" aria-hidden /><div><b>BKalc</b><small>{t('Điểm tích lũy & tiến độ học tập')}</small></div><LangSwitch /></div>
        <h2>{mode === 'login' ? t('Đăng nhập') : accounts.length ? t('Tạo tài khoản mới') : t('Tạo tài khoản đầu tiên')}</h2>

        {mode === 'login' && accounts.length > 0 && (
          <div className="acclist" role="radiogroup" aria-label={t('Chọn tài khoản')}>
            {accounts.map((a) => (
              <button key={a.id} type="button" role="radio" aria-checked={a.id === sel} className={`accitem${a.id === sel ? ' on' : ''}`} onClick={() => { setSel(a.id); setErr(''); setPw(''); setDel(false); }}>
                <span className="av" aria-hidden>{a.name.slice(0, 1).toUpperCase()}</span><span>{a.name}</span>
              </button>))}
          </div>
        )}

        <form onSubmit={submit} className="gateform">
          {mode === 'register' && <label>{t('Tên tài khoản')}<input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder={t('Ví dụ: Tên của bạn')} maxLength={40} autoComplete="off" /></label>}
          <label>{t('Mật khẩu')}<input ref={pwRef} type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
          {mode === 'register' && <label>{t('Nhập lại mật khẩu')}<input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></label>}
          {mode === 'register' && hasLegacy() && <label className="check small"><input type="checkbox" checked={adopt} onChange={(e) => setAdopt(e.target.checked)} /> {t('Chuyển dữ liệu đã có trên máy này vào tài khoản mới')}</label>}
          {mode === 'register' && <p className="muted small">{t('Mật khẩu cần ít nhất {n} ký tự. Quên mật khẩu thì không khôi phục được.', { n: MIN_PASSWORD })}</p>}
          {err && <p className="err" role="alert">{err}</p>}
          <button type="submit" className="primary" disabled={busy || !agreed || (mode === 'login' ? !sel : !name.trim())}>{busy ? t('Đang xử lý…') : mode === 'login' ? t('Đăng nhập') : t('Tạo tài khoản')}</button>
        </form>

        <div className="gatelinks">
          {mode === 'login' ? <button type="button" className="linkbtn" onClick={() => { setMode('register'); setErr(''); setPw(''); }}>{t('+ Tạo tài khoản mới')}</button>
            : accounts.length > 0 && <button type="button" className="linkbtn" onClick={() => { setMode('login'); setErr(''); setPw(''); setPw2(''); }}>{t('← Quay lại đăng nhập')}</button>}
          {mode === 'login' && selAcc && !del && <button type="button" className="linkbtn danger" onClick={() => setDel(true)}>{t('Xóa tài khoản này…')}</button>}
        </div>
        {del && selAcc && (
          <div className="warnbox">
            <p>{t('Xóa tài khoản “{name}” sẽ xóa vĩnh viễn toàn bộ dữ liệu của tài khoản này trên máy. Gõ đúng tên tài khoản để xác nhận.', { name: selAcc.name })}</p>
            <div className="btn-row"><input value={delName} onChange={(e) => setDelName(e.target.value)} placeholder={selAcc.name} aria-label={t('Gõ tên tài khoản để xác nhận')} />
              <button className="danger" disabled={delName.trim().toLowerCase() !== selAcc.name.toLowerCase()} onClick={async () => { await removeAccount(selAcc.id); setDel(false); setDelName(''); const rest = getVault().accounts; setSel(rest[0]?.id ?? ''); if (!rest.length) setMode('register'); bump((x) => x + 1); }}>{t('Xóa vĩnh viễn')}</button>
              <button onClick={() => { setDel(false); setDelName(''); }}>{t('Hủy')}</button></div>
          </div>
        )}
        <div className="gatelinks">
          <button type="button" className="linkbtn" onClick={() => setShowPolicy(true)}>🔒 {t('Chính sách và Quyền riêng tư')}</button>
          <span className={agreed ? 'muted small' : 'err small'}>{agreed ? t('✓ Đã đồng ý') : t('Cần đồng ý chính sách để tiếp tục')}</span>
        </div>
        {showPolicy && <PrivacyDialog onClose={() => setShowPolicy(false)} onAccept={agreed ? undefined : () => { acceptPrivacy(); setAgreed(true); setShowPolicy(false); }} />}
      </div>
    </div>
  );
}

export function AccountMenu({ session, onSession, onLogout, onGo }: { session: Session; onSession: (s: Session) => void; onLogout: () => void; onGo?: (sub: 'data' | 'settings' | 'guide') => void }) {
  useLang();
  const [open, setOpen] = useState(false);
  const [dlg, setDlg] = useState<null | 'pw' | 'privacy'>(null);
  const [o, setO] = useState(''); const [n1, setN1] = useState(''); const [n2, setN2] = useState('');
  const [err, setErr] = useState(''); const [ok, setOk] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const close = () => { setDlg(null); setO(''); setN1(''); setN2(''); setErr(''); setOk(false); };
  const submitPw = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (n1 !== n2) return setErr(t('Hai mật khẩu mới chưa giống nhau.'));
    try { onSession(await changeAccountPassword(session, o, n1)); setOk(true); setO(''); setN1(''); setN2(''); } catch (x) { setErr(errText(x)); }
  };
  return (
    <div className="acct" ref={ref}>
      <button className="acctbtn" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label={t('Tài khoản')} title={t('Tài khoản')}>
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><circle cx="12" cy="8" r="4" fill="currentColor" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z" fill="currentColor" /></svg>
        <span className="acctname">{session.name}</span>
      </button>
      {open && (
        <div className="acctmenu" role="menu">
          <div className="acctwho"><b>{session.name}</b><small>{t('Đang đăng nhập · dữ liệu chỉ ở máy này')}</small></div>
          {onGo && <button role="menuitem" onClick={() => { setOpen(false); onGo('data'); }}>{t('Dữ liệu: nhập, sao lưu')}</button>}
          {onGo && <button role="menuitem" onClick={() => { setOpen(false); onGo('settings'); }}>{t('Cài đặt')}</button>}
          {onGo && <button role="menuitem" onClick={() => { setOpen(false); onGo('guide'); }}>{t('Hướng dẫn')}</button>}
          <button role="menuitem" onClick={() => { setOpen(false); setDlg('privacy'); }}>{t('Chính sách và Quyền riêng tư')}</button>
          <button role="menuitem" onClick={() => { setOpen(false); setDlg('pw'); }}>{t('Đổi mật khẩu')}</button>
          <button role="menuitem" onClick={() => { setOpen(false); onLogout(); }}>{t('Đăng xuất / đổi tài khoản')}</button>
        </div>
      )}
      {dlg === 'privacy' && <PrivacyDialog onClose={close} />}
      {dlg === 'pw' && createPortal(
        <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="modalbox">
            {dlg === 'pw' && (
              <form onSubmit={submitPw} className="gateform">
                <h3>{t('Đổi mật khẩu')}</h3>
                <label>{t('Mật khẩu hiện tại')}<input type="password" value={o} onChange={(e) => setO(e.target.value)} autoComplete="current-password" /></label>
                <label>{t('Mật khẩu mới')}<input type="password" value={n1} onChange={(e) => setN1(e.target.value)} autoComplete="new-password" /></label>
                <label>{t('Nhập lại mật khẩu mới')}<input type="password" value={n2} onChange={(e) => setN2(e.target.value)} autoComplete="new-password" /></label>
                {err && <p className="err" role="alert">{err}</p>}
                {ok && <p className="ok">{t('Đã đổi mật khẩu.')}</p>}
                <div className="btn-row"><button type="submit" className="primary">{t('Đổi mật khẩu')}</button></div>
              </form>)}
            <div className="btn-row"><button onClick={close}>{t('Đóng')}</button></div>
          </div>
        </div>, document.body)}
    </div>
  );
}

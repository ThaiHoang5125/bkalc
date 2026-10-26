import { useId } from 'react';
import type { Entry, Lookup } from '../data/lookup';
import { t } from '../i18n';

/**
 * Hai ô Mã môn / Tên môn liên kết với nhau: gõ mã thì tự điền tên và số tín chỉ, gõ tên khớp thì tự điền mã và số tín chỉ;
 * có gợi ý khi gõ (kèm số tín chỉ).
 */
export function CodeName({ lookup, code, name, setCode, setName, setCredits }: { lookup: Lookup; code: string; name: string; setCode: (v: string) => void; setName: (v: string) => void; setCredits?: (v: string) => void }) {
  const id = useId();
  const chk = lookup.check(code, name);
  const fillCredits = (e?: Entry) => { if (e?.credits !== undefined && setCredits) setCredits(String(e.credits)); };
  const onCode = (v: string) => {
    setCode(v);
    const e = lookup.nameOf(v);
    if (!e) return;
    // chỉ ghi đè tên khi ô tên đang trống hoặc đang là tên của một môn khác trong danh mục
    if (!name.trim() || lookup.codeOf(name)) setName(e.name);
    fillCredits(e);
  };
  const onName = (v: string) => {
    setName(v);
    const e = lookup.codeOf(v);
    if (e) { if (!code.trim()) setCode(e.code); fillCredits(e); }
  };
  const tc = (e: Entry) => (e.credits !== undefined ? t(' · {credits} tín chỉ', { credits: e.credits }) : '');
  return (
    <>
      <label>{t('Mã môn')}<input value={code} onChange={(e) => onCode(e.target.value)} placeholder="MT1003" className="w100" list={`${id}c`} />
        <datalist id={`${id}c`}>{lookup.search(code, 12).map((e) => <option key={e.code} value={e.code}>{e.name}{tc(e)}</option>)}</datalist></label>
      <label className="grow">{t('Tên môn học')}<input value={name} onChange={(e) => onName(e.target.value)} placeholder={t('Giải tích 1')} list={`${id}n`} />
        <datalist id={`${id}n`}>{lookup.search(name, 12).map((e) => <option key={e.code} value={e.name}>{e.code}{tc(e)}</option>)}</datalist>
        {chk.state === 'mismatch' && chk.expected && <small className="err">{t('Mã {code} là “{name}”.', { code: chk.expected.code, name: chk.expected.name })} <button type="button" className="ghost" onClick={() => { setName(chk.expected!.name); fillCredits(chk.expected); }}>{t('Dùng tên này')}</button></small>}
        {chk.state === 'ok' && chk.expected && <small className="ok">✓ {chk.expected.code} - {chk.expected.name}{tc(chk.expected)}</small>}
      </label>
    </>
  );
}

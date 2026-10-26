import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../i18n';

/* ---------- Toast: thông báo nhỏ góc dưới giữa, tự tắt sau ~5 giây ---------- */
interface ToastItem { id: number; text: string; undo: boolean }
interface ToastApi { toast: (text: string, opts?: { undo?: boolean }) => void }
const ToastCtx = createContext<ToastApi>({ toast: () => undefined });
export const useToast = () => useContext(ToastCtx).toast;
export const TOAST_MS = 5000;

/** `onUndo` là store.undo: nút “Hoàn tác” trên toast gọi đúng hàm này khi thao tác là thay đổi dữ liệu. */
export function ToastHost({ onUndo, children }: { onUndo: () => void; children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const close = useCallback((id: number) => {
    clearTimeout(timers.current.get(id)); timers.current.delete(id);
    setItems((l) => l.filter((x) => x.id !== id));
  }, []);
  const toast = useCallback((text: string, opts?: { undo?: boolean }) => {
    const id = ++seq.current;
    setItems((l) => [...l.slice(-2), { id, text, undo: !!opts?.undo }]);
    timers.current.set(id, setTimeout(() => close(id), TOAST_MS));
  }, [close]);
  useEffect(() => { const m = timers.current; return () => m.forEach((x) => clearTimeout(x)); }, []);
  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((x) => (
          <div className="toast" role="status" key={x.id}>
            <span>{x.text}</span>
            {x.undo && <button onClick={() => { onUndo(); close(x.id); }}>{t('Hoàn tác')}</button>}
            <button className="x" aria-label={t('Đóng')} onClick={() => close(x.id)}>✕</button>
          </div>))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Gợi ý "?": bấm mở khung giải thích ---------- */
function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', down); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open, close]);
  return ref;
}

export function Hint({ children, label, right }: { children: ReactNode; label?: string; right?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  return (
    <span className="hint" ref={ref}>
      <button type="button" className="hintbtn" aria-expanded={open} aria-label={label ?? t('Giải thích')} title={label ?? t('Giải thích')} onClick={() => setOpen((v) => !v)}>?</button>
      {open && <div className={`pop${right ? ' right' : ''}`} role="note">{children}</div>}
    </span>
  );
}

/** Tiêu đề thẻ kèm nút “?” (nội dung giải thích chuyển vào khung bật lên). */
export function CardTitle({ children, hint, right, extra }: { children: ReactNode; hint?: ReactNode; right?: boolean; extra?: ReactNode }) {
  return <div className="ctitle"><h3>{children}</h3>{hint && <Hint right={right}>{hint}</Hint>}{extra && <span className="push">{extra}</span>}</div>;
}

/* ---------- Menu “⋯” ---------- */
export function Menu({ children, label, up }: { children: ReactNode; label?: string; up?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(open, () => setOpen(false));
  return (
    <span className="menu" ref={ref}>
      <button className="gbtn" aria-haspopup="menu" aria-expanded={open} title={label ?? t('Thêm thao tác')} onClick={() => setOpen((v) => !v)}>{label ?? t('Thêm thao tác')} <span aria-hidden>▾</span></button>
      {open && <div className={`menupop${up ? ' up' : ''}`} role="menu" onClick={(e) => { if ((e.target as HTMLElement).closest('[data-close]')) setOpen(false); }}>{children}</div>}
    </span>
  );
}

/* ---------- Đầu trang: tiêu đề, dòng phụ, ↶ ↷, đúng một nút chính ---------- */
export interface HistoryApi { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean }
export const HistoryCtx = createContext<HistoryApi>({ undo: () => undefined, redo: () => undefined, canUndo: false, canRedo: false });

export function PageHeader({ title, sub, primary, children }: { title: ReactNode; sub?: ReactNode; primary?: ReactNode; children?: ReactNode }) {
  const h = useContext(HistoryCtx);
  return (
    <header className="pagehead">
      <div className="ttl"><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      <div className="headbtns">
        <div className="hgroup" role="group" aria-label={t('Công cụ')}>
          <button className="gbtn" disabled={!h.canUndo} onClick={h.undo} title={t('Hoàn tác (Ctrl+Z)')}><span aria-hidden>↶</span> {t('Hoàn tác')}</button>
          <button className="gbtn" disabled={!h.canRedo} onClick={h.redo} title={t('Làm lại (Ctrl+Y)')}><span aria-hidden>↷</span> {t('Làm lại')}</button>
          {children}
        </div>
        {primary}
      </div>
    </header>
  );
}

/** Hộp thoại xác nhận trong app (thay cho window.confirm): Esc hoặc bấm nền để hủy, nút xác nhận được focus sẵn. */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }: { title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void }) {
  const okRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  useEffect(() => {
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return createPortal(
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modalbox confirm">
        <h3>{title}</h3>
        <div className="cbody">{children}</div>
        <div className="btn-row"><button type="button" onClick={onCancel}>{t('Hủy')}</button><button type="button" ref={okRef} className="primary" onClick={onConfirm}>{confirmLabel}</button></div>
      </div>
    </div>, document.body);
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Goals } from './components/Goals';
import { Guide } from './components/Guide';
import { Dashboard } from './components/Dashboard';
import type { DashView } from './components/Dashboard';
import { DataPage } from './components/DataPage';
import { SemPlan } from './components/SemPlan';
import { Timetable } from './components/Timetable';
import { Transcript } from './components/Transcript';
import { AdminStats } from './components/AdminStats';
import { useStore } from './store';
import type { AppData } from './engine';
import { saveData } from './persist';
import { HistoryCtx, LangSwitch, ToastHost } from './components/ui';
import { t, useLang } from './i18n';
import { toggleTheme, useTheme } from './theme';
import { QuickAddDialog, SearchDialog, SideSummary } from './components/SideExtras';
import { degreeClass, effectiveTotal, findConflicts, summarize, validateAttempt } from './engine';
import { saveText } from './files';
import { arrowNav } from './arrowNav';
import { writeBackup } from './backup';

const COLLAPSE_KEY = 'hcmut-gpa-side-collapsed';
const readCollapsed = () => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } };
const pad2 = (n: number) => String(n).padStart(2, '0');
const clock = (ts: number) => { const d = new Date(ts); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };

export type Page = 'overview' | 'transcript' | 'goals' | 'semplan' | 'timetable' | 'guide' | 'data';
/** Chuyển trang, kèm (nếu cần) chế độ xem con của trang đó: tổng quan 'summary' | 'charts' | 'tools', bảng điểm 'sem' | 'group', mục tiêu 'target' | 'courses', xếp lịch '1' | '2' | '3', dữ liệu 'data' | 'settings'. */
export type Go = (page: Page, sub?: string) => void;

const Ico = ({ children }: { children: ReactNode }) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
const ICONS: Record<Page, ReactNode> = {
  overview: <Ico><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></Ico>,
  transcript: <Ico><path d="M4 6h16M4 12h16M4 18h10" /></Ico>,
  goals: <Ico><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></Ico>,
  semplan: <Ico><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Ico>,
  timetable: <Ico><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Ico>,
  guide: <Ico><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" /></Ico>,
  data: <Ico><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></Ico>,
};
export const PORTFOLIO_URL = 'https://candid-truffle-741aaf.netlify.app/';
export const NAV = (): [Page, string][] => [['overview', t('Tổng quan')], ['transcript', t('Bảng điểm')], ['goals', t('Mục tiêu')], ['semplan', t('Kế hoạch')], ['timetable', t('Xếp lịch')], ['guide', t('Hướng dẫn')]];

export function App({ initial }: { initial: AppData }) {
  useLang();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const save = useCallback(async (d: AppData) => {
    try { await saveData(d); setSavedAt(Date.now()); setSaveFailed(false); } catch (e) { setSaveFailed(true); throw e; }
  }, []);
  const store = useStore(initial, save);
  const theme = useTheme();
  const [page, setPage] = useState<Page>('overview');
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [dialog, setDialog] = useState<'add' | 'search' | 'stats' | null>(null);
  const [jump, setJump] = useState({ q: '', n: 0 });
  const [subs, setSubs] = useState<Partial<Record<Page, string>>>({});
  const { data } = store;
  const toggleCollapsed = () => setCollapsed((c) => { try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1'); } catch { /* bỏ qua */ } return !c; });
  const dataRef = useRef(data);
  dataRef.current = data;
  const warn = useMemo(() => {
    const { attempts, settings, official } = data;
    const bad = attempts.some((a) => validateAttempt(a).length > 0);
    const over = degreeClass(attempts, summarize(attempts, settings.retakePolicy).gpa, effectiveTotal(settings, official)).exceeded;
    const clash = findConflicts(data.timetable?.current ?? []).length > 0;
    return { transcript: bad || over, timetable: clash } as Partial<Record<Page, boolean>>;
  }, [data]);
  const backupNow = async () => {
    const ok = await saveText('hcmut-gpa-backup.json', JSON.stringify(dataRef.current, null, 2), 'application/json', 'json');
    if (ok) writeBackup(Date.now());
  };
  const go = useCallback<Go>((p, sub) => {
    setPage(p);
    if (sub !== undefined) setSubs((s) => ({ ...s, [p]: sub }));
    window.scrollTo(0, 0);
  }, []);
  const setSub = useCallback((p: Page) => (v: string) => setSubs((s) => ({ ...s, [p]: v })), []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return; // giữ hoàn tác của ô nhập
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); store.redo(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [store.undo, store.redo]);

  useEffect(() => {
    window.addEventListener('keydown', arrowNav);
    return () => window.removeEventListener('keydown', arrowNav);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
      if (e.key.toLowerCase() === 'k') { e.preventDefault(); setDialog('search'); return; }
      const i = Number(e.key);
      const nav = NAV();
      if (i >= 1 && i <= nav.length) { e.preventDefault(); go(nav[i - 1][0]); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [go]);

  useEffect(() => {
    if (window.gpaApi) return; // bản .exe không có thống kê (Ctrl+Shift+F12 là hộp mã bảo trì)
    const h = (e: KeyboardEvent) => { if (e.ctrlKey && e.shiftKey && !e.altKey && e.key === 'F12') { e.preventDefault(); setDialog('stats'); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const hist = useMemo(() => ({ undo: store.undo, redo: store.redo, canUndo: store.canUndo, canRedo: store.canRedo }), [store.undo, store.redo, store.canUndo, store.canRedo]);
  const view = <K extends Page>(p: K, fallback: string) => subs[p] ?? fallback;

  return (
    <HistoryCtx.Provider value={hist}>
      <ToastHost onUndo={store.undo}>
        <div className="app">
          <nav className={`side${collapsed ? ' collapsed' : ''}`} aria-label={t('Điều hướng chính')}>
            <div className="brand"><img className="logo" src="icon.svg" alt="" aria-hidden /><div className="brandtxt"><b>BKalc</b><span>{data.student?.name ?? t('Sinh viên')}</span></div></div>
            <SideSummary data={data} onClick={() => go('overview')} />
            <button className="navitem addnow" onClick={() => setDialog('add')} title={t('Thêm môn nhanh')}><Ico><path d="M12 5v14M5 12h14" /></Ico><span className="navlabel">{t('Thêm môn nhanh')}</span></button>
            <button className="navitem" onClick={() => setDialog('search')} title={`${t('Tìm môn')} (Ctrl+K)`}><Ico><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></Ico><span className="navlabel">{t('Tìm môn')}</span><kbd className="navkey">Ctrl + K</kbd></button>
            {NAV().map(([id, label], i) => (
              <button key={id} className={`navitem${page === id ? ' on' : ''}`} aria-current={page === id ? 'page' : undefined} title={`${label} (Ctrl+${i + 1})`} onClick={() => go(id)}>{ICONS[id]}<span className="navlabel">{label}</span>{warn[id] && <i className="navdot" role="img" aria-label={t('Có cảnh báo')} />}<kbd className="navkey">Ctrl + {i + 1}</kbd></button>
            ))}
            <div className="spacer" />
            <button className={`navitem sub${page === 'data' ? ' on' : ''}`} aria-current={page === 'data' ? 'page' : undefined} title={t('Dữ liệu & cài đặt')} onClick={() => go('data')}>{ICONS.data}<span className="navlabel">{t('Dữ liệu & cài đặt')}</span></button>
            <div className="savestate" role="status" title={saveFailed ? t('Lưu thất bại') : undefined}>
              {saveFailed ? <span className="err">{t('Lưu thất bại')}</span> : savedAt ? <span>{t('Đã lưu')} {clock(savedAt)}</span> : <span>{t('Chưa có thay đổi')}</span>}
              <button className="ghost" onClick={() => { void backupNow(); }} title={t('Xuất file sao lưu JSON')}>{t('Sao lưu')}</button>
            </div>
            <div className="sidefoot">
              <button className="iconbtn" onClick={store.undo} disabled={!store.canUndo} aria-label={t('Hoàn tác')} title={`${t('Hoàn tác')} (Ctrl+Z)`}>↶</button>
              <button className="iconbtn" onClick={store.redo} disabled={!store.canRedo} aria-label={t('Làm lại')} title={`${t('Làm lại')} (Ctrl+Y)`}>↷</button>
              <button className="iconbtn collapsebtn" onClick={toggleCollapsed} aria-label={collapsed ? t('Mở rộng thanh bên') : t('Thu gọn thanh bên')} title={collapsed ? t('Mở rộng thanh bên') : t('Thu gọn thanh bên')}>{collapsed ? '»' : '«'}</button>
              <button className="iconbtn" onClick={toggleTheme} aria-label={t('Chuyển Sáng / Tối')} title={theme.mode === 'dark' ? t('Đang ở chế độ Tối, bấm để chuyển sang Sáng') : t('Đang ở chế độ Sáng, bấm để chuyển sang Tối')}>{theme.mode === 'dark' ? '☀' : '☾'}</button>
              <span className="hide-narrow"><LangSwitch /></span>
            </div>
          </nav>
          <main>
            {page === 'overview' && <Dashboard data={data} go={go} view={view('overview', 'summary') as DashView} setView={setSub('overview')} />}
            {page === 'transcript' && <Transcript jump={jump} data={data} view={view('transcript', 'sem') as 'sem' | 'group'} setView={setSub('transcript')} go={go} onAdd={store.addAttempts} onUpdate={store.updateAttempt} onRemove={store.removeAttempt} onFreeCourse={store.setFreeCourse} />}
            {page === 'goals' && <Goals data={data} view={view('goals', 'target') as 'target' | 'courses'} setView={setSub('goals')} onSettings={store.updateSettings} onAdd={store.addAttempts} onUpdate={store.updateAttempt} onRemove={store.removeAttempt} />}
            {page === 'semplan' && <SemPlan data={data} onPlan={store.updatePlan} go={go} />}
            {page === 'timetable' && <Timetable data={data} step={subs.timetable as '1' | '2' | '3' | undefined} setStep={setSub('timetable')} plannedHere={(data.plan?.sems[data.timetable?.semester ?? ''] ?? []).map((x) => x.code)} onChange={store.updateTimetable} />}
            {page === 'data' && <DataPage data={data} view={view('data', 'data') as 'data' | 'settings'} setView={setSub('data')} go={go} onAdd={store.addAttempts} onSettings={store.updateSettings} onReplace={store.replaceAll} onTranscript={store.applyTranscript} onProgress={store.applyProgress} />}
            {page === 'guide' && <Guide go={go} />}
          </main>
          <a className="credit" href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" title={t('Xem trang giới thiệu của tác giả')}>{t('Tác giả')}: <b>Thái Hoàng</b> <span aria-hidden>↗</span></a>
          {dialog === 'stats' && <AdminStats onClose={() => setDialog(null)} />}
          {dialog === 'add' && <QuickAddDialog data={data} onAdd={store.addAttempts} onClose={() => setDialog(null)} />}
          {dialog === 'search' && <SearchDialog attempts={data.attempts} onClose={() => setDialog(null)} onPick={(q) => { setDialog(null); setJump((j) => ({ q, n: j.n + 1 })); go('transcript', 'sem'); }} />}
        </div>
      </ToastHost>
    </HistoryCtx.Provider>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppData, Prefs, Round, Section, Slot, Solution, TimetableData } from '../engine';
import { DAY_NAMES, DEFAULT_PREFS, isFull, sectionsConflict, MAX_PERIOD, alternatives, buildIcs, campusOk, capOf, parseWeeks, findConflicts, newId, periodEnd, periodStart, rearrange, semesterChoices, semesterDisplay, semesterAt, nextSemester, semesterLabel, canonSemester, slotText, suggestAdd, violations, prefWarnings, slotEnd, semesterShort } from '../engine';
import { COURSE_DB } from '../data/programs';
import { defaultTimetable } from '../store';
import { saveText } from '../files';
import { readTimetableLines } from '../ttimport';
import { parseSections } from '../engine/timetable';
import { ConfirmButton } from './ConfirmButton';
import { CardTitle, Hint, PageHeader, useToast } from './ui';
import { RoundsInfo } from './RoundsInfo';
import { CampusPick, DAYS, DragApi, Grid, PasteBox, SESS_HEAD, SessCells, seatCell, seatNode, seatText } from './ttparts';
import { t } from '../i18n';

const EARLIEST: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const LATEST: number[] = [16, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const earliestLabel = (p: number) => (p <= 1 ? t('Không giới hạn') : t('Từ {h}h', { h: p + 5 }));
const latestLabel = (p: number) => (p >= 16 ? t('Không giới hạn') : t('Học xong trước {h}h', { h: p + 6 }));
const TC = 14;
const lookup = (code: string) => { const c = COURSE_DB[code]; return c ? { name: c.n, credits: c.c } : undefined; };

const ROUND_TITLE: Record<Round, string> = {
  1: 'Đợt 1 - Lấy số lượng',
  2: 'Kết quả đợt 1 - Lấy số lượng & Đợt 2 - Tùy chỉnh thời gian',
  3: 'Kết quả đợt 2 - Tùy chỉnh thời gian & Đợt 3 - Bổ sung môn học',
};
const ROUND_NOTE: Record<Round, string> = {
  1: 'Đợt 1 chỉ đăng ký số lượng, chưa chọn lịch nên chưa dùng được trang này. Dùng trang “Kế hoạch” để chọn môn.',
  2: 'Đang trong đợt 2: được chọn lớp và đổi lịch học, nên có thể đổi lớp các môn đã đăng ký.',
  3: 'Đã qua đợt được đổi lịch học (đợt 2), chỉ còn đợt 3 bổ sung môn học nên không dùng được trang Xếp lịch. Muốn xếp lịch cho học kỳ mới, hãy dán kết quả đợt 1 của học kỳ đó.',
};

export type TtStep = '1' | '2' | '3';
export function Timetable({ data, step, setStep, plannedHere, onChange }: { data: AppData; step?: TtStep; setStep: (s: TtStep) => void; plannedHere?: string[]; onChange: (fn: (t: TimetableData) => TimetableData) => void }) {
  const toast = useToast();
  const ok = (text: string, undo = true) => toast(text, { undo });
  const tt = data.timetable ?? defaultTimetable();
  const { current, catalog: catalogAll, prefs, round } = tt;
  const catalog = useMemo(() => catalogAll.filter((s) => campusOk(s, prefs.campus)), [catalogAll, prefs.campus]);
  const semChoices = useMemo(() => {
    const cur = semesterAt(new Date());
    const n1 = nextSemester(cur), n2 = nextSemester(n1);
    const keep = [semesterLabel(cur), semesterLabel(n1), semesterLabel(n2)];
    return semesterChoices(keep).filter((c) => keep.includes(c.value) || c.value === canonSemester(tt.semester));
  }, [tt.semester]);
  const [msg, setMsg] = useState<{ kind: 'err'; text: string; at?: 'res' | 'list' | 'man' | 'pref' | 'chg' | 'cur' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [prev, setPrev] = useState<{ sections: Section[]; skipped: string[]; ocr: boolean; file: string; kind: 'results' | 'image' | 'paste' } | null>(null);
  const [moveCode, setMoveCode] = useState('');
  /** Môn bị bỏ khỏi bản xem trước khi nhập danh sách lớp (dán cả trang web có thể kèm môn không cần) */
  const [skip, setSkip] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!prev) { setSkip(new Set()); return; }
    const codes = [...new Set(prev.sections.map((x) => x.code))];
    setSkip(initSkip === 'all' ? new Set(codes) : initSkip ? new Set(codes.filter((c) => !initSkip.has(c))) : new Set());
    // tự cuộn xuống chỗ “Thêm vào danh sách lớp” / “Dùng làm lịch học hiện tại”
    setTimeout(() => prevBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
  }, [prev]); // eslint-disable-line react-hooks/exhaustive-deps
  const [dragging, setDragging] = useState<{ sec: Section; slot: Slot } | null>(null);
  /** Bản xem thử khi kéo thả: môn, ô được thả và lớp đang xem thử (null = chưa có lớp nào khớp ô đó) */
  const [draft, setDraft] = useState<{ code: string; name: string; len: number; day: number; start: number; secId: string | null } | null>(null);
  const [dq, setDq] = useState('');
  const sec6Ref = useRef<HTMLDivElement>(null);
  const sol6Ref = useRef<HTMLDivElement>(null);
  const [sols, setSols] = useState<Solution[] | null>(null);
  const [solTab, setSolTab] = useState(0);
  /** Kết quả mục 6 (đổi cục bộ một môn): một phương án duy nhất, không dùng khung giờ của mục 5 */
  const [sol6, setSol6] = useState<Solution | null>(null);
  const curRef = useRef<HTMLDivElement>(null);
  const [addCode, setAddCode] = useState('');
  const [week, setWeek] = useState(0);
  const [w1, setW1] = useState(() => { try { return localStorage.getItem('hcmut-gpa-week1') ?? ''; } catch { return ''; } });
  const maxWeek = useMemo(() => Math.max(18, ...current.flatMap((x) => x.slots.flatMap((sl) => sl.weeks ?? []))), [current]);
  const exportIcs = async () => {
    const r = buildIcs(current, w1);
    const ok_ = await saveText('thoi-khoa-bieu.ics', r.text, 'text/calendar', 'ics');
    if (ok_) ok(t('Đã xuất {n} buổi học ra file .ics. Nhập file này vào Google Calendar hoặc lịch trên điện thoại.', { n: r.events }), false);
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const pasteRes = useRef<HTMLTextAreaElement>(null);
  const prevBtnRef = useRef<HTMLDivElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', credits: '3', group: '', day: 2, start: 2, len: 3, room: '', weeks: '', to: 'current' as 'current' | 'catalog' });

  const cmap = useMemo(() => {
    const all = [...new Set([...current, ...catalog].map((x) => x.code))].sort();
    return Object.fromEntries(all.map((c, i) => [c, `tc${i % TC}`]));
  }, [current, catalog]);
  const solRef = useRef<HTMLDivElement>(null);
  const [pickG, setPickG] = useState<Record<string, string>>({});
  const set = (fn: (x: TimetableData) => TimetableData) => { setSols(null); setSol6(null); onChange(fn); };
  const conflicts = useMemo(() => findConflicts(current), [current]);
  const codes = useMemo(() => [...new Set(current.map((s) => s.code))], [current]);
  const catCodes = useMemo(() => [...new Set(catalog.map((s) => s.code))], [catalog]);
  const mc = moveCode && codes.includes(moveCode) ? moveCode : codes[0] ?? '';
  const known = tt.roundFrom === 'file';
  const blocked = known && round !== 2;
  const canMove = !blocked;

  /** Dán văn bản trang MyBK. mode 'res': trang kết quả đăng ký (phải nhận ra được đợt); mode 'list': trang danh sách lớp. */
  const onPaste = (lines: string[], mode: 'res' | 'list') => {
    const r = parseSections(lines, lookup);
    const fix = (x: Section) => ({ ...x, ...(lookup(x.code) ? { name: lookup(x.code)!.name, credits: lookup(x.code)!.credits } : {}) });
    let list = r.sections;
    if (mode === 'res') {
      // chỉ lấy các lớp trong bảng đã đăng ký (tiêu đề có số thứ tự)
      if (r.regIds?.length) list = list.filter((x) => r.regIds!.includes(x.id));
      if (!list.length) return setMsg({ kind: 'err', at: 'res', text: t('Không nhận ra môn nào trong đoạn chữ. Hãy mở trang “BẢNG ĐĂNG KÝ MÔN HỌC” trên MyBK rồi bấm Ctrl+A, Ctrl+C và dán vào đây.') });
      if (!r.meta?.round || !r.meta) return setMsg({ kind: 'err', at: 'res', text: t('Đoạn chữ này không giống trang kết quả đăng ký (không thấy dòng tiêu đề có “đợt …” ở đầu trang) nên app không biết đang ở đợt nào. Nếu đây là danh sách lớp, hãy dán vào ô bên dưới.') });
      setMsg(null);
      setPrev({ sections: list.map(fix), skipped: [], ocr: false, file: t('văn bản dán'), kind: 'results' });
      const meta = r.meta; set((x) => ({ ...x, ...(meta.semester ? { semester: meta.semester } : {}), round: meta.round!, roundFrom: 'file' as const }));
    } else {
      if (!list.length) return setMsg({ kind: 'err', at: 'list', text: t('Không nhận ra lớp học nào trong đoạn chữ.') });
      setMsg(null);
      // dán cả trang có thể kèm bảng môn đã đăng ký: ưu tiên các lớp thuộc danh sách lớp của môn (tiêu đề không có số thứ tự)
      const only = r.listIds?.length ? new Set(list.filter((x) => r.listIds!.includes(x.id)).map((x) => x.code)) : null;
      setPrev({ sections: list.map(fix), skipped: r.skipped, ocr: false, file: t('văn bản dán'), kind: 'paste' });
      setInitSkip(only ?? ((new Set(list.map((x) => x.code))).size > 1 ? 'all' : null));
    }
  };
  /** Ô dán chung: trang kết quả đăng ký (có đợt, không có danh sách lớp) hay trang danh sách lớp */
  const onPasteAuto = (lines: string[]) => {
    const r = parseSections(lines, lookup);
    onPaste(lines, r.meta?.round && !r.listIds?.length ? 'res' : 'list');
  };
  const [initSkip, setInitSkip] = useState<Set<string> | 'all' | null>(null);

  /** Ảnh chụp danh sách lớp (đọc bằng OCR, chỉ có trong bản .exe). */
  const onFiles = async (files: FileList | null, mode: 'list') => {
    const fs = files ? [...files] : [];
    if (fileRef.current) fileRef.current.value = '';
    if (!fs.length) return;
    setBusy(true); setMsg(null);
    try {
      // Nhiều file (vd. nhiều ảnh chụp chồng nhau của một danh sách dài) được nối lại thành một văn bản rồi đọc một lần
      let all: string[] = []; let ocr = false;
      for (const f of fs) { const r0 = await readTimetableLines(f); all = all.concat(r0.lines); ocr = ocr || r0.ocr; }
      const r = parseSections(all, lookup);
      const secs = r.sections.map((s) => ({ ...s, ...(lookup(s.code) ? { name: lookup(s.code)!.name, credits: lookup(s.code)!.credits } : {}) }));
      if (!secs.length) setMsg({ kind: 'err', at: mode, text: t('Không nhận ra lớp học nào trong file. Bạn có thể nhập tay ở mục 3 (Nhập thủ công).') });
      else { setPrev({ sections: secs, skipped: r.skipped, ocr, file: fs.map((f) => f.name).join(', '), kind: 'image' }); setInitSkip(new Set(secs.map((x) => x.code)).size > 1 ? 'all' : null); }
    } catch (e) { setMsg({ kind: 'err', at: mode, text: (e as Error).message }); }
    setBusy(false);
  };
  // Trong bản xem trước, môn có nhiều lớp (danh sách lớp) cần chọn lớp bạn đang học; các lớp còn lại vào danh sách lớp để đổi.
  const prevByCode = useMemo(() => {
    const m = new Map<string, Section[]>();
    for (const x of prev?.sections ?? []) m.set(x.code, [...(m.get(x.code) ?? []), x]);
    return m;
  }, [prev]);
  const chosenOf = (code: string) => { const l = prevByCode.get(code) ?? []; return l.find((x) => x.id === pickG[code]) ?? l.find((x) => current.some((c) => c.code === code && c.group === x.group)) ?? l[0]; };
  const useAs = (as: 'current' | 'catalog') => {
    if (!prev) return;
    const all = as === 'catalog' ? prev.sections.filter((x) => !skip.has(x.code)) : prev.sections;
    if (!all.length) { setMsg({ kind: 'err', at: 'list', text: t('Chưa chọn môn nào để thêm.') }); return; }
    const codesIn = new Set(all.map((x) => x.code));
    if (as === 'catalog') {
      set((x) => ({ ...x, catalog: [...x.catalog.filter((c) => !codesIn.has(c.code)), ...all] }));
      ok(t('Đã nhập {n} lớp của {m} môn vào danh sách lớp.', { n: all.length, m: codesIn.size }));
    } else {
      const mine = [...prevByCode.keys()].map((c) => chosenOf(c)!);
      const multi = new Set([...prevByCode.entries()].filter(([, l]) => l.length > 1).map(([c]) => c));
      const extra = all.filter((x) => multi.has(x.code));
      set((x) => ({ ...x, current: [...x.current.filter((c) => !codesIn.has(c.code)), ...mine], catalog: extra.length ? [...x.catalog.filter((c) => !multi.has(c.code)), ...extra] : x.catalog }));
      ok(multi.size ? t('Đã đặt {n} môn vào lịch học hiện tại (mỗi môn một lớp bạn chọn). Các lớp còn lại của {m} môn đã vào danh sách lớp để bạn đổi.', { n: mine.length, m: multi.size }) : t('Đã nhập {n} lớp vào lịch học hiện tại.', { n: mine.length }));
    }
    setPrev(null); setPickG({}); setSkip(new Set());
  };

  const formInfo = lookup(form.code.trim().toUpperCase());
  const addManual = () => {
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z]{2}\d{4}[A-Z]?$/.test(code)) return setMsg({ kind: 'err', at: 'man', text: t('Mã môn không hợp lệ (ví dụ MT1003).') });
    if (form.start < 1 || form.start + form.len - 1 > MAX_PERIOD || form.len < 1) return setMsg({ kind: 'err', at: 'man', text: t('Tiết học không hợp lệ.') });
    const weeks = form.weeks.trim() ? parseWeeks(form.weeks) : [];
    if (form.weeks.trim() && !weeks.length) return setMsg({ kind: 'err', at: 'man', text: t('Tuần học không hợp lệ (ví dụ 1-9,11-18).') });
    const slot: Slot = { day: form.day, start: form.start, len: form.len, ...(form.room.trim() ? { room: form.room.trim() } : {}), ...(weeks.length ? { weeks } : {}) };
    const info = lookup(code);
    const upd = (list: Section[]) => {
      const i = list.findIndex((s) => s.code === code && s.group === form.group.trim());
      if (i >= 0) return list.map((s, j) => (j === i ? { ...s, slots: [...s.slots, slot] } : s));
      return [...list, { id: newId(), code, name: info?.name ?? (form.name.trim() || code), credits: info?.credits ?? (parseInt(form.credits, 10) || 0), group: form.group.trim(), slots: [slot] }];
    };
    set((x) => (form.to === 'current' ? { ...x, current: upd(x.current) } : { ...x, catalog: upd(x.catalog) }));
    ok(t('Đã thêm buổi học {c} {g} vào {to}. Muốn thêm buổi khác của cùng lớp, đổi thứ/tiết rồi bấm Thêm lần nữa.', { c: code, g: form.group.trim(), to: form.to === 'current' ? t('lịch hiện tại') : t('danh sách lớp') }));
  };

  const apply = (s: Solution) => {
    const codesIn = new Set(s.sections.map((x) => x.code));
    set((x) => ({ ...x, current: [...x.current.filter((c) => !codesIn.has(c.code)), ...s.sections] }));
    setStep('2'); setTimeout(() => curRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    ok(t('Đã áp dụng cách xếp. Nhớ đăng ký đúng như vậy trên cổng đăng ký của trường.'));
  };
  const solve = (target: { code: string; sectionId?: string; day?: number; start?: number }) => {
    const r = rearrange(current, catalog, target, prefs, 5);
    setSols(r); setSolTab(0);
    if (!r.length) setMsg({ kind: 'err', at: 'pref', text: t('Không có cách xếp nào hợp lệ (không trùng giờ) với các lớp đã nhập. Hãy nhập thêm danh sách lớp của các môn khác để app có thêm lựa chọn.') });
    else setMsg(null);
  };
  /** Mục 6: chỉ đổi cục bộ một môn, không áp khung giờ mong muốn của mục 5 (chỉ giữ lựa chọn cơ sở). */
  const prefs6 = useMemo<Prefs>(() => ({ ...DEFAULT_PREFS, compact: false, campus: prefs.campus }), [prefs.campus]);
  const solve6 = (target: { code: string; sectionId?: string; day?: number; start?: number }) => {
    const r = rearrange(current, catalog, target, prefs6, 1);
    setSol6(r[0] ?? null);
    setTimeout(() => sol6Ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    setMsg(r.length ? null : { kind: 'err', at: 'chg', text: t('Không có cách đổi nào hợp lệ (không trùng giờ) với các lớp đã nhập. Hãy nhập thêm danh sách lớp của các môn khác để app có thêm lựa chọn.') });
  };

  const alts = useMemo(() => (mc ? alternatives(current, catalog, mc, prefs6) : []), [current, catalog, mc, prefs6]);
  const addOpts = useMemo(() => (addCode ? suggestAdd(current, catalog.filter((s) => s.code === addCode), prefs, 8) : []), [current, catalog, addCode, prefs]);
  const addAll = useMemo(() => [...new Set(catalog.map((x) => x.code))].filter((c) => !codes.includes(c)), [catalog, codes]);
  /** Các lớp của môn `code` có buổi `len` tiết bắt đầu đúng (day, start), kèm trạng thái trùng giờ */
  const candidatesFor = (code: string, len: number, d: number, p: number) => {
    const others = current.filter((c) => c.code !== code);
    const pool = [...current.filter((c) => c.code === code), ...catalogAll.filter((c) => c.code === code && campusOk(c, prefs.campus) && !current.some((x) => x.id === c.id || (x.code === c.code && x.group === c.group)))];
    return pool.filter((c) => c.slots.some((x) => x.len === len && x.day === d && x.start === p))
      .map((c) => ({ section: c, conflicts: others.filter((o) => sectionsConflict(o, c)), isCurrent: current.some((x) => x.id === c.id) }));
  };
  const dragHints = useMemo(() => {
    if (!dragging) return null;
    const m = new Map<string, 'ok' | 'warn'>();
    for (const d of DAYS) for (let p = 1; p <= MAX_PERIOD; p++) {
      const c = candidatesFor(dragging.sec.code, dragging.slot.len, d, p);
      if (c.length) m.set(`${d}-${p}`, c.some((x) => !x.conflicts.length && !isFull(x.section)) ? 'ok' : 'warn');
    }
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, current, catalogAll, prefs.campus]);
  const dropCands = draft ? candidatesFor(draft.code, draft.len, draft.day, draft.start) : [];
  /** Mọi lớp của môn đang kéo (kể cả lớp không khớp ô đã thả), để tìm theo mã lớp */
  const draftPool = useMemo(() => {
    if (!draft) return [];
    const others = current.filter((c) => c.code !== draft.code);
    const pool = [...current.filter((c) => c.code === draft.code), ...catalogAll.filter((c) => c.code === draft.code && campusOk(c, prefs.campus) && !current.some((x) => x.id === c.id || (x.code === c.code && x.group === c.group)))];
    return pool.map((c) => ({ section: c, conflicts: others.filter((o) => sectionsConflict(o, c)), isCurrent: current.some((x) => x.id === c.id) }));
  }, [draft, current, catalogAll, prefs.campus]);
  const draftSec = draft?.secId ? draftPool.find((x) => x.section.id === draft.secId)?.section ?? null : null;
  const ghostSec = draft && !draftSec ? [{ id: 'ghost', code: draft.code, name: draft.name, credits: 0, group: '?', slots: [{ day: draft.day, start: draft.start, len: draft.len }] } as Section] : undefined;
  const totalCr = [...new Map(current.map((x) => [x.code, x.credits])).values()].reduce((a, c) => a + c, 0);
  const semCap = capOf(canonSemester(tt.semester) || tt.semester);
  const missing = (plannedHere ?? []).filter((c) => !codes.includes(c) && !catCodes.includes(c));
  const warns = useMemo(() => prefWarnings([...current, ...catalogAll.filter((c) => !current.some((x) => x.id === c.id))], prefs), [current, catalogAll, prefs]);

  const campusPick = <CampusPick value={prefs.campus ?? 'all'} onChange={(v) => set((x) => ({ ...x, prefs: { ...x.prefs, campus: v } }))} />;
  const stepNow: TtStep = step ?? (current.length > 0 ? '2' : '1');
  const prefCount = prefs.daysOff.length + (prefs.earliest > 1 ? 1 : 0) + (prefs.latest < 16 ? 1 : 0) + (prefs.avoidLunch ? 1 : 0) + (prefs.compact ? 1 : 0);
  const steps: [TtStep, string, string][] = [
    ['1', t('Nhập dữ liệu'), t('{n} môn · {m} lớp', { n: codes.length, m: catalogAll.length })],
    ['2', t('Lịch của tôi'), conflicts.length ? t('{n} cặp trùng giờ', { n: conflicts.length }) : t('{n} môn', { n: codes.length })],
    ['3', t('Khung giờ mong muốn'), prefCount ? t('{n} điều kiện', { n: prefCount }) : t('Chưa đặt')],
  ];
  const w1Ref = useRef<HTMLInputElement>(null);
  const tryExport = () => {
    if (!w1) { w1Ref.current?.focus(); toast(t('Chọn ngày thứ Hai của tuần học đầu tiên trước khi xuất lịch.')); return; }
    void exportIcs().then(() => setExportOpen(false));
  };
  const runPrefs = () => { solve({ code: codes[0] }); setTimeout(() => solRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); };
  const primary = stepNow === '1'
    ? <button className="primary" onClick={() => pasteRes.current?.focus()}>{t('Dán kết quả đăng ký')}</button>
    : stepNow === '2'
      ? <button className="primary" disabled={current.length === 0} onClick={() => setExportOpen((o) => !o)}>{t('Xuất lịch (.ics)')}</button>
      : <button className="primary" disabled={!canMove || codes.length === 0} onClick={runPrefs}>{t('Sắp xếp theo khung giờ')}</button>;
  const dq2 = dq.trim().toLowerCase();
  const statusOf = (c: { section: Section; conflicts: Section[]; isCurrent: boolean }) =>
    c.isCurrent ? { cls: 'st-cur', text: t('Lớp hiện tại'), title: undefined }
      : c.conflicts.length ? (() => {
        const codes = [...new Set(c.conflicts.map((x) => x.code))];
        return codes.length === 1
          ? { cls: 'st-err', text: t('Trùng môn {c}', { c: codes[0] }), title: undefined }
          : { cls: 'st-err', text: t('Trùng {n} môn', { n: codes.length }), title: t('Trùng môn {c}', { c: codes.join(', ') }) };
      })()
        : isFull(c.section) ? { cls: 'st-warn', text: t('Đã đầy'), title: undefined }
          : { cls: 'st-ok', text: '', title: undefined };
  const previewIds = draftSec && !current.some((c) => c.id === draftSec.id) ? new Set([draftSec.id]) : undefined;
  const gridSections = draft && draftSec && previewIds ? [...current, draftSec] : current;
  const dragApi: DragApi | undefined = canMove ? { onStart: (sec, slot) => { setDragging({ sec, slot }); }, onEnd: () => setDragging(null), onClick: (sec, slot) => { setDraft({ code: sec.code, name: sec.name, len: slot.len, day: slot.day, start: slot.start, secId: sec.id }); setDq(''); }, onDrop: (d, p) => {
    if (dragging) {
      const cs = candidatesFor(dragging.sec.code, dragging.slot.len, d, p);
      const best = cs.find((x) => !x.conflicts.length && !isFull(x.section)) ?? cs[0];
      setDraft({ code: dragging.sec.code, name: dragging.sec.name, len: dragging.slot.len, day: d, start: p, secId: best?.section.id ?? null }); setDq('');
    }
    setDragging(null);
  }, hints: dragHints } : undefined;

  const classCard = (c: (typeof draftPool)[number]) => {
    const st = statusOf(c), sel = draft?.secId === c.section.id;
    return (
      <button key={c.section.id} className={`clsopt${sel ? ' on' : ''}${st.cls === 'st-err' || st.cls === 'st-warn' ? ' dim' : ''}`} aria-pressed={sel} onClick={() => draft && setDraft({ ...draft, secId: c.section.id })}>
        <span className="l1"><b>{c.section.group || '—'}</b>{st.text && <span className={st.cls} title={st.title}>{st.text}</span>}</span>
        <span className="l2">{c.section.slots.map(slotText).join('; ')}</span>
        {c.section.seats ? <span className="l3">{t('sĩ số')} {seatText(c.section)}</span> : null}
      </button>);
  };
  const aside = canMove && (
    <aside className="ttaside card" aria-label={t('Chọn lớp')}>
      {!draft ? (
        <>
          <CardTitle>{t('Đổi lớp trên thời khóa biểu')}</CardTitle>
          <p className="muted small">{t('Bấm vào một khối môn học để xem các lớp khác của môn đó, hoặc kéo khối sang ô khác. Ô xanh là có lớp hợp lý, ô vàng là có lớp nhưng trùng giờ hoặc đã đầy.')}</p>
        </>
      ) : (
        <>
          <CardTitle>{draft.code} · {draft.name}</CardTitle>
          <p className="muted small">{t('Thả vào {d}, tiết {p}', { d: t(DAY_NAMES[draft.day]), p: draft.start })}</p>
          <label className="searchbox"><span aria-hidden>⌕</span><input value={dq} placeholder={t('Tìm theo mã lớp (L05, A01…)')} aria-label={t('Tìm theo mã lớp')} onChange={(e) => setDq(e.target.value)} /></label>
          {campusPick}
          {dropCands.length === 0 && <p className="warnnote small">{t('Không có lớp nào của môn này có buổi {n} tiết bắt đầu vào khung giờ này (trong danh sách lớp đã nhập).', { n: draft.len })}</p>}
          <div className="list">
            {(() => {
              const matchQ = (x: (typeof draftPool)[number]) => !dq2 || (x.section.group ?? '').toLowerCase().includes(dq2);
              const dropIds = new Set(dropCands.map((d) => d.section.id));
              const fit = draftPool.filter((x) => dropIds.has(x.section.id)).filter(matchQ);
              const others = draftPool.filter((x) => !dropIds.has(x.section.id)).filter(matchQ);
              return (
                <>
                  {fit.map(classCard)}
                  {others.length > 0 && <div className="grouphead">{t('Các lớp khác của môn này')}</div>}
                  {others.map(classCard)}
                </>);
            })()}
          </div>
          {draftSec && draftPool.find((x) => x.section.id === draftSec.id)?.conflicts.length ? <button className="ghost" onClick={() => { setMoveCode(draft.code); solve6({ code: draft.code, sectionId: draftSec.id }); }}>{t('Xếp lại các môn khác')}</button> : null}
          <div className="btn-row">
            <button className="primary" disabled={!draftSec} onClick={() => { if (!draftSec) return; set((x) => ({ ...x, current: [...x.current.filter((c) => c.code !== draft.code), draftSec] })); ok(t('Đã đổi {c} sang lớp {g}.', { c: draft.code, g: draftSec.group || '—' })); setDraft(null); }}>{draftSec ? t('Áp dụng {g}', { g: draftSec.group || '—' }) : t('Áp dụng')}</button>
            <button onClick={() => setDraft(null)}>{t('Hủy')}</button>
          </div>
        </>
      )}
    </aside>);

  return (
    <div className="stack tt">
      <PageHeader title={`${t('Xếp lịch')} · ${semesterShort(canonSemester(tt.semester) || tt.semester)}`} sub={known ? t(ROUND_TITLE[round]) : t('Chưa có kết quả đăng ký')} primary={primary} />

      <details className="card"><summary className="strong">{t('3 đợt đăng ký môn học')}</summary><RoundsInfo bare /></details>

      <div className="tt-top">
        {known
          ? <div className={blocked ? 'roundbox bad' : 'roundbox'}><b>{t(ROUND_TITLE[round])}</b><div>{t(ROUND_NOTE[round])}</div></div>
          : <div className="roundbox"><b>{t('Chưa có kết quả đăng ký')}</b><div>{t('Dán trang “Kết quả đăng ký” ở bước ① để app biết đang ở đợt nào (đợt 1, 2 hay 3) và cho phép xếp lịch đúng đợt.')}</div></div>}
        <label>{t('Học kỳ')}<select value={tt.semester} onChange={(e) => set((x) => ({ ...x, semester: e.target.value }))}>
          {semChoices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
      </div>
      {msg && !msg.at && <p className="err" role="alert">{msg.text}</p>}
      {missing.length > 0 && <p className="warnbox">{t('Môn trong Kế hoạch học kỳ này nhưng chưa có danh sách lớp:')} <b>{missing.join(', ')}</b>. {t('Hãy nhập danh sách lớp của các môn này ở bước ① để app xếp lịch được đầy đủ.')}</p>}

      <ol className="steps" aria-label={t('Các bước xếp lịch')}>
        {steps.map(([k, label, meta]) => (
          <li key={k}><button className={`step${stepNow === k ? ' on' : ''}${k === '1' && current.length > 0 && stepNow !== k ? ' done' : ''}`} aria-current={stepNow === k ? 'step' : undefined} onClick={() => setStep(k)}>
            <span className="n">{k === '1' && current.length > 0 && stepNow !== k ? '✓' : k}</span>{label}<span className="meta">{meta}</span></button></li>))}
      </ol>

      {stepNow === '1' && (<>
        <div className="card">
          <CardTitle hint={<>
            <p className="hhead">{t('Dán dữ liệu từ MyBK')}</p>
            <ol>
              <li>{t('Mở trang MyBK cần lấy: “BẢNG ĐĂNG KÝ MÔN HỌC” (lịch hiện tại) hoặc danh sách lớp của một môn.')}</li>
              <li>{t('Bấm Ctrl+A, Ctrl+C rồi dán (Ctrl+V) vào ô bên dưới.')}</li>
              <li>{t('Bấm “Đọc đoạn chữ” hoặc Enter; app tự nhận loại dữ liệu.')}</li>
            </ol>
            <ul>
              <li><b>{t('Kết quả đăng ký')}:</b> {t('app nhận học kỳ, đợt đăng ký và các môn đã đăng ký.')}</li>
              <li><b>{t('Danh sách lớp')}:</b> {t('dán lần lượt nhiều môn được; bấm vào môn để bỏ môn không cần.')}</li>
              <li><b>{t('Ảnh chụp')}:</b> {t('chọn nhiều ảnh nếu danh sách dài. Đọc ảnh chỉ có trong bản .exe và có thể sai, hãy đối chiếu.')}</li>
            </ul>
          </>}>{t('Dán dữ liệu từ MyBK')}</CardTitle>
          <p className="muted small">{t('Dán trang “BẢNG ĐĂNG KÝ MÔN HỌC” (lịch học hiện tại) hoặc trang danh sách lớp của một môn. App tự nhận ra loại dữ liệu.')}</p>
          <PasteBox ref={pasteRes} placeholder={t('Dán trang MyBK vào đây (Ctrl+A, Ctrl+C trên MyBK, rồi Ctrl+V)')} onParse={onPasteAuto} />
          <div className="form-row">
            <button disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? t('Đang đọc…') : t('Chọn ảnh chụp màn hình…')}</button>
            <input ref={fileRef} type="file" multiple accept="image/*" hidden onChange={(e) => void onFiles(e.target.files, 'list')} />
          </div>
          {msg && (msg.at === 'res' || msg.at === 'list') && <p className="err">{msg.text}</p>}
          {prev && (prev.kind as string) === 'results' && (
            <div className="subcard">
              <h4>{t('Đã đọc {n} lớp từ {file}', { n: prev.sections.length, file: prev.file })}</h4>
              <p className="muted small">{t('Nhận ra: kết quả đăng ký (lịch học hiện tại).')}</p>
              <div className="tblwrap"><table className="tbl compact"><thead><tr><th>{t('Mã môn')}</th><th>{t('Tên môn học')}</th><th>{t('Nhóm')}</th><th>{t('Buổi học')}</th></tr></thead>
                <tbody>{prev.sections.map((s) => <tr key={s.id}><td><b>{s.code}</b></td><td>{s.name}</td><td>{s.group || '—'}</td><td className="small">{s.slots.map(slotText).join('; ')}{seatNode(s)}</td></tr>)}</tbody></table></div>
              {[...prevByCode.entries()].filter(([, l]) => l.length > 1).map(([code, l]) => (
                <label key={code} className="block">{t('Lớp bạn đang học của môn')} <b>{code}</b> {l[0].name}
                  <select value={chosenOf(code)?.id} onChange={(e) => setPickG({ ...pickG, [code]: e.target.value })}>{l.map((x) => <option key={x.id} value={x.id}>{x.group || '—'} · {x.slots.map(slotText).join('; ')}</option>)}</select></label>))}
              <div className="presets" ref={prevBtnRef}>
                <button className="accent" onClick={() => useAs('current')}>{t('Dùng làm lịch học hiện tại')}</button>
                <button className="ghost" onClick={() => setPrev(null)}>{t('Bỏ')}</button>
              </div>
            </div>)}
          {prev && (prev.kind as string) !== 'results' && (
            <div className="subcard">
              <h4>{t('Đã đọc {n} lớp từ {file}', { n: prev.sections.length, file: prev.file })}</h4>
              <p className="muted small">{t('Nhận ra: danh sách lớp (để đổi lớp hoặc thêm môn).')}</p>
              {prev.ocr && <p className="warnnote small">{t('Dữ liệu được nhận dạng từ ảnh nên có thể sai ở một số ô. Hãy đối chiếu trước khi dùng.')}</p>}
              {(prev.kind as string) !== 'results' && prevByCode.size > 1 && (
                <div className="chips">{t('Môn sẽ được thêm (bấm để bỏ môn không cần)')}: {[...prevByCode.entries()].map(([code, l]) => (
                  <button key={code} className={`chip btn${skip.has(code) ? '' : ' on'}`} onClick={() => setSkip((o) => { const n = new Set(o); if (n.has(code)) n.delete(code); else n.add(code); return n; })}>{skip.has(code) ? '✗' : '✓'} {code} · {l[0].name}</button>))}</div>)}
              <div className="tblwrap"><table className="tbl compact"><thead><tr><th>{t('Mã môn')}</th><th>{t('Tên môn học')}</th><th>{t('Nhóm')}</th><th>{t('Buổi học')}</th></tr></thead>
                <tbody>{prev.sections.map((s) => <tr key={s.id}><td><b>{s.code}</b></td><td>{s.name}</td><td>{s.group || '—'}</td><td className="small">{s.slots.map(slotText).join('; ')}{seatNode(s)}</td></tr>)}</tbody></table></div>
              {prev.skipped.length > 0 && <p className="muted small">{t('Bỏ qua {n} dòng có mã môn nhưng không đọc được thứ/tiết.', { n: prev.skipped.length })}</p>}
              {[...prevByCode.entries()].filter(([, l]) => l.length > 1).map(([code, l]) => (
                <label key={code} className="block">{t('Lớp bạn đang học của môn')} <b>{code}</b> {l[0].name}
                  <select value={chosenOf(code)?.id} onChange={(e) => setPickG({ ...pickG, [code]: e.target.value })}>{l.map((x) => <option key={x.id} value={x.id}>{x.group || '—'} · {x.slots.map(slotText).join('; ')}</option>)}</select></label>))}
              {[...prevByCode.values()].some((l) => l.length > 1) && <p className="muted small">{t('Có môn gồm nhiều lớp (danh sách lớp). Hãy chọn đúng lớp bạn đang học; app đưa các lớp còn lại vào danh sách lớp để tìm cách đổi.')}</p>}
              {skip.size > 0 && skip.size >= prevByCode.size && <p className="warnnote small">{t('Đoạn chữ có nhiều môn (gồm cả bảng môn đã đăng ký). Bấm vào môn bạn muốn lấy danh sách lớp ở trên.')}</p>}
              <div className="presets" ref={prevBtnRef}>
                <button className="accent" onClick={() => useAs('catalog')}>{t('Thêm vào danh sách lớp để chọn')}</button>
                <button className="ghost" onClick={() => setPrev(null)}>{t('Bỏ')}</button>
              </div>
            </div>)}
        </div>

        <details className="card">
          <summary className="strong">{t('Nhập thủ công')}</summary>
          <p className="muted small">{t('Dùng cho môn lẻ hoặc khi không có file. Mỗi lần thêm một buổi học; lớp có nhiều buổi thì thêm từng buổi (cùng mã môn và nhóm sẽ gộp vào một lớp).')}</p>
        <div className="manual">
          <div className="mrow">
            <label>{t('Mã môn')}<input list="tt-codes" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="MT1003" /></label>
            <label>{t('Nhóm / lớp')}<input value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} placeholder="L01" /></label>
            {form.code.trim() && (formInfo
              ? <div className="minfo ok2">✓ <b>{formInfo.name}</b> · {formInfo.credits} {t('tín chỉ')}</div>
              : <><label>{t('Tên môn')}<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
                  <label>{t('Tín chỉ')}<input className="w60" inputMode="numeric" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} /></label></>)}
          </div>
          <div className="mrow">
            <div className="mlabel">{t('Thứ')}
              <div className="daychips">{DAYS.map((d) => <button key={d} type="button" className={`chip btn${form.day === d ? ' on' : ''}`} onClick={() => setForm({ ...form, day: d })}>{d === 8 ? t('CN') : `${d}`}</button>)}</div></div>
            <label>{t('Tiết bắt đầu')}<select value={form.start} onChange={(e) => setForm({ ...form, start: +e.target.value })}>{Array.from({ length: MAX_PERIOD }, (_, i) => i + 1).map((p) => <option key={p} value={p}>{t('Tiết')} {p} ({periodStart(p)})</option>)}</select></label>
            <label>{t('Số tiết')}<select value={form.len} onChange={(e) => setForm({ ...form, len: +e.target.value })}>{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
            <div className="minfo">{form.start + form.len - 1 <= MAX_PERIOD ? <>{periodStart(form.start)}–{periodEnd(form.start + form.len - 1)}</> : <span className="err">{t('Vượt quá tiết {m}', { m: MAX_PERIOD })}</span>}</div>
          </div>
          <div className="mrow">
            <label>{t('Phòng (nếu có)')}<input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="H1-201" /></label>
            <label>{t('Tuần học (để trống = mọi tuần)')}<input value={form.weeks} onChange={(e) => setForm({ ...form, weeks: e.target.value })} placeholder="1-9,11-18" /></label>
            <div className="mlabel">{t('Thêm vào')}
              <div className="daychips"><button type="button" className={`chip btn${form.to === 'current' ? ' on' : ''}`} onClick={() => setForm({ ...form, to: 'current' })}>{t('Lịch hiện tại')}</button>
                <button type="button" className={`chip btn${form.to === 'catalog' ? ' on' : ''}`} onClick={() => setForm({ ...form, to: 'catalog' })}>{t('Danh sách lớp')}</button></div></div>
            <button className="accent" onClick={addManual}>{t('Thêm buổi học')}</button>
          </div>
        </div>
        <datalist id="tt-codes">{Object.entries(COURSE_DB).map(([c, v]) => <option key={c} value={c}>{v.n}</option>)}</datalist>
        {msg && msg.at === 'man' && <p className="err">{msg.text}</p>}
        </details>

        <div className="card">
          <CardTitle>{t('Danh sách lớp đã nhập')}</CardTitle>
          {catalogAll.length === 0 ? <p className="muted">{t('Chưa có danh sách lớp nào.')}</p> : (
            <table className="tbl compact"><tbody>{[...new Set(catalogAll.map((x) => x.code))].map((c) => (
              <tr key={c}><td><span className={`dot ${cmap[c] ?? 'tc0'}`} /> <b>{c}</b> {catalogAll.find((x) => x.code === c)?.name}</td><td className="small num">{catalogAll.filter((x) => x.code === c).length} {t('lớp')}</td>
                <td><button className="ghost" aria-label={t('Xóa')} onClick={() => set((x) => ({ ...x, catalog: x.catalog.filter((y) => y.code !== c) }))}>✕</button></td></tr>))}</tbody></table>)}
        </div>
      </>)}

      {stepNow === '2' && (<>
        <div className="card" ref={curRef}>
          <CardTitle>{t('Thời khóa biểu')}</CardTitle>
          {current.length === 0 ? <p className="muted">{t('Chưa có lịch. Hãy nhập ở bước ①.')} <button className="linkbtn" onClick={() => setStep('1')}>{t('Đến bước ①')}</button></p> : (
            <>
              <p className={totalCr > semCap ? 'warnnote small' : 'muted small'}><b>{totalCr}</b> / {semCap} {t('tín chỉ')}{totalCr > semCap ? ' · ' + t('vượt trần') : ''}</p>
              {conflicts.length > 0 && <p className="errline">⚠ {t('Có {n} cặp môn trùng giờ', { n: conflicts.length })}: {conflicts.map((c) => `${c.a.code}/${c.b.code}`).join(', ')}</p>}
              <div className="form-row">
                <label>{t('Xem theo tuần')}<select value={week} onChange={(e) => setWeek(+e.target.value)}><option value={0}>{t('Tất cả các tuần')}</option>{Array.from({ length: maxWeek }, (_, i) => i + 1).map((w) => <option key={w} value={w}>{t('Tuần {w}', { w })}</option>)}</select></label>
                <Hint>{t('Chỉ hiện các buổi học có trong tuần đã chọn; lớp không ghi tuần học được tính là học mọi tuần.')}</Hint>
              </div>
              {exportOpen && (
                <div className="roundbox dndbar" role="group" aria-label={t('Xuất lịch (.ics)')}>
                  <label>{t('Thứ Hai của tuần học đầu tiên')}<input ref={w1Ref} type="date" value={w1} onChange={(e) => { setW1(e.target.value); try { localStorage.setItem('hcmut-gpa-week1', e.target.value); } catch { /* bỏ qua */ } }} /></label>
                  <Hint>{t('Xem ngày này trên lịch học kỳ của trường để các buổi học xuất ra đúng ngày.')}</Hint>
                  {w1 && new Date(w1 + 'T00:00:00').getDay() !== 1 ? <span className="warnnote small">{t('Ngày này không phải thứ Hai.')}</span> : null}
                  <button className="accent" onClick={tryExport}>{t('Xuất file .ics')}</button>
                  <button className="ghost" onClick={() => setExportOpen(false)}>{t('Hủy')}</button>
                </div>)}
              <div className={canMove ? 'ttlayout' : undefined}>
                <div className="ttmain">
                  <Grid sections={gridSections} ghost={ghostSec} week={week || undefined} prefs={prefs} cmap={cmap} dim={draft?.code} previewIds={previewIds} drag={dragApi} />
                </div>
                {aside}
              </div>
              <div className="chips">{[...new Set(current.map((x) => x.code))].map((c) => (
                <span key={c} className="chip" title={current.some((x) => x.code === c && violations(x, prefs) > 0) ? t('ngoài khung giờ mong muốn') : undefined}><span className={`dot ${cmap[c] ?? 'tc0'}`} /> {c}{current.some((x) => x.code === c && violations(x, prefs) > 0) && <span className="warnnote"> ⚠</span>}{round !== 3 && <button className="ghost" aria-label={t('Xóa')} onClick={() => set((x) => ({ ...x, current: x.current.filter((y) => y.code !== c) }))}>✕</button>}</span>))}
                {round !== 3 && <ConfirmButton label={t('Xóa toàn bộ lịch hiện tại')} question={t('Xóa toàn bộ lịch học hiện tại?')} onConfirm={() => set((x) => ({ ...x, current: [] }))} />}
              </div>
            </>
          )}
        </div>

        {!blocked && (<>
          <div className="card" ref={sec6Ref}>
            <CardTitle hint={<>
              <p className="hhead">{t('Đổi sang lớp khác của một môn')}</p>
              <ul>
                <li><b>{t('Phạm vi')}:</b> {t('chỉ đổi môn đã chọn, không dùng khung giờ ở bước ③.')}</li>
                <li><b>{t('Đổi giờ')}:</b> {t('kéo khối môn học trên thời khóa biểu sang ô muốn học.')}</li>
              </ul>
            </>}>{t('Đổi một môn sang lớp khác')}</CardTitle>
        {canMove && (codes.length === 0 ? <p className="muted">{t('Hãy nhập lịch học hiện tại trước.')}</p> : (
          <>
            <div className="form-row">
              <label>{t('Môn muốn đổi')}<select value={mc} onChange={(e) => { setMoveCode(e.target.value); setSol6(null); }}>{codes.map((c) => <option key={c} value={c}>{c} · {current.find((x) => x.code === c)?.name}</option>)}</select></label>
            </div>
            {campusPick}
            {alts.length === 0 ? <p className="muted">{t('Chưa có danh sách lớp khác của môn này. Hãy nhập danh sách lớp ở bước ①.')}</p> : (
              <div className="tblwrap"><table className="tbl compact"><thead><tr>{SESS_HEAD}<th>{t('Sĩ số')}</th><th>{t('Tình trạng')}</th><th /></tr></thead><tbody>{alts.map((a) => (
                <tr key={a.section.id}><SessCells s={a.section} /><td className="small">{seatCell(a.section)}</td>
                  <td className="small">{a.conflicts.length ? <span className="err">{t('Trùng với')} {a.conflicts.map((c) => c.code).join(', ')}</span> : <span className="ok">{t('Không trùng giờ')}</span>}</td>
                  <td className="nowrap"><button onClick={() => solve6({ code: mc, sectionId: a.section.id })}>{a.conflicts.length ? t('Xếp lại các môn khác') : t('Chọn')}</button></td></tr>))}</tbody></table></div>)}
          </>))}
        {msg?.at === 'chg' && <p className="err">{msg.text}</p>}
        <div ref={sol6Ref} />
        {sol6 && (
          <div className="subcard">
            <h4>{t('Lịch sau khi đổi')}</h4>
            {sol6.moves.length === 0 ? <p className="muted">{t('Không có gì thay đổi so với lịch hiện tại.')}</p> : (
              <div className="tblwrap"><table className="tbl compact"><thead><tr><th>{t('Môn')}</th><th /> {SESS_HEAD}<th>{t('Sĩ số')}</th></tr></thead><tbody>
                {sol6.moves.flatMap((m) => [
                  m.from && <tr key={m.code + 'o'} className="muted"><td rowSpan={2}><span className={`dot ${cmap[m.code] ?? 'tc0'}`} /> <b>{m.code}</b> {m.name}</td><td className="small">{t('Hiện tại')}</td><SessCells s={m.from} /><td className="small">{seatCell(m.from)}</td></tr>,
                  <tr key={m.code + 'n'}>{!m.from && <td><span className={`dot ${cmap[m.code] ?? 'tc0'}`} /> <b>{m.code}</b> {m.name}</td>}<td className="small"><b>{t('Mới')}</b></td><SessCells s={m.to} /><td className="small">{seatCell(m.to)}</td></tr>,
                ])}
              </tbody></table></div>)}
            {sol6.approx && <p className="warnnote small">{t('Bộ giải dừng sớm vì có quá nhiều khả năng, kết quả có thể chưa phải cách xếp tốt nhất.')}</p>}
            <Grid sections={sol6.sections} prefs={prefs6} cmap={cmap} />
            <button className="accent" onClick={() => { apply(sol6); setSol6(null); }}>{t('Áp dụng')}</button>
          </div>)}
          </div>
          <div className="card">
            <CardTitle hint={<>
              <p className="hhead">{t('Thêm một môn mới')}</p>
              <ol>
                <li>{t('Nhập danh sách lớp của môn ở bước ① (“Thêm vào danh sách lớp để chọn”).')}</li>
                <li>{t('Chọn môn ở đây.')}</li>
                <li>{t('Bấm “Thêm” ở lớp muốn đăng ký.')}</li>
              </ol>
              <p>{t('App chỉ liệt kê lớp không trùng giờ, ưu tiên lớp hợp khung giờ mong muốn.')}</p>
            </>}>{t('Thêm môn')}</CardTitle>
        {(
          <>
            {addAll.length === 0 && <p className="muted small">{t('Chưa có môn nào để thêm: chưa có danh sách lớp của môn nào ngoài lịch hiện tại.')}</p>}
            <div className="form-row">
              <label>{t('Môn muốn thêm (đã có danh sách lớp)')}<select value={addCode} onChange={(e) => setAddCode(e.target.value)}>
                <option value="">—</option>{addAll.map((c) => <option key={c} value={c}>{c} · {catalog.find((s) => s.code === c)?.name}</option>)}</select></label>
            </div>
            {campusPick}
            {addCode && (addOpts.length === 0 ? <p className="warnnote">{t('Không có lớp nào của môn này không trùng giờ với lịch hiện tại.')}</p> : (
              <div className="tblwrap"><table className="tbl compact"><thead><tr>{SESS_HEAD}<th>{t('Sĩ số')}</th><th>{t('Tình trạng')}</th><th /></tr></thead><tbody>{addOpts.map((o) => (
                <tr key={o.section.id}><SessCells s={o.section} /><td className="small">{seatCell(o.section)}</td>
                  <td className="small">{o.violations > 0 ? <span className="warnnote">{t('ngoài khung giờ mong muốn')}</span> : <span className="ok">{t('hợp khung giờ')}</span>}</td>
                  <td><button onClick={() => { set((x) => ({ ...x, current: [...x.current, o.section] })); setAddCode(''); ok(t('Đã thêm lớp {c} {g} vào lịch.', { c: o.section.code, g: o.section.group || '' })); }}>{t('Thêm')}</button></td></tr>))}</tbody></table></div>))}
          </>)}
          </div>
        </>)}
        {blocked && <p className="muted">{round === 1 ? t(ROUND_NOTE[1]) : t('Đợt 3 không đổi được môn đã đăng ký.')}</p>}
      </>)}

      {stepNow === '3' && (
        <div className="card">
          <CardTitle hint={<>
            <p className="hhead">{t('Khung giờ mong muốn')}</p>
            <ul>
              <li><b>{t('Vùng đỏ nhạt')}:</b> {t('khung giờ bạn không muốn học.')}</li>
              <li><b>{t('Thứ tự ưu tiên')}:</b> {t('không vi phạm khung giờ, rồi ít môn bị đổi nhất.')}</li>
              <li><b>{t('Cơ sở')}:</b> {t('nhóm L học ở cơ sở 2 (Dĩ An, chính quy); nhóm A ở cơ sở 1 (Diên Hồng).')}</li>
            </ul>
          </>}>{t('Khung giờ mong muốn')}</CardTitle>
        <div className="form-row">
          <label>{t('Bắt đầu học')}<select value={prefs.earliest} onChange={(e) => set((x) => ({ ...x, prefs: { ...x.prefs, earliest: +e.target.value } }))}>{EARLIEST.map((v) => <option key={v} value={v}>{earliestLabel(v)}</option>)}</select></label>
          <label>{t('Kết thúc')}<select value={prefs.latest} onChange={(e) => set((x) => ({ ...x, prefs: { ...x.prefs, latest: +e.target.value } }))}>{LATEST.map((v) => <option key={v} value={v}>{latestLabel(v)}</option>)}</select></label>
          <label>{t('Cơ sở học')}<select value={prefs.campus ?? 'all'} onChange={(e) => set((x) => ({ ...x, prefs: { ...x.prefs, campus: e.target.value as 'all' | 'L' | 'A' } }))}><option value="all">{t('Tất cả')}</option><option value="L">{t('Dĩ An (nhóm L, chính quy)')}</option><option value="A">{t('Diên Hồng (nhóm A)')}</option></select></label>
          <label className="check"><input type="checkbox" checked={!!prefs.avoidLunch} onChange={(e) => set((x) => ({ ...x, prefs: { ...x.prefs, avoidLunch: e.target.checked } }))} /> {t('Né khung 11h–13h')}</label>
          <label className="check"><input type="checkbox" checked={prefs.compact} onChange={(e) => set((x) => ({ ...x, prefs: { ...x.prefs, compact: e.target.checked } }))} /> {t('Dồn lịch vào ít ngày')}</label>
        </div>
        <div className="chips">{t('Muốn nghỉ')}: {DAYS.map((d) => (
          <label key={d} className={`chip btn${prefs.daysOff.includes(d) ? ' on' : ''}`}><input type="checkbox" hidden checked={prefs.daysOff.includes(d)} onChange={(e) => set((x) => ({ ...x, prefs: { ...x.prefs, daysOff: e.target.checked ? [...x.prefs.daysOff, d] : x.prefs.daysOff.filter((v) => v !== d) } }))} />{t(DAY_NAMES[d])}</label>))}
          <button className="ghost" onClick={() => set((x) => ({ ...x, prefs: { ...DEFAULT_PREFS } }))}>{t('Đặt lại')}</button></div>
        {warns.length > 0 && (
          <div className="warnbox err" role="alert">
            <b>⚠ {t('Khung giờ mong muốn không thể đáp ứng với các môn sau:')}</b>
            <ul>{warns.map((w) => (
              <li key={w.code}><b>{w.code}</b> {w.name}: {w.kind === 'oneday'
                ? t('chỉ dạy vào {d} trong danh sách lớp đã nhập nhưng bạn chọn nghỉ ngày này.', { d: t(DAY_NAMES[w.day ?? 2]) })
                : t('chỉ có 1 lớp (nhóm {g}) nên không đổi được; {r}.', { g: w.group || '—', r: w.reasons.map((r) => `${t(DAY_NAMES[r.slot.day])} ${t('tiết')} ${r.slot.start}-${slotEnd(r.slot)} ${r.why === 'early' ? t('bắt đầu sớm hơn mong muốn') : r.why === 'late' ? t('kết thúc muộn hơn mong muốn') : r.why === 'lunch' ? t('rơi vào khung 11h–13h') : t('rơi vào ngày muốn nghỉ')}`).join('; ') })}</li>))}</ul>
          </div>)}
        <p className="muted small">{!canMove ? t('Chỉ dùng được ở đợt 2 (được đổi lịch).') : codes.length === 0 ? t('Hãy nhập lịch học hiện tại trước.') : catalog.length === 0 ? t('Chưa có danh sách lớp để chọn nên app chỉ kiểm tra lịch hiện tại. Hãy nhập danh sách lớp ở bước ①.') : t('App thử các lớp bạn đã nhập và đề xuất tối đa 5 cách xếp, ưu tiên đúng khung giờ rồi đến ít môn phải đổi nhất.')}</p>
        {msg?.at === 'pref' && <p className="err">{msg.text}</p>}
        <div className="btn-row"><button className="primary" disabled={!canMove || codes.length === 0} onClick={runPrefs}>{t('Sắp xếp theo khung giờ')}</button></div>
        <div ref={solRef} />
        {sols && sols.length > 0 && (
          <div className="stack">
            <h4>{t('Các cách sắp xếp đề xuất')}</h4>
            <div className="seg sm" role="tablist" aria-label={t('Các cách sắp xếp đề xuất')}>
              {sols.map((x, i) => <button key={i} role="tab" aria-selected={i === Math.min(solTab, sols.length - 1)} aria-pressed={i === Math.min(solTab, sols.length - 1)} onClick={() => setSolTab(i)}>{t('Phương án {i}', { i: i + 1 })}</button>)}
            </div>
            {sols.some((x) => x.approx) && <p className="warnnote small">{t('Bộ giải dừng sớm vì có quá nhiều khả năng, kết quả có thể chưa phải cách xếp tốt nhất.')}</p>}
            {sols.slice(Math.min(solTab, sols.length - 1), Math.min(solTab, sols.length - 1) + 1).map((s) => (
              <div key={solTab} className="card">
                <b>{t('Phương án {i}', { i: Math.min(solTab, sols.length - 1) + 1 })}</b> · {s.moves.length === 0 ? t('Không phải đổi môn nào') : t('Đổi {n} môn', { n: s.moves.length })} · {s.violations === 0 ? <span className="ok">{t('đúng khung giờ mong muốn')}</span> : <span className="err">{t('{n} buổi ngoài khung giờ mong muốn', { n: s.violations })}</span>}
                <div className="tblwrap"><table className="tbl compact"><thead><tr><th>{t('Môn')}</th>{SESS_HEAD}<th>{t('Sĩ số')}</th><th>{t('Thay đổi')}</th></tr></thead><tbody>
                  {s.sections.map((x) => { const mv = s.moves.find((m) => m.code === x.code); return (
                    <tr key={x.id}><td><span className={`dot ${cmap[x.code] ?? 'tc0'}`} /> <b>{x.code}</b> {x.name}</td><SessCells s={x} /><td className="small">{seatCell(x)}</td>
                      <td className="small">{mv ? <b>{t('Đổi từ lớp {g}', { g: mv.from?.group || '—' })}{mv.from?.seats ? ` (${t('sĩ số')} ${seatText(mv.from)})` : ''}</b> : <span className="muted">{t('Giữ nguyên')}</span>}</td></tr>); })}
                </tbody></table></div>
                <Grid sections={s.sections} prefs={prefs} cmap={cmap} />
                <button className="accent" onClick={() => apply(s)}>{t('Áp dụng phương án này')}</button>
              </div>))}
          </div>)}
        </div>
      )}

      <p className="muted small">{semesterDisplay(tt.semester)} · {t('Dữ liệu thời khóa biểu chỉ lưu trong hồ sơ của bạn trên máy này.')}</p>
    </div>
  );
}

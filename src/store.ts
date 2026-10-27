import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppData, Attempt, Component, Official, Program, Settings, SpecialCode, Student } from './engine';
import type { PlanData, Prefs, Section, Slot, StandardsData, TimetableData } from './engine';
import { DEFAULT_PLAN, MAX_PERIOD, canonSemester, isSpecialCode, newId, programTotal, semesterAt, semesterLabel } from './engine';
import type { ProgressResult, TranscriptResult } from './pdf';
import { sanitizeCustomPrograms } from './data/curriculum';

export const DEFAULT_SETTINGS: Settings = { totalCredits: 132, targetGpa: 3.2, retakePolicy: 'highest' };

export const defaultTimetable = (): TimetableData => ({ semester: semesterLabel(semesterAt()), round: 2, current: [], catalog: [], prefs: { earliest: 1, latest: MAX_PERIOD, daysOff: [], compact: true, campus: 'all' } });

export const emptyData = (): AppData => ({ version: 2, attempts: [], settings: { ...DEFAULT_SETTINGS } });

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

/** Kiểm tra và làm sạch dữ liệu đọc từ đĩa/JSON (kể cả bản cũ version 1) để file hỏng không làm app sập. */
const cleanComponents = (raw: unknown[]): Component[] =>
  raw.flatMap((c) => {
    const o = c as Record<string, unknown>;
    if (!o || typeof o.name !== 'string' || typeof o.weight !== 'number' || !(o.weight >= 0 && o.weight <= 100)) return [];
    const num = (v: unknown) => (typeof v === 'number' && v >= 0 && v <= 10 ? v : null);
    const planned = num(o.planned);
    return [{ id: typeof o.id === 'string' ? o.id : newId(), name: o.name, weight: o.weight, score: num(o.score), ...(planned !== null ? { planned } : {}) }];
  });

export function sanitize(raw: unknown): AppData {
  const d = emptyData();
  if (!raw || typeof raw !== 'object') return d;
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.attempts)) {
    for (const x of o.attempts as Record<string, unknown>[]) {
      if (!x || typeof x.name !== 'string' || typeof x.credits !== 'number' || !(x.credits >= 0)) continue;
      const special = typeof x.special === 'string' && isSpecialCode(x.special) ? (x.special as SpecialCode) : undefined;
      const score = typeof x.score === 'number' && x.score >= 0 && x.score <= 10 && !special ? x.score : null;
      const src = x.source;
      d.attempts.push({
        id: typeof x.id === 'string' ? x.id : newId(),
        name: x.name, credits: x.credits, score,
        ...(special ? { special } : {}),
        ...(str(x.code) ? { code: str(x.code) } : {}),
        ...(str(x.officialLetter) ? { officialLetter: str(x.officialLetter) } : {}),
        ...(str(x.group) ? { group: str(x.group) } : {}),
        ...(str(x.note) ? { note: str(x.note) } : {}),
        ...(Array.isArray(x.components) ? { components: cleanComponents(x.components) } : {}),
        ...(x.inCumulative === true ? { inCumulative: true } : {}),
        ...(typeof x.goal === 'string' && ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D'].includes(x.goal) ? { goal: x.goal } : {}),
        ...(x.goalMode === 'letter' || x.goalMode === 'components' || x.goalMode === 'score' ? { goalMode: x.goalMode } : {}),
        ...(typeof x.goalScore === 'number' && x.goalScore >= 0 && x.goalScore <= 10 ? { goalScore: x.goalScore } : {}),
        semester: canonSemester(str(x.semester) ?? 'Chưa phân loại'),
        excluded: x.excluded === true,
        ...(src === 'manual' || src === 'paste' || src === 'excel' || src === 'transcript' || src === 'progress' ? { source: src } : {}),
      });
    }
  }
  const s = o.settings as Record<string, unknown> | undefined;
  if (s) {
    if (typeof s.totalCredits === 'number' && s.totalCredits > 0) d.settings.totalCredits = s.totalCredits;
    if (typeof s.targetGpa === 'number' && s.targetGpa > 0 && s.targetGpa <= 4) d.settings.targetGpa = s.targetGpa;
    // Quy tắc cố định: học cải thiện/học lại luôn lấy lần cao nhất
  }
  if (o.student && typeof o.student === 'object') d.student = o.student as Student;
  if (o.official && typeof o.official === 'object') d.official = o.official as Official;
  const pl = o.plan as { sems?: Record<string, unknown>; maxMain?: unknown; maxSummer?: unknown } | undefined;
  if (pl && typeof pl === 'object' && pl.sems && typeof pl.sems === 'object') {
    const sems: PlanData['sems'] = {};
    for (const [k, v] of Object.entries(pl.sems)) if (Array.isArray(v)) sems[k] = v.flatMap((x) => (x && typeof x.code === 'string' && typeof x.credits === 'number' ? [{ code: x.code, name: typeof x.name === 'string' ? x.name : x.code, credits: x.credits }] : []));
    d.plan = { sems, maxMain: DEFAULT_PLAN.maxMain, maxSummer: DEFAULT_PLAN.maxSummer };
  }
  const tt = o.timetable as Record<string, unknown> | undefined;
  if (tt && typeof tt === 'object') {
    const secs = (v: unknown): Section[] => {
      if (!Array.isArray(v)) return [];
      return v.flatMap((x: Record<string, unknown>) => {
        if (!x || typeof x.code !== 'string' || !Array.isArray(x.slots)) return [];
        const slots = (x.slots as Slot[]).filter((s) => s && s.day >= 2 && s.day <= 8 && s.start >= 1 && s.len >= 1 && s.start + s.len - 1 <= MAX_PERIOD);
        return [{ id: typeof x.id === 'string' ? x.id : newId(), code: x.code, name: typeof x.name === 'string' ? x.name : x.code, credits: typeof x.credits === 'number' ? x.credits : 0, group: typeof x.group === 'string' ? x.group : '', ...(typeof x.teacher === 'string' ? { teacher: x.teacher } : {}), ...(x.seats && typeof (x.seats as { taken?: unknown }).taken === 'number' && typeof (x.seats as { max?: unknown }).max === 'number' ? { seats: { taken: (x.seats as { taken: number }).taken, max: (x.seats as { max: number }).max } } : {}), slots }];
      });
    };
    const pf = (tt.prefs ?? {}) as Partial<Prefs>;
    d.timetable = {
      semester: typeof tt.semester === 'string' ? canonSemester(tt.semester) : semesterLabel(semesterAt()),
      round: tt.round === 1 || tt.round === 2 || tt.round === 3 ? tt.round : 2,
      ...(tt.roundFrom === 'file' ? { roundFrom: 'file' as const } : {}),
      current: secs(tt.current), catalog: secs(tt.catalog),
      prefs: { earliest: typeof pf.earliest === 'number' ? pf.earliest : 1, latest: typeof pf.latest === 'number' ? pf.latest : MAX_PERIOD, daysOff: Array.isArray(pf.daysOff) ? pf.daysOff.filter((x) => typeof x === 'number') : [], compact: pf.compact !== false, campus: pf.campus === 'L' || pf.campus === 'A' ? pf.campus : 'all', avoidLunch: pf.avoidLunch === true },
    };
  }
  // Chuẩn của trường: chỉ còn mã các chuẩn 0 tín chỉ đọc từ bảng điểm; các mục tự nhập của bản cũ (loại chương trình, CTXH…) được bỏ
  const sd = o.standards as Partial<StandardsData> | undefined;
  if (sd && typeof sd === 'object' && Array.isArray(sd.certs)) {
    d.standards = { certs: sd.certs.filter((x: unknown): x is string => typeof x === 'string' && /^[A-Z0-9_]{3,20}$/.test(x)).slice(0, 30) };
  }
  const p = o.program as { groups?: unknown } | undefined;
  if (p && Array.isArray(p.groups) && p.groups.length) d.program = p as Program;
  const cps = sanitizeCustomPrograms(o.customPrograms);
  if (cps.length) d.customPrograms = cps;
  if (Array.isArray(o.freeCourses)) d.freeCourses = [...new Set(o.freeCourses.filter((x): x is string => typeof x === 'string' && x !== ''))];
  return d;
}

const defined = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

export function useStore(initial: AppData, save: (d: AppData) => Promise<void>) {
  const [data, setRaw] = useState<AppData>(initial);
  /** Lịch sử để hoàn tác / làm lại (tối đa 100 bước, chỉ trong phiên làm việc) */
  const past = useRef<AppData[]>([]);
  const future = useRef<AppData[]>([]);
  const [hist, setHist] = useState({ u: 0, r: 0 });
  const setData = useCallback((fn: AppData | ((d: AppData) => AppData)) => setRaw((d) => {
    const n = typeof fn === 'function' ? fn(d) : fn;
    if (n !== d) {
      if (past.current[past.current.length - 1] !== d) past.current.push(d);
      if (past.current.length > 100) past.current.shift();
      future.current = [];
    }
    return n;
  }), []);
  const undo = useCallback(() => setRaw((d) => { const p = past.current.pop(); if (!p) return d; future.current.push(d); return p; }), []);
  const redo = useCallback(() => setRaw((d) => { const f = future.current.pop(); if (!f) return d; past.current.push(d); return f; }), []);
  useEffect(() => { setHist({ u: past.current.length, r: future.current.length }); }, [data]);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const latest = useRef(data);
  const dirty = useRef(false);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    latest.current = data;
    if (!dirty.current) { dirty.current = true; return; } // lần render đầu: chưa có thay đổi nào
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { dirty.current = true; void saveRef.current(latest.current); }, 200);
    return () => clearTimeout(timer.current);
  }, [data]);

  /** Ghi ngay các thay đổi đang chờ (gọi trước khi đăng xuất). */
  const flush = useCallback(async () => { clearTimeout(timer.current); await saveRef.current(latest.current); }, []);
  const ready = true;

  const addAttempts = useCallback((rows: Attempt[]) => setData((d) => ({ ...d, attempts: [...d.attempts, ...rows] })), []);
  const updateAttempt = useCallback((id: string, patch: Partial<Attempt>) =>
    setData((d) => ({ ...d, attempts: d.attempts.map((a) => (a.id === id ? { ...a, ...patch } : a)) })), []);
  const removeAttempt = useCallback((id: string) => setData((d) => ({ ...d, attempts: d.attempts.filter((a) => a.id !== id) })), []);
  const updateSettings = useCallback((patch: Partial<Settings>) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })), []);
  const updatePlan = useCallback((fn: (p: PlanData) => PlanData) => setData((d) => ({ ...d, plan: fn(d.plan ?? { ...DEFAULT_PLAN, sems: {} }) })), []);
  const updateTimetable = useCallback((fn: (t: TimetableData) => TimetableData) => setData((d) => ({ ...d, timetable: fn(d.timetable ?? defaultTimetable()) })), []);
  const replaceAll = useCallback((next: AppData) => setData(next), []);
  /** Chọn / bỏ chọn một môn ngoài chương trình để tính vào nhóm Tự chọn tự do (`key`: khóa môn theo `keyer`). */
  const setFreeCourse = useCallback((key: string, on: boolean) => setData((d) => {
    const rest = (d.freeCourses ?? []).filter((x) => x !== key);
    return { ...d, freeCourses: on ? [...rest, key] : rest };
  }), []);

  /** Nhập bảng điểm PDF: thay toàn bộ các dòng đã nhập từ PDF trước đó, giữ nguyên môn nhập tay. */
  const applyTranscript = useCallback((r: TranscriptResult) => setData((d) => ({
    ...d,
    attempts: [...d.attempts.filter((a) => a.source !== 'transcript' && a.source !== 'progress'), ...r.attempts],
    student: { ...d.student, ...defined(r.student) },
    official: { ...d.official, ...defined({ gpa4: r.official.gpa4, credits: r.official.credits }), semesters: r.official.semesters },
    standards: { certs: r.certs ?? [] },
  })), []);

  /** Nhập form tiến độ: lấy chương trình đào tạo; điểm chỉ bổ sung cho môn chưa có trong bảng điểm. */
  const applyProgress = useCallback((r: ProgressResult) => setData((d) => {
    const base = d.attempts.filter((a) => a.source !== 'progress');
    const have = new Set(base.filter((a) => a.code).map((a) => (a.code as string).toUpperCase()));
    const extra: Attempt[] = r.grades
      .filter((g) => !have.has(g.code.toUpperCase()) && g.credits > 0)
      .map((g) => ({ id: newId(), code: g.code, name: g.name, credits: g.credits, score: g.score, ...(g.special ? { special: g.special } : {}), ...(g.letter ? { officialLetter: g.letter } : {}), semester: 'Từ form tiến độ', source: 'progress' as const }));
    return {
      ...d,
      attempts: [...base, ...extra],
      program: r.program,
      settings: { ...d.settings, totalCredits: (r.official.totalCredits ?? 999) < 100 ? Math.max(d.settings.totalCredits, 132) : programTotal(r.program) },
      student: { ...d.student, ...defined(r.student) },
      official: { ...d.official, ...defined({ gpa4: r.official.gpa4, avg10: r.official.avg10, credits: r.official.credits, totalCredits: r.official.totalCredits }) },
    };
  }), []);

  return { data, ready, flush, addAttempts, updateAttempt, removeAttempt, updateSettings, updatePlan, updateTimetable, replaceAll, setFreeCourse, applyTranscript, applyProgress, undo, redo, canUndo: hist.u > 0, canRedo: hist.r > 0 };
}

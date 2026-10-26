/**
 * Số liệu nền của Kế hoạch học kỳ và các cảnh báo tự tính (chuẩn đăng ký theo mã môn, thực tập, đồ án).
 * Dùng chung cho trang Kế hoạch và khung “Cần chú ý” ở Tổng quan.
 */
import type { AppData } from './types';
import { accumulatedCredits } from './gpa';
import { bandOf } from './scale';
import { effectiveAttempts, summarize } from './gpa';
import { effectiveTotal, enrollingCredits } from './program';
import { DEFAULT_PLAN, capOf, cohortOf, cohortSemesters, futureSemesters, isInternship, isPlaceholder, isThesis } from './semplan';
import type { PlanData } from './semplan';
import { parseSemester, semesterAt, semesterLabel } from './semester';
import { DACN_PCT, TTNT_PCT, courseLevel, gpaTooLow, levelIssues, needCredits, passedCodes, seenCodes } from './standards';
import type { LevelIssue } from './standards';

const key = (l: string) => { const p = parseSemester(l); return p ? p.startYear * 10 + p.term : 0; };

export interface PlanInfo {
  plan: PlanData;
  cohort: number | null;
  nowLabel: string;
  labels: string[];
  /** Chỉ số học kỳ hiện tại trong `labels` (-1: trước khóa, labels.length: sau khóa) */
  curIdx: number;
  firstFuture: number;
  passed: Set<string>;
  enrolled: Set<string>;
  earnedNow: number;
  enrolledCredits: number;
  total: number;
  credOf: (label: string) => number;
  /** Tín chỉ tích lũy dự kiến trước học kỳ có chỉ số `i`: đã tích lũy + đang học + đã xếp ở các kỳ trước */
  creditsBefore: (i: number) => number;
}

export function planInfo(data: AppData, now: Date = new Date()): PlanInfo {
  const plan = data.plan ?? { ...DEFAULT_PLAN, sems: {} };
  const cohort = cohortOf(data.student?.id);
  const nowLabel = semesterLabel(semesterAt(now));
  const labels = cohort ? cohortSemesters(cohort) : futureSemesters(now);
  const curIdx = (() => { const i = labels.indexOf(nowLabel); return i >= 0 ? i : key(nowLabel) < key(labels[0]) ? -1 : labels.length; })();
  const firstFuture = Math.max(curIdx, 0);
  const passed = new Set<string>(), enrolled = new Set<string>();
  for (const a of effectiveAttempts(data.attempts, data.settings.retakePolicy)) if (a.code && bandOf(a.score as number).passed) passed.add(a.code.toUpperCase());
  for (const a of data.attempts) {
    if (!a.code || a.excluded) continue;
    if (a.special === 'MT' || a.special === 'DT') passed.add(a.code.toUpperCase());
    else if (a.score === null && !a.special) enrolled.add(a.code.toUpperCase());
  }
  for (const c of passed) enrolled.delete(c);
  const earnedNow = accumulatedCredits(data.attempts, data.settings.retakePolicy);
  const enrolledCredits = enrollingCredits(data.attempts, data.settings.retakePolicy);
  const total = effectiveTotal(data.settings, data.official);
  const credOf = (l: string) => (plan.sems[l] ?? []).reduce((s, x) => s + x.credits, 0);
  const creditsBefore = (i: number) => {
    let sum = earnedNow;
    for (let j = firstFuture; j < i; j++) sum += credOf(labels[j]) + (j === curIdx ? enrolledCredits : 0);
    return sum;
  };
  return { plan, cohort, nowLabel, labels, curIdx, firstFuture, passed, enrolled, earnedNow, enrolledCredits, total, credOf, creditsBefore };
}

export type PlanWarning = { sem: string; code: string; name: string } & (
  | { kind: 'level-credits'; level: number; have: number; need: number }
  | { kind: 'level-english'; level: number; n: number; missing: string[] }
  | { kind: 'level-gdqp'; level: number }
  | { kind: 'level-gdtc'; level: number }
  | { kind: 'pct'; std: 'C_TTNT' | 'C_ĐACN'; pct: number; have: number; need: number }
  | { kind: 'gpa'; std: 'C_ĐACN' | 'C_LVTN'; gpa: number }
);

const fromIssue = (base: { sem: string; code: string; name: string }, level: number, x: LevelIssue): PlanWarning =>
  x.kind === 'credits' ? { ...base, kind: 'level-credits', level, have: x.have, need: x.need }
    : x.kind === 'english' ? { ...base, kind: 'level-english', level, n: x.n, missing: x.missing }
      : x.kind === 'gdqp' ? { ...base, kind: 'level-gdqp', level } : { ...base, kind: 'level-gdtc', level };

/**
 * Cảnh báo cho các môn đã xếp trong Kế hoạch (từ học kỳ hiện tại trở đi). Chỉ báo khi dữ liệu cho thấy chắc chắn thiếu:
 * chưa có bảng điểm thì không báo gì, chưa có điểm trung bình thì không xét điều kiện điểm.
 */
export function planWarnings(data: AppData, now: Date = new Date()): PlanWarning[] {
  const info = planInfo(data, now);
  if (!data.attempts.length) return [];
  const { labels, firstFuture, curIdx, plan, enrolled, passed, cohort, total } = info;
  const seen = seenCodes(data);
  const base = passedCodes(data);
  const gpa = summarize(data.attempts, data.settings.retakePolicy).gpa;
  const out: PlanWarning[] = [];
  const planned = new Set<string>();
  for (let i = firstFuture; i < labels.length; i++) {
    const sem = labels[i];
    const credits = info.creditsBefore(i);
    // Mã môn coi như đã có trước kỳ này: đã đạt, đang học (khi đã qua kỳ hiện tại) và đã xếp ở các kỳ trước
    const done = new Set<string>([...base, ...passed, ...planned]);
    if (i > curIdx) for (const c of enrolled) done.add(c);
    for (const it of plan.sems[sem] ?? []) {
      if (isPlaceholder(it.code)) continue;
      const b = { sem, code: it.code, name: it.name };
      const level = courseLevel(it.code);
      if (level >= 2) for (const x of levelIssues(level, { cohort, hasData: true, credits, done, seen })) out.push(fromIssue(b, level, x));
      if (isInternship(it.name)) {
        const need = needCredits(TTNT_PCT, total);
        if (credits < need) out.push({ ...b, kind: 'pct', std: 'C_TTNT', pct: TTNT_PCT, have: credits, need });
      } else if (isThesis(it.name)) {
        if (gpaTooLow(gpa)) out.push({ ...b, kind: 'gpa', std: 'C_LVTN', gpa: gpa as number });
      } else if (/đồ án 2|đồ án chuyên ngành/i.test(it.name)) {
        const need = needCredits(DACN_PCT, total);
        if (credits < need) out.push({ ...b, kind: 'pct', std: 'C_ĐACN', pct: DACN_PCT, have: credits, need });
        if (gpaTooLow(gpa)) out.push({ ...b, kind: 'gpa', std: 'C_ĐACN', gpa: gpa as number });
      }
    }
    for (const it of plan.sems[sem] ?? []) planned.add(it.code.toUpperCase());
  }
  return out;
}

/** Các học kỳ sắp tới có tổng tín chỉ (đã xếp + đang học) vượt trần cho phép. */
export function overCapSemesters(data: AppData, now: Date = new Date()): { sem: string; credits: number; cap: number }[] {
  const { labels, firstFuture, curIdx, credOf, enrolledCredits } = planInfo(data, now);
  const out: { sem: string; credits: number; cap: number }[] = [];
  for (let i = firstFuture; i < labels.length; i++) {
    const credits = credOf(labels[i]) + (i === curIdx ? enrolledCredits : 0), cap = capOf(labels[i]);
    if (credits > cap) out.push({ sem: labels[i], credits, cap });
  }
  return out;
}

import { bandOf, pointOf } from './scale';
import { effectiveAttempts, keyer } from './gpa';
import type { Attempt, Program, ProgramCourse, ProgramGroup, RetakePolicy, SpecialCode } from './types';

export type CourseStatus = 'passed' | 'failed' | 'enrolled' | 'todo';

export interface CourseProgress {
  course: ProgramCourse;
  status: CourseStatus;
  score: number | null;
  special?: SpecialCode;
  letter?: string;
  /** Học kỳ của lần học làm nên trạng thái (lần đạt/điểm cao nhất, hoặc lần đang học) */
  semester?: string;
}

export interface GroupProgress {
  group: ProgramGroup;
  courses: CourseProgress[];
  /** Tín chỉ đạt trong nhóm, đã chặn trên bởi số tín chỉ yêu cầu */
  earned: number;
  /** Tín chỉ đạt trước khi chặn */
  rawEarned: number;
  required: number;
  /** Phần vượt yêu cầu của nhóm tự chọn (chuyển sang nhóm tự chọn tự do) */
  overflow: number;
}

export interface ProgramProgress {
  groups: GroupProgress[];
  earned: number;
  required: number;
  /** Các lần học đạt nhưng không thuộc chương trình đào tạo */
  outside: Attempt[];
  /** Trong `outside`, các môn sinh viên đã chọn và được tính vào Tự chọn tự do (tối đa `MAX_FREE_OUTSIDE` môn điểm cao nhất) */
  freeOutside: Attempt[];
  /** Các môn đã chọn nhưng không được tính (ngoài 3 môn điểm cao nhất, hoặc nhóm đã đủ tín chỉ) */
  freeSkipped: Attempt[];
  /** Số tín chỉ thực tế được tính của từng môn trong `freeOutside` (theo id); môn cuối có thể chỉ được tính một phần */
  freeUsed: Map<string, number>;
  /** Điểm tự do: tổng (tín chỉ được tính × điểm hệ 4) của các môn trong `freeOutside`, và tổng tín chỉ được tính */
  freePoints: number;
  freeCredits: number;
}

/** Số môn ngoài chương trình tối đa được tính vào nhóm Tự chọn tự do */
export const MAX_FREE_OUTSIDE = 3;

/** Tổng tín chỉ của bằng cử nhân dùng khi chưa phân ngành (form tiến độ chỉ có khối chung, ví dụ 37/50). */
export const DEGREE_TOTAL = 132;
/** Form tiến độ chỉ ghi khối kiến thức chung (dưới 100 tín chỉ) nghĩa là sinh viên chưa phân ngành. */
export const isUndeclared = (o?: { totalCredits?: number }) => o?.totalCredits !== undefined && o.totalCredits < 100;
/** Tổng tín chỉ để tính ngưỡng 5%, tiến độ: chưa phân ngành thì lấy 132 của bằng cử nhân. */
export const effectiveTotal = (settings: { totalCredits: number }, o?: { totalCredits?: number }) => (isUndeclared(o) ? Math.max(settings.totalCredits, DEGREE_TOTAL) : settings.totalCredits);

export const programTotal = (p: Program) => p.groups.reduce((s, g) => s + g.required, 0);

/**
 * Đối chiếu bảng điểm với chương trình đào tạo.
 * Quy tắc ưu tiên theo form: khối bắt buộc > tự chọn > tự chọn tự do; điểm số > điểm MT > điểm DT;
 * môn trong chương trình > môn ngoài chương trình (khi xét tự chọn tự do).
 * Môn ngoài chương trình chỉ vào nhóm tự chọn tự do khi sinh viên chọn (`freeKeys`, khóa theo `keyer`), và chỉ lấy `MAX_FREE_OUTSIDE` môn điểm cao nhất.
 */
export function computeProgress(program: Program, attempts: Attempt[], policy: RetakePolicy, freeKeys: readonly string[] = []): ProgramProgress {
  const k = keyer(attempts);
  const eff = new Map(effectiveAttempts(attempts, policy).map((a) => [k(a), a]));
  const byCode = new Map<string, Attempt[]>();
  for (const a of attempts) if (!a.excluded) byCode.set(k(a), [...(byCode.get(k(a)) ?? []), a]);

  const statusOf = (c: ProgramCourse): CourseProgress => {
    const key = c.code.toUpperCase();
    const best = eff.get(key);
    const list = byCode.get(key) ?? [];
    const current = list.find((a) => a.score === null && !a.special);
    if (best) {
      const b = bandOf(best.score as number);
      // Đã rớt nhưng đang học lại: hiện "đang học" (vẫn giữ điểm lần rớt để tham khảo)
      if (!b.passed && current) return { course: c, status: 'enrolled', score: best.score, letter: b.letter, semester: current.semester };
      return { course: c, status: b.passed ? 'passed' : 'failed', score: best.score, letter: b.letter, semester: best.semester };
    }
    const mt = list.find((a) => a.special === 'MT');
    if (mt) return { course: c, status: 'passed', score: null, special: 'MT', semester: mt.semester };
    const dt = list.find((a) => a.special === 'DT');
    if (dt) return { course: c, status: 'passed', score: null, special: 'DT', semester: dt.semester };
    if (current) return { course: c, status: 'enrolled', score: null, semester: current.semester };
    return { course: c, status: 'todo', score: null };
  };

  const groups: GroupProgress[] = program.groups.map((g) => {
    const courses = g.courses.map(statusOf);
    const rawEarned = courses.filter((c) => c.status === 'passed').reduce((s, c) => s + c.course.credits, 0);
    const earned = g.required > 0 ? Math.min(rawEarned, g.required) : rawEarned;
    const overflow = g.kind === 'elective' && !g.free ? Math.max(0, rawEarned - g.required) : 0;
    return { group: g, courses, earned, rawEarned, required: g.required, overflow };
  });

  const inProgram = new Set(program.groups.flatMap((g) => g.courses.map((c) => c.code.toUpperCase())));
  const outside = [...eff.values()].filter((a) => !inProgram.has(k(a)) && bandOf(a.score as number).passed && a.credits > 0);

  // Phần dư của nhóm tự chọn và môn ngoài chương trình được chọn chảy vào nhóm tự chọn tự do
  const chosen = new Set(freeKeys);
  const picked = outside.filter((a) => chosen.has(k(a))).sort((a, b) => (b.score as number) - (a.score as number) || b.credits - a.credits);
  // Điền theo thứ tự điểm cao → thấp vào số tín chỉ nhóm tự do còn nhận được; môn cuối có thể chỉ được tính một phần
  const overflowSum = groups.reduce((s, g) => s + g.overflow, 0);
  const freeGroup = groups.find((g) => g.group.free);
  let room = freeGroup ? Math.max(0, freeGroup.required - freeGroup.rawEarned - overflowSum) : 0;
  const freeOutside: Attempt[] = [];
  const freeSkipped: Attempt[] = [];
  const freeUsed = new Map<string, number>();
  let freePoints = 0, freeCredits = 0;
  for (const a of picked.slice(0, MAX_FREE_OUTSIDE)) {
    const use = Math.min(a.credits, room);
    if (use <= 0) { freeSkipped.push(a); continue; }
    room -= use;
    freeOutside.push(a); freeUsed.set(a.id, use);
    freeCredits += use; freePoints += use * pointOf(a.score as number);
  }
  freeSkipped.push(...picked.slice(MAX_FREE_OUTSIDE));
  const spill = overflowSum + freeCredits;
  for (const g of groups) {
    if (g.group.free) {
      g.rawEarned += spill;
      g.earned = Math.min(g.rawEarned, g.required);
    }
  }
  return { groups, earned: groups.reduce((s, g) => s + g.earned, 0), required: groups.reduce((s, g) => s + g.required, 0), outside, freeOutside, freeSkipped, freeUsed, freePoints, freeCredits };
}

/** Tín chỉ đang học nhưng chưa đạt trước đó (môn học cải thiện không cộng thêm vào tổng tín chỉ tốt nghiệp). */
export function enrollingCredits(attempts: Attempt[], policy: RetakePolicy): number {
  const k = keyer(attempts);
  const passed = new Set(effectiveAttempts(attempts, policy).filter((a) => bandOf(a.score as number).passed).map((a) => k(a)));
  const seen = new Set<string>();
  let sum = 0;
  for (const a of attempts) {
    if (a.excluded || a.special || a.score !== null) continue;
    const key = k(a);
    if (passed.has(key) || seen.has(key)) continue;
    seen.add(key); sum += a.credits;
  }
  return sum;
}

import type { Official, Program, ProgramGroup, SpecialCode, Student } from '../engine';
import { SPECIAL_NUMERIC } from '../engine';
import type { Line } from './lines';
import { colText } from './lines';

export interface ProgressGrade { code: string; name: string; credits: number; score: number | null; special?: SpecialCode; letter?: string }

export interface ProgressResult {
  kind: 'progress';
  student: Student;
  program: Program;
  official: Official;
  grades: ProgressGrade[];
  warnings: string[];
}

// Cột của form "Tiến độ hoàn thành chương trình đào tạo"
type Cols = { stt: number[]; code: number[]; name: number[]; score: number[]; letter: number[]; credits: number[]; note: number[] };
const DEFAULT_COL: Cols = { stt: [0, 85], code: [85, 145], name: [145, 300], score: [300, 345], letter: [345, 395], credits: [395, 430], note: [465, 9999] };
let COL: Cols = DEFAULT_COL;
const cell = (l: Line, [a, b]: readonly [number, number] | readonly number[]) => colText(l, a, b);

/** Suy ra ranh giới cột từ dòng tiêu đề (Stt | Mã môn học | Tên môn học | số | chữ | chỉ | Đạt | Ghi chú), không phụ thuộc cỡ trang/tỉ lệ in. */
export function deriveCols(l: Line): Cols {
  const x = (re: RegExp) => l.cells.find((c) => re.test(c.text))?.x;
  const stt = x(/^Stt$/), ma = x(/^Mã môn/), ten = x(/^Tên môn/), so = x(/^(số|Điểm số)$/), chu = x(/^(chữ|Điểm chữ)$/), chi = x(/^(chỉ|Tín chỉ)$/), dat = x(/^Đạt$/), ghi = x(/^Ghi chú$/);
  if ([stt, ma, ten, so, chu, chi, dat, ghi].some((v) => v === undefined)) return DEFAULT_COL;
  const codeA = ma! - 15, nameA = (ma! + ten!) / 2 - 10, scoreA = so! - 15, letterA = (so! + chu!) / 2, credA = (chu! + chi!) / 2, noteA = ghi! - 40;
  return { stt: [0, codeA], code: [codeA, nameA], name: [nameA, scoreA], score: [scoreA, letterA], letter: [letterA, credA], credits: [credA, (chi! + dat!) / 2 + 5], note: [noteA, 9999] };
}
const CODE = /^[A-Z][A-Z0-9_]{3,}$/;

const field = (lines: Line[], re: RegExp) => {
  for (const l of lines) { const m = l.text.match(re); if (m) return m; }
  return null;
};

export function parseProgress(lines: Line[]): ProgressResult {
  COL = DEFAULT_COL;
  const head = lines.slice(0, lines.findIndex((l) => l.cells[0]?.text === 'Stt'));
  const f = (re: RegExp) => field(head, re)?.[1]?.trim();
  const student: Student = {
    name: f(/^Họ và tên:\s*(.+)$/), id: f(/^Mã sinh viên:\s*(\S+)/), className: f(/^Mã lớp:\s*(\S+)/),
    faculty: f(/^(Khoa\s+.+)$/), major: f(/^Ngành:\s*(.+)$/), appliedYear: f(/^Áp dụng từ năm:\s*(\d{4})/),
    progressUpdated: f(/Cập nhật cuối:\s*(.+)$/),
  };
  const official: Official = {};
  const cr = field(head, /Số tín chỉ tích lũy:\s*(\d+)\s*\/\s*(\d+)/);
  if (cr) { official.credits = parseInt(cr[1], 10); official.totalCredits = parseInt(cr[2], 10); }
  const a10 = f(/Điểm TBTL hệ 10:\s*([\d.]+)/); if (a10) official.avg10 = parseFloat(a10);
  const a4 = f(/Điểm TBTL hệ 4:\s*([\d.]+)/); if (a4) official.gpa4 = parseFloat(a4);

  const groups: (ProgramGroup & { note: string })[] = [];
  const grades: ProgressGrade[] = [];
  const warnings: string[] = [];
  let started = false;
  let curGroup: (typeof groups)[number] | null = null;
  let lastCourse: { code: string; name: string; credits: number; group: (typeof groups)[number] } | null = null;
  let lastKind: 'group' | 'course' | null = null;

  const closeCourse = () => {
    if (!lastCourse) return;
    lastCourse.group.courses.push({ code: lastCourse.code, name: lastCourse.name.trim(), credits: lastCourse.credits });
    const g = grades.find((x) => x.code === lastCourse!.code && x.name === '');
    if (g) g.name = lastCourse.name.trim();
    lastCourse = null;
  };

  for (const l of lines) {
    if (l.cells[0]?.text === 'Stt') { COL = deriveCols(l); started = true; continue; }
    if (!started) continue;
    if (/^Điểm\s+Điểm\s+Tín/.test(l.text)) continue;
    if (/^Copyright/.test(l.text)) break;

    const stt = cell(l, COL.stt), code = cell(l, COL.code);
    if (/^\d{1,3}$/.test(stt) && CODE.test(code) && curGroup) {
      closeCourse();
      const scoreTxt = cell(l, COL.score), letter = cell(l, COL.letter), credits = parseFloat(cell(l, COL.credits));
      if (!Number.isFinite(credits)) { warnings.push(`${code}: không đọc được số tín chỉ`); continue; }
      const num = parseFloat(scoreTxt);
      let special: SpecialCode | undefined, score: number | null = null;
      if (Number.isFinite(num) && num > 10) special = SPECIAL_NUMERIC[num]; // 12 = MT, 21 = DT
      else if (Number.isFinite(num)) score = num;
      if (score !== null || special) grades.push({ code, name: '', credits, score, ...(special ? { special } : {}), ...(score !== null && /^[A-F]\+?$/.test(letter) ? { letter } : {}) });
      lastCourse = { code, name: cell(l, COL.name), credits, group: curGroup };
      lastKind = 'course';
      continue;
    }
    const first = l.cells[0];
    if (first.x < COL.code[0] && !/^\d+$/.test(first.text)) { // tiêu đề nhóm kiến thức
      closeCourse();
      const m = cell(l, COL.credits).match(/^(\d+)\s*\/\s*(\d+)$/);
      curGroup = { name: first.text, kind: 'required', required: m ? parseInt(m[2], 10) : 0, ...(m ? { officialEarned: parseInt(m[1], 10) } : {}), courses: [], note: cell(l, COL.note) };
      groups.push(curGroup);
      lastKind = 'group';
      continue;
    }
    if (l.cells.every((c) => c.x >= COL.note[0]) && curGroup && lastKind === 'group') { curGroup.note += ' ' + l.text; continue; }
    if (lastCourse && l.cells.every((c) => c.x >= COL.name[0] - 5 && c.x < COL.score[0])) lastCourse.name += ' ' + l.text;
  }
  closeCourse();

  if (!groups.length) throw new Error('Không tìm thấy nhóm kiến thức nào trong form tiến độ.');
  const program: Program = {
    groups: groups.map(({ note, ...g }) => ({
      ...g,
      kind: /Tự/.test(note) ? 'elective' : 'required',
      ...(/tự chọn bổ sung|tự do/i.test(g.name) ? { free: true } : {}),
    })),
  };
  const sumEarned = program.groups.reduce((s, g) => s + (g.officialEarned ?? 0), 0);
  if (official.credits !== undefined && sumEarned !== official.credits) warnings.push(`Tổng tín chỉ các nhóm (${sumEarned}) khác số tín chỉ tích lũy ghi ở đầu form (${official.credits}).`);
  return { kind: 'progress', student, program, official, grades, warnings };
}

import type { Attempt, Official, OfficialSemester, SpecialCode, Student } from '../engine';
import { isCertCode, SPECIAL_CODES, SPECIAL_NUMERIC, newId, orderSemesters, semesterKey } from '../engine';
import type { Line } from './lines';
import { colText } from './lines';

export interface TranscriptResult {
  kind: 'transcript';
  student: Student;
  attempts: Attempt[];
  official: Official;
  /** Số dòng môn học bỏ qua vì "Không in trên bảng điểm" và 0 tín chỉ (Sinh hoạt sinh viên...) */
  skipped: number;
  /** Mã các “chuẩn” 0 tín chỉ đã đạt nhưng không in trên bảng điểm (CCGDTC, SA4001, ENG_GC_600…) */
  certs: string[];
  warnings: string[];
}

type Cols = { stt: number[]; code: number[]; name: number[]; score: number[]; letter: number[]; credits: number[]; status: number[]; group: number[]; note: number[] };
const DEFAULT_COL: Cols = { stt: [0, 66], code: [66, 118], name: [118, 240], score: [240, 272], letter: [272, 305], credits: [305, 335], status: [365, 445], group: [445, 480], note: [480, 9999] };
let COL: Cols = DEFAULT_COL;

/** Suy ra ranh giới cột từ dòng tiêu đề (Stt | Mã môn học | Tên môn học | Điểm tổng kết | Tín chỉ | Đạt | Tình trạng | Nhóm | Ghi chú), không phụ thuộc cách in. */
export function deriveCols(l: Line): Cols {
  const x = (re: RegExp) => l.cells.find((c) => re.test(c.text))?.x;
  const hoc = x(/^(học|Mã môn học)$/) ?? x(/^Mã môn/), ten = x(/^Tên môn/), ket = x(/^(kết|Điểm tổng kết|Điểm số)$/), chi = x(/^(chỉ|Tín chỉ)$/), dat = x(/^Đạt$/), tt = x(/^Tình trạng$/), nhom = x(/^Nhóm$/), ghi = x(/^Ghi chú$/);
  if ([hoc, ten, ket, chi, dat, tt, nhom, ghi].some((v) => v === undefined)) return DEFAULT_COL;
  const codeA = hoc! - 25, nameA = (hoc! + ten!) / 2 - 15, scoreA = ket! - 30, letterA = ket! - 5, credA = chi! - 15, credB = (chi! + dat!) / 2, statA = tt! - 15, grpA = nhom! - 12, noteA = nhom! + (ghi! - nhom!) * 0.55;
  return { stt: [0, codeA], code: [codeA, nameA], name: [nameA, scoreA], score: [scoreA, letterA], letter: [letterA, credA], credits: [credA, credB], status: [statA, grpA], group: [grpA, noteA], note: [noteA, 9999] };
}
const cell = (l: Line, [a, b]: readonly [number, number] | readonly number[]) => colText(l, a, b);
const CODE = /^[A-Z][A-Z0-9_]{3,}$/;
const SEM = /^N[aă]m\s*h[oọ]c\s*(\d{4})\s*[-–—]\s*(\d{4})\s*\/?\s*H[oọ]c\s*k[yỳ]\s*(\d)/i;

const field = (lines: Line[], re: RegExp) => {
  for (const l of lines) { const m = l.text.match(re); if (m) return m[1].trim(); }
  return undefined;
};

export function parseTranscript(lines: Line[]): TranscriptResult {
  COL = DEFAULT_COL;
  const student: Student = {
    name: field(lines, /^Họ và tên:\s*(.+)$/),
    id: field(lines, /^Mã sinh viên:\s*(\S+)/),
    className: field(lines, /^Mã lớp:\s*(\S+)/),
    transcriptUpdated: field(lines, /Cập nhật cuối:\s*(.+)$/),
  };

  const rows: { att: Attempt; transfer: boolean }[] = [];
  const semesters: OfficialSemester[] = [];
  const warnings: string[] = [];
  let started = false, transfer = false, skipped = 0;
  const certs: string[] = [];
  let curSem: OfficialSemester | null = null;
  let pendingCum: { gpa: number; credits: number } | null = null;
  let last: { name: string; status: string; note: string; att: Attempt | null } | null = null;

  const flush = () => {
    if (!last?.att) return;
    last.att.name = last.name.trim();
    const note = last.note.trim();
    if (note) { last.att.note = note; if (/Không tính TCTL/i.test(note)) last.att.excluded = true; }
  };

  for (const l of lines) {
    if (l.cells[0]?.text === 'Stt') { COL = deriveCols(l); started = true; continue; }
    if (!started) continue;
    if (l.cells.some((c) => c.text === 'Mã môn') || /^Mã môn\s+Điểm tổng/.test(l.text)) continue; // dòng tiêu đề lặp ở đầu mỗi trang

    const sum = l.text.match(/^(\d(?:\.\d+)?)\s+(\d+)\s+Tích lũy (chung|học kỳ)$/);
    if (sum) {
      const gpa = parseFloat(sum[1]), credits = parseInt(sum[2], 10);
      if (sum[3] === 'chung') pendingCum = { gpa, credits };
      else if (curSem) { curSem.semGpa = gpa; curSem.semCredits = credits; }
      continue;
    }
    const sm = /^\d+$/.test(cell(l, COL.stt)) ? null : l.text.match(SEM);
    if (sm) {
      flush(); last = null; transfer = false;
      curSem = { semester: `Năm học ${sm[1]} - ${sm[2]} / Học kỳ ${sm[3]}`, cumGpa: pendingCum?.gpa ?? NaN, cumCredits: pendingCum?.credits ?? NaN };
      semesters.push(curSem); pendingCum = null;
      continue;
    }
    if (/^Môn học chuyển điểm\/miễn điểm/.test(l.text)) { flush(); last = null; transfer = true; continue; }

    const stt = cell(l, COL.stt), code = cell(l, COL.code);
    if (/^\d{1,3}$/.test(stt) && CODE.test(code)) {
      flush();
      const scoreTxt = cell(l, COL.score), letter = cell(l, COL.letter), credits = parseFloat(cell(l, COL.credits));
      const status = cell(l, COL.status);
      if (!Number.isFinite(credits)) { warnings.push(`Dòng ${stt} (${code}): không đọc được số tín chỉ`); last = null; continue; }
      let special: SpecialCode | undefined;
      let score: number | null = null;
      const num = parseFloat(scoreTxt);
      if (letter in SPECIAL_CODES) special = letter as SpecialCode;
      else if (Number.isFinite(num) && num > 10 && SPECIAL_NUMERIC[num]) special = SPECIAL_NUMERIC[num];
      else if (Number.isFinite(num) && num >= 0 && num <= 10) score = num;
      else if (scoreTxt) warnings.push(`Dòng ${stt} (${code}): điểm "${scoreTxt}" không nhận dạng được`);
      if (!special && score === null && !scoreTxt) special = 'CH';
      if (credits === 0 && /Không in/.test(status)) { skipped++; if ((special === 'DT' || special === 'MT' || score !== null) && (isCertCode(code) || !/^[A-Z]{2}\d{4}[A-Z]?$/.test(code))) certs.push(code.toUpperCase()); last = null; continue; }
      const att: Attempt = {
        id: newId(), code, name: cell(l, COL.name), credits, score, ...(special ? { special } : {}),
        ...(score !== null && /^[A-F]\+?$/.test(letter) ? { officialLetter: letter } : {}),
        semester: curSem?.semester ?? 'Chưa rõ học kỳ', group: cell(l, COL.group) || undefined, source: 'transcript',
      };
      last = { name: att.name, status, note: cell(l, COL.note), att };
      rows.push({ att, transfer: transfer || special === 'MT' });
      continue;
    }
    // Dòng tiếp theo của ô nhiều dòng (tên môn dài, "Không in trên / bảng điểm", ghi chú)
    if (last && l.cells.every((c) => c.x >= COL.name[0])) {
      last.name += ' ' + cell(l, COL.name);
      last.status += ' ' + cell(l, COL.status);
      last.note += ' ' + cell(l, COL.note);
    }
  }
  flush();

  if (!rows.length) throw new Error('Không tìm thấy môn học nào trong bảng điểm.');

  if (rows.every((r) => !r.transfer && !semesters.some((s) => s.semester === r.att.semester)))
    throw new Error('Không nhận ra các dòng “Năm học … / Học kỳ …” trong bảng điểm (có thể form đã đổi bố cục).');
  const unknown = rows.filter((r) => r.att.semester === 'Chưa rõ học kỳ').length;
  if (unknown) warnings.push(`${unknown} môn chưa xác định được học kỳ.`);

  // Môn chuyển điểm / miễn điểm được trường tính vào học kỳ đầu tiên
  const order = orderSemesters(rows.map((r) => r.att));
  const first = order.filter((s) => semesterKey(s) !== null).sort((a, b) => (semesterKey(a) as number) - (semesterKey(b) as number))[0] ?? 'Chuyển điểm / miễn điểm';
  for (const r of rows) if (r.transfer) r.att.semester = first;

  // Xếp theo thời gian (form liệt kê học kỳ mới nhất trước), giữ nguyên thứ tự dòng trong học kỳ
  const rank = new Map(orderSemesters(rows.map((r) => r.att)).map((s, i) => [s, i]));
  const attempts = rows.map((r, i) => ({ r, i })).sort((a, b) => (rank.get(a.r.att.semester) as number) - (rank.get(b.r.att.semester) as number) || a.i - b.i).map((x) => x.r.att);

  const done = semesters.filter((s) => Number.isFinite(s.cumGpa));
  done.sort((a, b) => (semesterKey(a.semester) as number) - (semesterKey(b.semester) as number));
  const latest = done[done.length - 1];
  const official: Official = { semesters: done, ...(latest ? { gpa4: latest.cumGpa, credits: latest.cumCredits } : {}) };
  return { kind: 'transcript', student, attempts, official, skipped, certs: [...new Set(certs)], warnings };
}

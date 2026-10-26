/**
 * Thời khóa biểu: lớp học phần, xung đột, xếp lại lịch theo mong muốn khung giờ.
 * Tiết học HCMUT: tiết 1 bắt đầu 06:00, mỗi tiết 50 phút, tiết n bắt đầu lúc (5 + n) giờ
 * (tiết 2 = 07:00, tiết 4 = 09:00, tiết 7 = 12:00, tiết 13 = 18:00).
 */

import { semesterLabel } from "./semester";

export interface Slot {
  /** Thứ: 2..7, 8 = Chủ nhật */
  day: number;
  /** Tiết bắt đầu (1..16) */
  start: number;
  /** Số tiết liên tiếp */
  len: number;
  room?: string;
  /** Các tuần học (rỗng = mọi tuần) */
  weeks?: number[];
}
export interface Section { id: string; code: string; name: string; credits: number; group: string; slots: Slot[]; teacher?: string; /** Sĩ số đã đăng ký / tối đa của lớp */ seats?: { taken: number; max: number } }
export const isFull = (s: Section) => !!s.seats && s.seats.max > 0 && s.seats.taken >= s.seats.max;

export interface Prefs {
  /** Tiết sớm nhất chấp nhận bắt đầu (1 = không giới hạn; 2 = 7h; 4 = 9h; 8 = 13h) */
  earliest: number;
  /** Tiết muộn nhất chấp nhận kết thúc (16 = không giới hạn) */
  latest: number;
  /** Các thứ muốn nghỉ (2..8) */
  daysOff: number[];
  /** Ưu tiên dồn lịch vào ít ngày nhất */
  compact: boolean;
  /** Cơ sở: 'all' = tất cả; 'L' = chính quy (nhóm L, cơ sở 2 Dĩ An); 'A' = nhóm A (cơ sở 1 Diên Hồng) */
  campus?: 'all' | 'L' | 'A';
  /** Né khung 11h–13h (tiết 6–7) */
  avoidLunch?: boolean;
}
/** Lớp có thuộc cơ sở đã chọn không (nhóm bắt đầu bằng A thuộc Diên Hồng, bắt đầu bằng L thuộc Dĩ An; nhóm khác luôn được giữ). */
export const campusOk = (s: { group: string }, campus: Prefs['campus']) => {
  const g = (s.group ?? '').trim().toUpperCase();
  if (!g) return true;
  if (!/^[LA]/.test(g)) return false; // chỉ đề xuất lớp nhóm L hoặc A
  return !campus || campus === 'all' || g[0] === campus;
};
export const DEFAULT_PREFS: Prefs = { earliest: 1, latest: 16, daysOff: [], compact: true, campus: 'all' };

export type Round = 1 | 2 | 3;
export interface TimetableData { semester: string; round: Round; /** 'file' = đợt được xác định từ file PDF kết quả đăng ký đã nhập */ roundFrom?: 'file'; current: Section[]; catalog: Section[]; prefs: Prefs }

export const DAY_NAMES: Record<number, string> = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ nhật' };
export const MAX_PERIOD = 16;
export const periodStart = (p: number) => `${String(5 + p).padStart(2, '0')}:00`;
export const periodEnd = (p: number) => `${String(5 + p).padStart(2, '0')}:50`;
export const slotEnd = (s: Slot) => s.start + s.len - 1;
export const slotText = (s: Slot) => `${DAY_NAMES[s.day] ?? s.day}, tiết ${s.start}-${slotEnd(s)} (${periodStart(s.start)}–${periodEnd(slotEnd(s))})${s.room ? ` · ${s.room}` : ''}`;

/** Đọc chuỗi tuần như "1-9,11-18" thành danh sách tuần. */
export function parseWeeks(s: string): number[] {
  const out = new Set<number>();
  for (const part of s.split(/[,;\s]+/)) {
    const m = part.match(/^(\d{1,2})(?:[-–](\d{1,2}))?$/);
    if (!m) continue;
    const a = +m[1], b = m[2] ? +m[2] : a;
    for (let w = Math.min(a, b); w <= Math.max(a, b) && w <= 60; w++) out.add(w);
  }
  return [...out].sort((x, y) => x - y);
}

const weeksOverlap = (a?: number[], b?: number[]) => !a?.length || !b?.length || a.some((w) => b.includes(w));

export const slotsConflict = (a: Slot, b: Slot) => a.day === b.day && a.start <= slotEnd(b) && b.start <= slotEnd(a) && weeksOverlap(a.weeks, b.weeks);
export const sectionsConflict = (a: Section, b: Section) => a.slots.some((x) => b.slots.some((y) => slotsConflict(x, y)));

export interface Conflict { a: Section; b: Section }
export function findConflicts(secs: Section[]): Conflict[] {
  const out: Conflict[] = [];
  for (let i = 0; i < secs.length; i++) for (let j = i + 1; j < secs.length; j++) if (sectionsConflict(secs[i], secs[j])) out.push({ a: secs[i], b: secs[j] });
  return out;
}

/** Số vi phạm mong muốn khung giờ của một lớp (mỗi buổi vi phạm tính 1). */
export function violations(sec: Section, p: Prefs): number {
  let v = 0;
  for (const s of sec.slots) {
    if (s.start < p.earliest) v++;
    if (slotEnd(s) > p.latest) v++;
    if (p.daysOff.includes(s.day)) v++;
    if (p.avoidLunch && s.start <= 7 && slotEnd(s) >= 6) v++;
  }
  return v;
}

/** Chi phí mềm của cả thời khóa biểu: số ngày phải đến trường + số tiết trống giữa các buổi trong ngày. */
export function softCost(secs: Section[], p: Prefs): number {
  const byDay = new Map<number, [number, number][]>();
  for (const sec of secs) for (const s of sec.slots) byDay.set(s.day, [...(byDay.get(s.day) ?? []), [s.start, slotEnd(s)]]);
  let cost = 0;
  for (const ranges of byDay.values()) {
    if (p.compact) cost += 6;
    const sorted = [...ranges].sort((x, y) => x[0] - y[0]);
    let reach = sorted[0][1];
    for (const [a, b] of sorted.slice(1)) { if (a > reach + 1) cost += Math.min(a - reach - 1, 6) * 0.5; reach = Math.max(reach, b); }
  }
  return cost;
}

const CHANGE = 10, VIOL = 15;
/** Số nhánh tối đa bộ giải duyệt trước khi dừng. */
const MAX_NODES = 300000;

export interface Move { code: string; name: string; from?: Section; to: Section }
export interface Solution { sections: Section[]; moves: Move[]; violations: number; cost: number; /** true nếu bộ giải dừng vì quá nhiều nhánh nên kết quả có thể chưa tối ưu */ approx?: boolean }

export interface Target { code: string; /** chỉ xét buổi học có đúng số tiết này (phân biệt buổi lý thuyết với thí nghiệm / bài tập) */ len?: number; /** chọn đúng lớp */ sectionId?: string; /** hoặc: có buổi bắt đầu đúng thứ/tiết này */ day?: number; start?: number }

const matchesTarget = (sec: Section, t: Target) => (t.sectionId ? sec.id === t.sectionId : sec.slots.some((s) => (t.len === undefined || s.len === t.len) && (t.day === undefined || s.day === t.day) && (t.start === undefined || (s.start <= t.start && t.start <= slotEnd(s)))));

/**
 * Tìm các cách xếp lại thời khóa biểu: môn `target.code` chuyển sang khung giờ muốn,
 * các môn khác được đổi sang lớp khác (nếu có danh sách lớp) sao cho không trùng giờ,
 * ít môn bị đổi nhất và hợp mong muốn khung giờ nhất.
 * Môn không có danh sách lớp trong `catalog` được giữ nguyên.
 */
export function rearrange(current: Section[], catalog: Section[], target: Target, prefs: Prefs, limit = 5): Solution[] {
  const codes = [...new Set(current.map((s) => s.code))];
  const domains = new Map<string, Section[]>();
  for (const code of codes) {
    const cur = current.filter((s) => s.code === code);
    const opts = catalog.filter((s) => s.code === code);
    // lớp hiện tại luôn là một lựa chọn (kể cả khi chưa có trong danh sách lớp)
    const dom = [...cur, ...opts.filter((o) => !cur.some((c) => c.group === o.group) && !isFull(o))];
    domains.set(code, dom);
  }
  const tcode = target.code;
  if (!domains.has(tcode)) return [];
  const tdom = domains.get(tcode)!.filter((s) => matchesTarget(s, target));
  if (!tdom.length) return [];
  domains.set(tcode, tdom);

  const isCur = (s: Section) => current.some((c) => c.id === s.id || (c.code === s.code && c.group === s.group));
  // Thứ tự biến: môn đích trước, rồi môn ít lựa chọn trước
  const order = [tcode, ...codes.filter((c) => c !== tcode).sort((a, b) => domains.get(a)!.length - domains.get(b)!.length)];
  const best: Solution[] = [];
  let nodes = 0;
  const chosen: Section[] = [];

  const rec = (i: number, changed: number, viol: number) => {
    if (++nodes > MAX_NODES) return;
    const worst = best.length >= limit ? best[best.length - 1].cost : Infinity;
    if (changed * CHANGE + viol * VIOL >= worst) return;
    if (i === order.length) {
      const cost = changed * CHANGE + viol * VIOL + softCost(chosen, prefs);
      const sol: Solution = { sections: [...chosen], moves: [], violations: viol, cost };
      if (cost < worst || best.length < limit) {
        best.push(sol); best.sort((x, y) => x.cost - y.cost);
        if (best.length > limit) best.pop();
      }
      return;
    }
    const code = order[i];
    const dom = [...domains.get(code)!].sort((a, b) => Number(!isCur(a)) - Number(!isCur(b)) || violations(a, prefs) - violations(b, prefs));
    for (const sec of dom) {
      if (chosen.some((c) => sectionsConflict(c, sec))) continue;
      chosen.push(sec);
      rec(i + 1, changed + (isCur(sec) ? 0 : 1), viol + violations(sec, prefs));
      chosen.pop();
    }
  };
  rec(0, 0, 0);

  return best.map((sol) => {
    const moves: Move[] = [];
    for (const sec of sol.sections) {
      if (isCur(sec)) continue;
      const from = current.find((c) => c.code === sec.code);
      moves.push({ code: sec.code, name: sec.name, from, to: sec });
    }
    return { ...sol, moves, ...(nodes > MAX_NODES ? { approx: true } : {}) };
  });
}

/** Gợi ý lớp để thêm một môn mới (đợt 3: chỉ thêm, không đổi môn đã đăng ký): lớp không trùng giờ, hợp mong muốn nhất. */
export function suggestAdd(current: Section[], options: Section[], prefs: Prefs, limit = 6): { section: Section; violations: number; cost: number }[] {
  return options
    .filter((o) => !current.some((c) => c.code === o.code) && !isFull(o))
    .filter((o) => !current.some((c) => sectionsConflict(c, o)))
    .map((o) => ({ section: o, violations: violations(o, prefs), cost: violations(o, prefs) * VIOL + softCost([...current, o], prefs) }))
    .sort((a, b) => a.cost - b.cost)
    .slice(0, limit);
}

/** Các lớp khác của cùng môn mà không trùng với các môn còn lại (đổi lớp riêng một môn). */
export function alternatives(current: Section[], catalog: Section[], code: string, prefs: Prefs) {
  const others = current.filter((s) => s.code !== code);
  const mine = current.find((s) => s.code === code);
  return catalog
    .filter((s) => s.code === code && s.group !== mine?.group)
    .map((s) => ({ section: s, conflicts: others.filter((o) => sectionsConflict(o, s)), violations: violations(s, prefs), full: isFull(s) }))
    .sort((a, b) => Number(a.full) - Number(b.full) || a.conflicts.length - b.conflicts.length || a.violations - b.violations);
}

// ---------------------------------------------------------------------------------------------
// Đọc lớp học phần từ văn bản (PDF/ảnh đã đọc thành các dòng chữ)

const CODE = /\b([A-Z]{2}\d{4}[A-Z]?)\b/;
const DAYX = '(?:Th[uư]́?\\s*|T\\.?\\s*)?([2-7]|CN|Chủ\\s*nhật)';
const RANGE = '(\\d{1,2})(?:\\s*[-–]\\s*(\\d{1,2})|((?:\\s*,\\s*\\d{1,2})+))';
// Dạng có từ khóa "tiết": "Thứ 2, tiết 2-4" (cho phép 1 tiết)
const SLOT_KW = new RegExp(`(?:^|[^\\d])${DAYX}[\\s,;|:.]*[Tt]i[eế]t\\s*:?\\s*${RANGE}?(?![\\d:])`, 'g');
// Dạng cột trần: "2 2-4" hoặc "2 2,3,4": bắt buộc có dải tiết để không nhầm với số tín chỉ
const SLOT_BARE = new RegExp(`(?:^|[^\\d])${DAYX}[\\s,;|:.]+${RANGE}(?![\\d:])`, 'g');
const ROOM_RE = /\b([A-Z]{1,3}\d{0,2}\s?[-–]\s?\d{2,4}[A-Z]?)\b/;
const ROOM_G = new RegExp(ROOM_RE.source, 'g');
const GROUP_RE = /\b(L\d{1,3}[A-Z]?|[A-Z]{1,3}\d{2}[A-Z]?)\b/;

const dayNum = (s: string) => (/CN|Ch/i.test(s) ? 8 : parseInt(s, 10));

/** Tuần: "Tuần 1-9,11-18" hoặc dạng cột “--|2|3|4|--|6|”. */
function weeksOf(line: string): number[] | undefined {
  const m = line.match(/[Tt]u[aầ]n(?:\s*h[oọ]c)?\s*:?\s*([\d\s,;–-]+)/);
  if (m) { const w = parseWeeks(m[1].trim()); if (w.length) return w; }
  const pipe = line.match(/(?:(?:--|\d{1,2})\s*\|\s*){4,}(?:--|\d{1,2})?/);
  if (pipe) { const w = [...pipe[0].matchAll(/\d{1,2}/g)].map((x) => +x[0]).filter((n) => n >= 1 && n <= 60); if (w.length) return w; }
  return undefined;
}

export interface ParsedTimetable { sections: Section[]; skipped: string[]; /** Học kỳ / đợt ghi trong tiêu đề file (nếu có) */ meta?: { semester?: string; round?: Round }; /** id các lớp nằm trong bảng “đã đăng ký” (tiêu đề môn có số thứ tự: “1SP1039 - …”) */ regIds?: string[]; /** id các lớp nằm trong danh sách lớp của một môn (tiêu đề không có số thứ tự) */ listIds?: string[] }

/** Đọc các dòng chữ của thời khóa biểu / danh sách lớp. `lookup` trả tên và tín chỉ theo mã môn nếu biết. */
/**
 * Nhận biết học kỳ và đợt đăng ký của một file kết quả đăng ký từ phần đầu văn bản, không phụ thuộc định dạng tiêu đề cố định:
 * “… và Kết quả đợt N” nghĩa là đang ở đợt N+1; nếu không có thì dùng mã “(HK261_D2)”, hoặc “đợt N” trong tiêu đề.
 */
export function detectMeta(text: string): ParsedTimetable['meta'] | undefined {
  const head = text.normalize('NFC').slice(0, 900);
  const low = head.toLowerCase();
  let round: Round | undefined;
  const kq = low.match(/k[ếe]t qu[ảa]\s*(?:đ[ợo]t)?\s*(\d)/);
  const dm = head.match(/\(HK(\d{2})(\d)(?:_D(\d))?\)/);
  const dot = low.match(/đ[ợo]t\s*(\d)/);
  if (kq && +kq[1] >= 1 && +kq[1] <= 3) round = Math.min(3, +kq[1] + 1) as Round;
  else if (dm?.[3] && +dm[3] >= 1 && +dm[3] <= 3) round = +dm[3] as Round;
  else if (dot && +dot[1] >= 1 && +dot[1] <= 3 && /đăng ký/.test(low)) round = +dot[1] as Round;
  let semester: string | undefined;
  if (dm) semester = semesterLabel({ startYear: 2000 + +dm[1], term: +dm[2] as 1 | 2 | 3 });
  else {
    const hk = low.match(/h[ọo]c k[ỳy]\s*(\d)\s*\/\s*(\d{4})/);
    if (hk && +hk[1] >= 1 && +hk[1] <= 3) semester = semesterLabel({ startYear: +hk[2], term: +hk[1] as 1 | 2 | 3 });
  }
  return semester || round ? { ...(semester ? { semester } : {}), ...(round ? { round } : {}) } : undefined;
}

/**
 * Đọc kết quả đăng ký / danh sách lớp của cổng MyBK (mybk.hcmut.edu.vn/dkmh): mỗi môn có tiêu đề “MÃ - Tên”, hàng nhóm lớp
 * “L04_L16 28/30 V …” (đã đăng ký/tối đa) và các hàng buổi học “Thứ 4 - - 8 9 10 11 12 … H6-301 2 ----5-7-9-1-3-5---”,
 * trong đó chuỗi tiết có 16 vị trí (số = tiết học, “-” = không học) và chuỗi tuần có mỗi vị trí là một tuần (chữ số = số tuần).
 * Đọc theo dòng chữ liền mạch nên không phụ thuộc cách ngắt dòng khi in PDF, chụp ảnh hay sao chép.
 */
export function parseMybk(lines: string[]): ParsedTimetable {
  const text = lines.join(' ').normalize('NFC');
  const tok = text.replace(/[✓✔\uFEFF]/g, ' ').split(/\s+/).filter(Boolean);
  /** tiêu đề môn trong bảng đã đăng ký có số thứ tự dính liền mã môn (“7EE3079 - …”) */
  const numbered = new Set<number>();
  tok.forEach((x, i) => { const m = tok[i + 1] === '-' ? x.match(/^\d{1,2}([A-Z]{2,6}\d{2,5}[A-Z]?)$/) : null; if (m) { tok[i] = m[1]; numbered.add(i); } });
  const regIds = new Set<string>(), listIds = new Set<string>();
  let isReg = false;
  const CODE_T = /^[A-Z]{2,6}\d{2,5}[A-Z]?$/;
  const PERIOD_T = /^(-|\d{1,2}|[-\d]{10,})$/;
  const WEEKS_T = /^[-\d]{8,}$/;
  const dayAt = (i: number): { day: number; next: number } | null => {
    if (tok[i] === 'Thứ' && /^[2-8]$/.test(tok[i + 1] ?? '')) return { day: +tok[i + 1], next: i + 2 };
    if (/^Thứ[2-8]$/.test(tok[i] ?? '')) return { day: +tok[i].slice(3), next: i + 1 };
    if (tok[i] === 'Chủ' && /^nh[aạậ]t$/i.test(tok[i + 1] ?? '')) return { day: 8, next: i + 2 };
    return null;
  };
  const sections = new Map<string, Section>();
  let code = '', name = '', credits = 0;
  let cur: Section | null = null;
  let seq = 0;
  const getSec = (group: string, seats?: Section['seats']) => {
    const k = `${code}|${group}`;
    let s = sections.get(k);
    const mark = () => { if (s) (isReg ? regIds : listIds).add(s.id); };
    if (!s) { s = { id: `${code}-${group}-${++seq}`, code, name: name || code, credits, group, slots: [], ...(seats ? { seats } : {}) }; sections.set(k, s); }
    else if (seats && !s.seats) s.seats = seats;
    mark();
    return s;
  };
  const periodsOf = (ts: string[]): number[] => {
    const out: number[] = [];
    if (ts.length === 1 && /^[-\d]{10,}$/.test(ts[0])) [...ts[0]].forEach((ch, i) => { if (ch !== '-') out.push(i + 1); });
    else for (const x of ts) if (x !== '-') out.push(+x);
    return [...new Set(out)].filter((p) => p >= 1 && p <= MAX_PERIOD).sort((a, b) => a - b);
  };
  const runs = (ps: number[]) => {
    const r: { start: number; len: number }[] = [];
    for (const p of ps) { const l = r[r.length - 1]; if (l && l.start + l.len === p) l.len++; else r.push({ start: p, len: 1 }); }
    return r;
  };
  const weeksOfStr = (w: string) => { const out: number[] = []; [...w].forEach((ch, i) => { if (ch !== '-') out.push(i + 1); }); return out; };

  for (let i = 0; i < tok.length; i++) {
    // tiêu đề môn: MÃ - Tên … [tín chỉ]
    if (CODE_T.test(tok[i]) && tok[i + 1] === '-') {
      let j = i + 2; const nm: string[] = [];
      // tín chỉ thường dính liền tên (“VN2.0”, “khóa 20.0” = “khóa 2” + “0.0”): tín chỉ là chữ số + “.” + chữ số cuối cùng
      let cr = 0;
      while (j < tok.length && tok[j] !== 'Nhóm' && j < i + 40) {
        const m = tok[j].match(/^(.*?)(\d\.\d)$/);
        if (m) { if (m[1]) nm.push(m[1]); cr = parseFloat(m[2]); j++; break; }
        nm.push(tok[j++]);
      }
      code = tok[i]; name = nm.join(' '); credits = cr; cur = null; isReg = numbered.has(i);
      i = j - 1; continue;
    }
    if (!code) continue;
    // hàng nhóm lớp: NHÓM  đã-đăng-ký/tối-đa
    const seat = tok[i].match(/^(\d+)\/(\d+)$/);
    if (seat && i > 0 && /^[A-Z0-9_]+$/.test(tok[i - 1]) && /[A-Z]/.test(tok[i - 1])) { cur = getSec(tok[i - 1], { taken: +seat[1], max: +seat[2] }); continue; }
    // hàng buổi học
    const d = dayAt(i);
    if (!d) continue;
    // hàng của hộp thoại “Đổi nhóm lớp”: NHÓM  tối-đa  đã-đăng-ký  Thứ/Chủ nhật  tiết  phòng
    let dialog: Section | null = null;
    if (/^\d{1,4}$/.test(tok[i - 1] ?? '') && /^\d{1,4}$/.test(tok[i - 2] ?? '') && /^[A-Z0-9_]+$/.test(tok[i - 3] ?? '') && /[A-Z]/.test(tok[i - 3])) dialog = getSec(tok[i - 3], { taken: +tok[i - 1], max: +tok[i - 2] });
    let j = d.next; const ts: string[] = [];
    while (j < tok.length && PERIOD_T.test(tok[j]) && ts.length < 16 + 4) { ts.push(tok[j]); if (/^[-\d]{10,}$/.test(tok[j])) { j++; break; } j++; }
    const ps = periodsOf(ts);
    if (!ps.length) continue;
    const room = /^[A-Z0-9][A-Z0-9-]*-[A-Z0-9]+$/.test(tok[j] ?? '') ? tok[j++] : undefined;
    let weeks: number[] | undefined;
    if (!dialog) {
      for (let k = j; k < Math.min(tok.length, j + 6); k++) if (WEEKS_T.test(tok[k])) { weeks = weeksOfStr(tok[k]); j = k + 1; break; }
    }
    const sec = dialog ?? cur;
    if (!sec) continue;
    // dán cả trang web: cùng một buổi học có thể xuất hiện nhiều lần (bảng đã đăng ký và bảng danh sách lớp), chỉ giữ một
    for (const r of runs(ps)) if (!sec.slots.some((x) => x.day === d.day && x.start === r.start && x.len === r.len && (x.room ?? '') === (room ?? ''))) sec.slots.push({ day: d.day, start: r.start, len: r.len, ...(room ? { room } : {}), ...(weeks?.length ? { weeks } : {}) });
    i = j - 1;
  }
  const out = [...sections.values()].filter((s) => s.slots.length);
  const meta = detectMeta(text);
  const ids = new Set(out.map((x) => x.id));
  return { sections: out, skipped: [], ...(meta ? { meta } : {}), regIds: [...regIds].filter((x) => ids.has(x)), listIds: [...listIds].filter((x) => ids.has(x)) };
}

export function parseSections(lines: string[], lookup?: (code: string) => { name?: string; credits?: number } | undefined, defaultCode?: string): ParsedTimetable {
  const my = parseMybk(lines);
  if (my.sections.length) return my;
  const map = new Map<string, Section>();
  const skipped: string[] = [];
  let lastCode = defaultCode, lastGroup = '', last: Section | null = null;
  let seq = 0;
  for (const raw of lines) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const cm = line.match(CODE);
    const code = cm?.[1] ?? lastCode;
    // tách phần tiêu đề (mã, tên, nhóm, tín chỉ) khỏi phần buổi học
    const slots: Slot[] = [];
    const body = cm ? line.slice((cm.index ?? 0) + cm[0].length) : line;
    const room = body.match(ROOM_RE)?.[1]?.replace(/\s/g, '');
    const weeks = weeksOf(line);
    const scrub = body.replace(ROOM_G, (x) => ' '.repeat(x.length)).replace(/[Tt]u[aầ]n(?:\s*h[oọ]c)?\s*:?\s*[\d\s,;–-]+/g, (x) => ' '.repeat(x.length));
    let firstSlotAt = scrub.length;
    for (const re of [SLOT_KW, SLOT_BARE]) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(scrub))) {
        const day = dayNum(m[1]);
        let start = +m[2], end = m[3] ? +m[3] : start;
        if (m[4]) { const nums = [start, ...m[4].split(',').filter(Boolean).map((x) => +x.trim())]; start = Math.min(...nums); end = Math.max(...nums); }
        if (start < 1 || end > MAX_PERIOD || end < start || day < 2 || day > 8) continue;
        if (slots.some((x) => x.day === day && x.start === start)) continue;
        if (m.index < firstSlotAt) firstSlotAt = m.index;
        slots.push({ day, start, len: end - start + 1, ...(room ? { room } : {}), ...(weeks ? { weeks } : {}) });
      }
    }
    if (!slots.length || !code) { if (cm) skipped.push(line); continue; }
    const head = body.slice(0, firstSlotAt);
    const gm = head.match(GROUP_RE);
    const group = gm?.[1] ?? (cm ? '' : lastGroup);
    const info = lookup?.(code);
    const head2 = head.replace(GROUP_RE, ' ').replace(/[|]/g, ' ').replace(/\s+/g, ' ').trim();
    const cr = head2.match(/\s(\d)$/);
    const name = info?.name ?? (cr ? head2.slice(0, cr.index) : head2).trim();
    const key = `${code}|${group || '?'}`;
    let sec = map.get(key);
    if (!sec) {
      sec = { id: `${code}-${group || 'x'}-${++seq}`, code, name: name || code, credits: info?.credits ?? (cr ? +cr[1] : 0), group: group || '', slots: [] };
      map.set(key, sec);
    }
    for (const s of slots) if (!sec.slots.some((x) => x.day === s.day && x.start === s.start && x.len === s.len && x.room === s.room)) sec.slots.push(s);
    lastCode = code; lastGroup = group; last = sec;
  }
  void last;
  return { sections: [...map.values()], skipped };
}

/** Môn mà lựa chọn khung giờ chắc chắn bị vi phạm: chỉ có 1 lớp (nhóm), hoặc chỉ dạy trong đúng 1 ngày trùng ngày muốn nghỉ. */
export interface PrefWarning { code: string; name: string; kind: 'single' | 'oneday'; group: string; day?: number; reasons: { why: 'early' | 'late' | 'off' | 'lunch'; slot: Slot }[] }
export function prefWarnings(all: Section[], prefs: Prefs): PrefWarning[] {
  const byCode = new Map<string, Section[]>();
  for (const s of all) if (campusOk(s, prefs.campus)) byCode.set(s.code, [...(byCode.get(s.code) ?? []), s]);
  const out: PrefWarning[] = [];
  for (const [code, secs] of byCode) {
    const groups = new Set(secs.map((s) => (s.group || s.id).trim().toUpperCase()));
    const name = secs[0].name;
    if (groups.size === 1) {
      const reasons: PrefWarning['reasons'] = [];
      for (const sl of secs.flatMap((s) => s.slots)) {
        if (sl.start < prefs.earliest) reasons.push({ why: 'early', slot: sl });
        if (slotEnd(sl) > prefs.latest) reasons.push({ why: 'late', slot: sl });
        if (prefs.daysOff.includes(sl.day)) reasons.push({ why: 'off', slot: sl });
        if (prefs.avoidLunch && sl.start <= 7 && slotEnd(sl) >= 6) reasons.push({ why: 'lunch', slot: sl });
      }
      if (reasons.length) { out.push({ code, name, kind: 'single', group: secs[0].group, reasons }); continue; }
    }
    const days = new Set(secs.flatMap((s) => s.slots.map((sl) => sl.day)));
    if (days.size === 1) {
      const d = [...days][0];
      if (prefs.daysOff.includes(d)) out.push({ code, name, kind: 'oneday', group: '', day: d, reasons: [] });
    }
  }
  return out;
}

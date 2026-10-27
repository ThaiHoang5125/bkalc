import type { CourseName, CustomProgram } from '../data/curriculum';
import type { ProgGroup } from '../data/programs';
import { buildLines } from './lines';
import type { Item, Line } from './lines';

export interface CurriculumResult {
  program: CustomProgram;
  warnings: string[];
}

// Mẫu "CHƯƠNG TRÌNH ĐÀO TẠO CỬ NHÂN KHÓA 20xx" của các khoa (khóa 2024–2025): tên nhóm ở lề trái, mã môn ở cột STT, tên môn ở cột giữa
// (dòng tiếng Việt rồi dòng tiếng Anh), tín chỉ và điều kiện ở cột phải. Cột tên, mã và điều kiện nằm lệch dòng nhau nên ghép theo tọa độ y.
// Vị trí cột lệch nhau chút ít giữa các file (cỡ trang, khoa), nên suy ra từ chính các dòng mã môn: mã ở lề trái, tín chỉ là ô ngay sau mã.

const CODE_LINE = /^(\d+)\s+([A-Z][A-Z0-9_]{3,})$/;
const HEADER = /^([A-Z](?:\.\d+)*)\.\s+(.+?)\s*(\d+(?:\.\d+)?)$/;
const COND_TOKEN = /([A-Z][A-Z0-9_]*)\((TQ|HT|SH|SHT|KN)\)/g;
const SKIP_GROUP = /tự chọn tự do|free elective|điều kiện tốt nghiệp|graduation condition/i;

/** Chia dãy dòng (y giảm dần) thành các đoạn liên tiếp, mỗi đoạn gán cho một môn sao cho tâm đoạn gần y của môn nhất. Trả số dòng của từng môn. */
export function assignRuns(ys: number[], codeYs: number[], needOne: boolean): number[] {
  const n = codeYs.length, m = ys.length;
  const pre = [0];
  for (const y of ys) pre.push(pre[pre.length - 1] + y);
  const INF = Infinity;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(INF));
  const from = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  dp[0][0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      for (let k = 0; k <= j; k++) {
        const prev = dp[i - 1][j - k];
        if (prev === INF) continue;
        let cost = 0;
        if (k === 0) cost = needOne ? 500 : 0;
        else {
          // tâm đoạn gần y của môn; phạt thêm độ lệch từng dòng để không gộp nhiều dòng có tâm trùng tình cờ
          cost = Math.abs((pre[j] - pre[j - k]) / k - codeYs[i - 1]);
          for (let t = j - k; t < j; t++) cost += 0.2 * Math.abs(ys[t] - codeYs[i - 1]);
        }
        if (prev + cost < dp[i][j]) { dp[i][j] = prev + cost; from[i][j] = k; }
      }
    }
  }
  const out = new Array<number>(n).fill(0);
  let j = m;
  for (let i = n; i >= 1; i--) { out[i - 1] = from[i][j]; j -= from[i][j]; }
  return out;
}

/** Font của PDF làm vài chữ giữa từ bị viết hoa ("MeThods", "VieTNamese"): hạ về chữ thường. Giữ nguyên dạng "IoT". */
export function fixCaps(s: string): string {
  const lower = (c: string) => c !== c.toUpperCase();
  return s.replace(/\p{L}+/gu, (w) => {
    if (![...w].some(lower) || /^[A-Z][a-z][A-Z]$/.test(w)) return w;
    const ch = [...w];
    let out = ch[0];
    for (let i = 1; i < ch.length; i++) out += lower(out[i - 1]) || (i === 1 && !!ch[2] && lower(ch[2])) ? ch[i].toLowerCase() : ch[i];
    return out;
  });
}

const cellsIn = (l: Line, [a, b]: [number, number]) => l.cells.filter((c) => c.x >= a && c.x < b);
const median = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];

function condOf(text: string): string {
  const toks = [...text.matchAll(COND_TOKEN)].map((m) => `${m[2]}[${m[1]}]`);
  return toks.length === 0 ? '' : toks.length === 1 ? toks[0] : `LIST(${toks.join(', ')})`;
}

const initials = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').split(/[^A-Za-z0-9]+/).filter((w) => w && !/^(va|cua|cho)$/i.test(w)).map((w) => w[0].toUpperCase()).join('').slice(0, 10);

export function parseCurriculum(pages: Item[][]): CurriculumResult {
  const lines = buildLines(pages);
  const all = lines.map((l) => l.text).join('\n');
  if (!/CHƯƠNG TRÌNH ĐÀO TẠO CỬ NHÂN/i.test(all) || !lines.some((l) => CODE_LINE.test(l.cells[0]?.text ?? ''))) {
    throw new Error('Không nhận ra mẫu chương trình đào tạo. App đọc được mẫu “CHƯƠNG TRÌNH ĐÀO TẠO CỬ NHÂN KHÓA 20xx” (khóa 2024–2025) của các khoa; mẫu khác thì dùng nhập bằng file JSON.');
  }
  const warnings: string[] = [];
  const head = lines.slice(0, 30);
  const find = (re: RegExp) => { for (const l of head) { const m = l.text.match(re); if (m) return m; } return null; };
  const year = parseInt(find(/KHÓA\s+(\d{4})/i)?.[1] ?? '', 10);
  const faculty = find(/^KHOA:\s*(.+)$/i)?.[1]?.trim();
  const major = find(/^Chuyên ngành:\s*(.+?)\s*-\s*[\d.]+\s*Tín chỉ/) ?? find(/^Ngành:\s*(.+?)\s*-\s*[\d.]+\s*Tín chỉ/);
  const credits = parseFloat(find(/^Ngành:.*-\s*([\d.]+)\s*Tín chỉ/)?.[1] ?? '');
  if (!Number.isFinite(year)) warnings.push('Không đọc được khóa; hãy nhập khóa ở bên dưới.');
  if (!major) warnings.push('Không đọc được tên ngành; hãy nhập tên ngành ở bên dưới.');
  if (!Number.isFinite(credits)) warnings.push('Không đọc được tổng tín chỉ; tạm lấy 132.');

  const codeCells = lines.flatMap((l) => l.cells.map((c, i) => ({ c, next: l.cells[i + 1] })).filter(({ c }) => c.x < 150 && CODE_LINE.test(c.text)));
  const credCells = codeCells.flatMap(({ next }) => (next && /^\d/.test(next.text) ? [next.x] : []));
  const cx = credCells.length ? median(credCells) : 442;
  const CODE_X: [number, number] = [0, 150];
  const NAME_X: [number, number] = [Math.max(...codeCells.map(({ c }) => c.x)) + 30, cx - 8];
  const CRED_X: [number, number] = [cx - 12, cx + 4];
  const COND_X: [number, number] = [cx + 4, cx + 100];
  let seenHeader = false;

  type Ev = { page: number; y: number } & ({ k: 'group'; g: ProgGroup } | { k: 'course'; code: string; credits: number });
  const events: Ev[] = [];
  const pageData = new Map<number, { codeYs: number[]; codes: string[]; names: { y: number; text: string }[]; conds: { y: number; text: string }[] }>();
  const pd = (p: number) => { let d = pageData.get(p); if (!d) pageData.set(p, (d = { codeYs: [], codes: [], names: [], conds: [] })); return d; };

  let pend: { lines: Line[] } | null = null;
  const finishPending = () => {
    if (!pend) return;
    const txt = pend.lines.map((x) => x.text).join(' ');
    const cred = pend.lines.flatMap((x) => x.cells).find((c) => c.x >= cx - 20 && /^\d+(\.\d+)?$/.test(c.text));
    const mark = txt.match(/\[(BB|TC)\]/)?.[1];
    events.push({ page: pend.lines[0].page, y: pend.lines[0].y, k: 'group', g: { t: fixCaps(txt.split(/\s+\(/)[0].replace(/\s+[A-Z]\.$/, '').replace(/[–-]\s*$/, '').trim()), id: '', lvl: 1, kind: mark === 'BB' ? 'bb' : 'tc', ...(cred ? { req: parseFloat(cred.text), unit: 'tc' as const } : {}) } });
    pend = null;
  };
  for (const l of lines) {
    const first = l.cells[0];
    const d = pd(l.page);
    const hm = first && first.x < 30 ? l.text.match(HEADER) : null;
    if (hm) {
      const title = hm[2].replace(/\s*\[(BB|TC)\]\s*$/, '');
      const vi = fixCaps(title.split(/\s+\(/)[0].replace(/\s*\[(BB|TC)\]/, '').trim());
      const mark = l.text.match(/\[(BB|TC)\]/)?.[1];
      const kind: 'bb' | 'tc' = mark ? (mark === 'BB' ? 'bb' : 'tc') : hm[1].startsWith('A') ? 'bb' : 'tc';
      seenHeader = true;
      events.push({ page: l.page, y: l.y, k: 'group', g: { t: vi, id: hm[1], lvl: 1, kind, req: parseFloat(hm[3]), unit: 'tc' } });
      continue;
    }
    // Tiêu đề nhóm không có mã chữ (A., B.…) và xuống dòng, ví dụ "Môn tự chọn nhóm … – Nhóm B (Elective …) [TC]"
    if (pend) {
      pend.lines.push(l);
      if (/\[(BB|TC)\]/.test(l.text) || pend.lines.length >= 4) finishPending();
      continue;
    }
    if (seenHeader && first && first.x >= 30 && first.x < NAME_X[0] && !cellsIn(l, CODE_X).some((c) => CODE_LINE.test(c.text)) && /^(Các )?môn tự chọn/i.test(l.text)) {
      pend = { lines: [l] };
      if (/\[(BB|TC)\]/.test(l.text)) finishPending();
      continue;
    }
    const code = cellsIn(l, CODE_X).map((c) => c.text.match(CODE_LINE)).find(Boolean);
    if (code) {
      const cc = cellsIn(l, CRED_X)[0];
      const cm = cc?.text.match(/^(\d+(?:\.\d+)?)(?:\s+(.*))?$/);
      if (!cm) warnings.push(`Môn ${code[2]}: không đọc được số tín chỉ.`);
      events.push({ page: l.page, y: l.y, k: 'course', code: code[2], credits: cm ? parseFloat(cm[1]) : 0 });
      d.codeYs.push(l.y); d.codes.push(code[2]);
      if (cm?.[2]) d.conds.push({ y: l.y, text: cm[2] });
    }
    if (!seenHeader) continue; // phần tiêu đề bảng (tên cột, ghi chú) nằm trước nhóm đầu tiên
    for (const c of cellsIn(l, COND_X)) if (/\((TQ|HT|SH|SHT|KN)\)/.test(c.text)) d.conds.push({ y: l.y, text: c.text });
    if (!first || first.x >= 30) for (const c of cellsIn(l, NAME_X)) d.names.push({ y: l.y, text: c.text });
  }

  const nameOf = new Map<string, CourseName>();
  const condMap = new Map<string, string>();
  for (const [, d] of pageData) {
    if (!d.codes.length) continue;
    const order = d.codeYs.map((y, i) => [y, i] as const).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
    const ys = order.map((i) => d.codeYs[i]);
    const nm = d.names.sort((a, b) => b.y - a.y);
    const nc = assignRuns(nm.map((x) => x.y), ys, true);
    let pos = 0;
    order.forEach((ci, r) => {
      const ls = nm.slice(pos, pos + nc[r]); pos += nc[r];
      const code = d.codes[ci];
      if (!ls.length) { warnings.push(`Môn ${code}: không tìm thấy tên môn.`); return; }
      const nv = Math.max(1, Math.floor(ls.length / 2));
      const e = ls.slice(nv).map((x) => x.text).join(' ');
      nameOf.set(code, { n: fixCaps(ls.slice(0, nv).map((x) => x.text).join(' ')), ...(e ? { e: fixCaps(e) } : {}), c: 0 });
    });
    const cd = d.conds.sort((a, b) => b.y - a.y);
    const cn = assignRuns(cd.map((x) => x.y), ys, false);
    pos = 0;
    order.forEach((ci, r) => {
      const txt = cd.slice(pos, pos + cn[r]).map((x) => x.text).join(' '); pos += cn[r];
      const c = condOf(txt);
      if (txt.trim() && !c) warnings.push(`Môn ${d.codes[ci]}: không đọc được điều kiện “${txt.trim()}”.`);
      if (c) condMap.set(d.codes[ci], c);
    });
  }

  events.sort((a, b) => a.page - b.page || b.y - a.y);
  const groups: ProgGroup[] = [];
  const courses: [string, number, string][] = [];
  const names: Record<string, CourseName> = {};
  let cur = -1;
  let skip = false;
  for (const ev of events) {
    if (ev.k === 'group') {
      skip = SKIP_GROUP.test(ev.g.t);
      if (!skip) { groups.push(ev.g); cur = groups.length - 1; } else cur = -1;
      continue;
    }
    if (cur < 0) { if (!skip) warnings.push(`Môn ${ev.code} nằm ngoài nhóm kiến thức nào, đã bỏ qua.`); continue; }
    if (courses.some((c) => c[0] === ev.code)) { warnings.push(`Môn ${ev.code} xuất hiện nhiều lần, giữ lần đầu.`); continue; }
    courses.push([ev.code, cur, condMap.get(ev.code) ?? '']);
    const n = nameOf.get(ev.code);
    names[ev.code] = { n: n?.n ?? ev.code, ...(n?.e ? { e: n.e } : {}), c: ev.credits };
  }
  const used = new Set(courses.map((c) => c[1]));
  const keep = groups.map((_, i) => used.has(i));
  const remap = new Map<number, number>();
  keep.forEach((k, i) => { if (k) remap.set(i, remap.size); });
  const majorName = major ? fixCaps(major[1].trim()) : '';
  const y = Number.isFinite(year) ? year : 0;
  const code = initials(majorName);
  const program: CustomProgram = {
    id: `${y}-${code}`, year: y, major: code, majorName, credits: Number.isFinite(credits) ? credits : 132,
    source: '', groups: groups.filter((_, i) => keep[i]), courses: courses.map(([c, g, k]) => [c, remap.get(g)!, k]), names,
    ...(faculty ? { faculty } : {}),
  };
  return { program, warnings };
}

import { SPECIAL_CODES, letterOf } from '../engine/scale';
import type { Line } from '../pdf/lines';
import { parseProgress } from '../pdf/progress';
import type { ProgressResult } from '../pdf/progress';
import { parseTranscript } from '../pdf/transcript';
import type { TranscriptResult } from '../pdf/transcript';
import { t as tr } from '../i18n';

/**
 * Chuyển kết quả OCR (từng từ kèm khung chữ nhật) về cùng dạng "Line" mà bộ đọc PDF dùng,
 * để dùng lại nguyên bộ phân tích Bảng điểm / Tiến độ. Mỗi ô được đặt vào đúng toạ độ cột chuẩn của form PDF.
 * Dòng nào không nhận ra được thì bỏ (nên ảnh sai bố cục sẽ cho ra ít môn thay vì dữ liệu bậy).
 */
export interface OcrWord { text: string; x0: number; y0: number; x1: number; y1: number; conf: number }
export interface OcrPage { width: number; height: number; words: OcrWord[] }
export type OcrResult = TranscriptResult | ProgressResult;
export type NameFix = (code: string) => { name: string; credits?: number } | undefined;

/** Bỏ dấu, hạ chữ thường: để so khớp tiêu đề dù OCR sai dấu. */
const nrm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9/+.]+/g, ' ').trim();

interface Tok { text: string; x0: number; x1: number; conf: number }
interface Row { cy: number; toks: Tok[]; text: string; nt: string }

/** OCR hay dính điểm với điểm chữ ("8.B", "9,4A+"): tách làm hai. */
function splitGlued(w: OcrWord): Tok[] {
  const m = w.text.match(/^(\d{1,3}(?:[.,]\d{1,2})?)\.?([A-F][+]?)$/);
  if (!m) return [{ text: w.text, x0: w.x0, x1: w.x1, conf: w.conf }];
  const cut = w.x0 + ((w.x1 - w.x0) * m[1].length) / w.text.length;
  return [{ text: m[1], x0: w.x0, x1: cut, conf: w.conf }, { text: m[2], x0: cut, x1: w.x1, conf: w.conf }];
}

function toRows(words: OcrWord[]): Row[] {
  const ws = words.map((w) => ({ ...w, text: w.text.trim() })).filter((w) => w.text !== '' && !/^[|_~`'’‘”“"“.,;:]+$/.test(w.text));
  if (!ws.length) return [];
  const hs = ws.map((w) => w.y1 - w.y0).sort((a, b) => a - b);
  const mh = hs[Math.floor(hs.length / 2)] || 10;
  const sorted = ws.map((w) => ({ w, cy: (w.y0 + w.y1) / 2 })).sort((a, b) => a.cy - b.cy);
  const rows: { cy: number; ws: typeof ws }[] = [];
  for (const { w, cy } of sorted) {
    const r = rows[rows.length - 1];
    if (r && cy - r.cy <= mh * 0.6) { r.ws.push(w); r.cy = (r.cy * (r.ws.length - 1) + cy) / r.ws.length; }
    else rows.push({ cy, ws: [w] });
  }
  return rows.map((r) => {
    const toks = r.ws.sort((a, b) => a.x0 - b.x0).flatMap(splitGlued);
    const text = toks.map((t) => t.text).join(' ');
    return { cy: r.cy, toks, text, nt: nrm(text) };
  });
}

const DIG = { O: '0', o: '0', I: '1', l: '1', '|': '1', S: '5', B: '8', Z: '2' } as Record<string, string>;
const ALPHA = { 0: 'O', 1: 'I', 5: 'S', 8: 'B', 2: 'Z' } as Record<string, string>;

/** Mã môn dạng EE3017, SP1035…: sửa nhầm O/0, I/1 ở đúng chỗ. */
export function fixCode(raw: string): string | null {
  const t = raw.replace(/[^A-Za-z0-9_]/g, '').replace(/^\d+(?=[A-Z]{2})/, ''); // bỏ ký tự rác (biểu tượng ✓/số) dính phía trước
  if (/^[A-Z]{5,8}$/.test(t) || /^[A-Z]{2,5}(_[A-Z0-9]{1,5}){1,3}$/.test(t)) return t; // mã đặc biệt: CCGDTC, ENG_GC_600…
  if (t.length < 5 || t.length > 10) return null;
  const head = t.slice(0, 2).split('').map((c) => ALPHA[c] ?? c.toUpperCase()).join('');
  if (!/^[A-Z]{2}$/.test(head)) return null;
  let i = 2;
  let third = '';
  if (/[A-Za-z]/.test(t[2]) && /\d/.test(t.slice(3, 7))) { third = t[2].toUpperCase(); i = 3; }
  const rest = t.slice(i);
  const m = rest.match(/^([0-9OIlSBZ]{3,4})([A-Za-z_0-9]*)$/);
  if (!m) return null;
  const digits = m[1].split('').map((c) => DIG[c] ?? c).join('');
  if (!/^\d{3,4}$/.test(digits)) return null;
  return head + third + digits + m[2].toUpperCase();
}

/** Mã đọc ra chưa có trong danh mục: nếu đúng một mã trong danh mục chỉ lệch 1 ký tự (hoặc trùng phần số) và tên môn có chung từ với tên đọc được thì lấy mã đó (EF3017 → EE3017). */
function snap(code: string, name: string, known?: Map<string, string>): string {
  if (!known || known.has(code)) return code;
  const dg = code.match(/\d{3,4}/)?.[0];
  const words = (x: string) => new Set(nrm(x).split(' ').filter((w) => w.length >= 2));
  const mine = words(name);
  const near = [...known].filter(([k, nm]) => {
    const oneOff = k.length === code.length && [...k].filter((c, i) => c !== code[i]).length === 1;
    const sameNum = !!dg && k.endsWith(dg) && Math.abs(k.length - code.length) <= 1;
    if (!oneOff && !sameNum) return false;
    return mine.size === 0 || [...words(nm)].some((w) => mine.has(w));
  });
  return near.length === 1 ? near[0][0] : code;
}

const numTxt = (s: string) => {
  const t = s.replace(',', '.').replace(/[^0-9.]/g, '').replace(/\.+$/, '');
  return /^\d{1,3}(\.\d{1,2})?$/.test(t) ? t : null;
};
const isSpecial = (s: string) => /^[A-Z]{2}$/.test(s) && s in SPECIAL_CODES;
const isLetter = (s: string) => /^[A-F]\+?$/.test(s);

interface Data { stt: string; code: string; name: string; score: string; letter: string; credits: string; rest: Tok[] }

/** Tách một dòng môn học: [stt] mã tên… điểm [chữ] tín_chỉ …phần còn lại. */
function dataRow(r: Row, seq: number, warn: string[], known?: Map<string, string>): Data | null {
  const t = r.toks;
  let ci = -1, code: string | null = null;
  for (let j = 0; j < Math.min(3, t.length); j++) { const c = fixCode(t[j].text); if (c) { ci = j; code = c; break; } }
  if (ci < 0 || !code) return null;
  const stt = ci > 0 && /^\d{1,3}$/.test(t[ci - 1].text.replace(/[^0-9]/g, '')) ? t[ci - 1].text.replace(/[^0-9]/g, '') : String(seq);
  const n = (k: number) => (k < t.length ? t[k] : undefined);
  for (const pass of [3, 2, 1]) {
    if (pass === 1) {
      // dòng mất cả điểm lẫn dấu "-": chỉ còn tên môn và số tín chỉ ở cuối
      const li = [...t].map((x, k) => (/^\d$/.test(x.text) ? k : -1)).filter((k) => k > ci).pop();
      if (li !== undefined && li <= t.length - 1 && t.slice(li + 1).every((x) => !/[A-Za-zÀ-ỹ]{3,}/.test(x.text))) {
        return { stt, code: snap(code, t.slice(ci + 1, li).map((x) => x.text).join(' '), known), name: t.slice(ci + 1, li).map((x) => x.text).join(' '), score: '', letter: '', credits: t[li].text, rest: t.slice(li + 1) };
      }
      continue;
    }
    for (let i = ci + 1; i < t.length; i++) {
      const a = /^[-—–]+$/.test(t[i].text) ? '-' : numTxt(t[i].text) ?? (isSpecial(t[i].text) ? t[i].text : null);
      const b = n(i + 1), c = n(i + 2);
      if (a === null) continue;
      let letter = '', ni = -1;
      if (pass === 3 && b && c && /^\d$/.test(c.text) && b.text.length <= 3) { letter = b.text.replace(/[^A-Za-z+]/g, '').toUpperCase(); ni = i + 3; }
      else if (pass === 2 && b && /^\d$/.test(b.text)) { ni = i + 2; }
      else continue;
      let score = a === '-' ? '' : a;
      const credits = t[ni - 1].text;
      // "94" → 9.4 (OCR hay làm mất dấu chấm), trừ 10 / 12 / 21 (12, 21 là mã MT / DT). Với 3 chữ số ("972") chọn cách chèn dấu khớp điểm chữ.
      if (/^\d{2,3}$/.test(score) && !['10', '12', '21'].includes(score)) {
        const cands = score.length === 2 ? [`${score[0]}.${score[1]}`] : [`${score[0]}.${score[1]}`, `${score[0]}.${score[2]}`, `${score[1]}.${score[2]}`];
        const pick = (isLetter(letter) && cands.find((x) => letterOf(parseFloat(x)) === letter)) || cands[0];
        warn.push(tr('{code}: điểm đọc là “{a}”, đã hiểu là {pick}.', { code, a, pick }));
        score = pick;
      }
      const nm = t.slice(ci + 1, i).map((x) => x.text).join(' ');
      return { stt, code: snap(code, nm, known), name: nm, score, letter, credits, rest: t.slice(ni) };
    }
  }
  return null;
}

const line = (page: number, y: number, cells: { x: number; text: string }[]): Line => ({ page, y, cells, text: cells.map((c) => c.text).join(' ') });
const after = (r: Row) => { const i = r.text.indexOf(':'); return (i >= 0 ? r.text.slice(i + 1) : r.toks.slice(3).map((t) => t.text).join(' ')).trim(); };

export function detectKind(pages: OcrPage[]): 'transcript' | 'progress' | null {
  const all = pages.flatMap((p) => toRows(p.words)).map((r) => r.nt).join('\n');
  if (/tien do hoan thanh/.test(all) || (/khoi kien thuc/.test(all) && /ma mon hoc/.test(all))) return 'progress';
  if (/bang diem/.test(all) || /tich luy (chung|hoc k)/.test(all)) return 'transcript';
  return null;
}

type Col = Record<string, number>;
const T: Col = { stt: 46, code: 74, name: 124, score: 250, letter: 285, credits: 318, status: 372, group: 454, note: 520 };
const P: Col = { stt: 65, code: 96, name: 153, score: 321, letter: 369, credits: 413, note: 487 };

function emitData(d: Data, X: Col, p: number, y: number, kind: 'transcript' | 'progress', fix: NameFix | undefined, warn: string[]): Line {
  const info = fix?.(d.code);
  let name = d.name;
  if (info) {
    name = info.name;
    if (info.credits !== undefined && String(info.credits) !== d.credits) warn.push(tr('{code}: số tín chỉ đọc được là {credits}, nhưng danh mục ghi {credits_}. Hãy kiểm tra lại.', { code: d.code, credits: d.credits, credits_: info.credits }));
  }
  const num = parseFloat(d.score);
  let letter = isLetter(d.letter) ? d.letter : '';
  if (Number.isFinite(num) && num <= 10) {
    const calc = letterOf(num);
    if (letter && letter !== calc && letter.replace('+', '') === calc.replace('+', '')) letter = calc; // OCR hay làm rụng dấu +
    if (letter && letter !== calc) warn.push(tr('{code}: điểm {score} ứng với {calc} nhưng ảnh đọc ra {letter}; một trong hai bị đọc sai.', { code: d.code, score: d.score, calc, letter }));
    if (!letter) letter = calc;
  }
  const cells: { x: number; text: string }[] = [{ x: X.stt, text: d.stt }, { x: X.code, text: d.code }, { x: X.name, text: name }];
  if (d.score) cells.push({ x: X.score, text: d.score });
  if (letter) cells.push({ x: X.letter, text: letter });
  cells.push({ x: X.credits, text: d.credits });
  if (kind === 'transcript') {
    const rest = d.rest.filter((t) => /[A-Za-zÀ-ỹ]{2,}/.test(t.text) || /^L\d{1,3}$/i.test(t.text));
    const gi = rest.findIndex((t) => /^L\w{1,3}$/i.test(t.text) || /^[A-Z]{1,2}\d{1,3}$/.test(t.text));
    const status = (gi >= 0 ? rest.slice(0, gi) : rest).map((t) => t.text).join(' ');
    const note = gi >= 0 ? rest.slice(gi + 1).map((t) => t.text).join(' ') : '';
    if (status) cells.push({ x: X.status, text: /khong tinh/.test(nrm(status)) ? 'Không tính TCTL' : status });
    if (gi >= 0) cells.push({ x: X.group, text: rest[gi].text.toUpperCase() });
    if (note) cells.push({ x: X.note, text: note });
  }
  return line(p, y, cells);
}

/** Kiểm tra dòng không phải môn: các dòng tiêu đề bảng. */
const isHeader = (nt: string) => /ten ?mon ?hoc|ma ?mon ?hoc|tinh trang|nhom ghi chu|^stt\b|^st\b/.test(nt.replace(/\s+/g, ' ')) || /diem tong|diem diem tin|^ma mon/.test(nt);

export function ocrToLines(pages: OcrPage[], kind: 'transcript' | 'progress', fix?: NameFix, known?: Map<string, string>): { lines: Line[]; warnings: string[]; rows: number } {
  const lines: Line[] = [];
  const warn: string[] = [];
  const X = kind === 'transcript' ? T : P;
  let started = false, seq = 0, rowsN = 0;
  const start = (p: number, y: number) => { if (!started) { started = true; lines.push(line(p, y, [{ x: 43, text: 'Stt' }])); } };

  pages.forEach((pg, p) => {
    const rows = toRows(pg.words);
    // x của cột tên và của các cột phụ để chia dòng nối tiếp
    const nameXs: number[] = [];
    let tinhX: number | undefined, ghiX: number | undefined;
    for (const r of rows) {
      const d = dataRow(r, 0, [], known);
      if (d) { const ci = r.toks.findIndex((t) => fixCode(t.text) !== null); const nx = r.toks[ci + 1]?.x0; if (nx !== undefined) nameXs.push(nx); }
      for (const t of r.toks) { const w = nrm(t.text); if (w === 'tinh' && tinhX === undefined) tinhX = t.x0; if (w === 'ghi' && ghiX === undefined) ghiX = t.x0; }
    }
    nameXs.sort((a, b) => a - b);
    const nameX = nameXs.length ? nameXs[Math.floor(nameXs.length / 2)] : undefined;
    let prev: 'data' | 'group' | null = null;

    rows.forEach((r, ri) => {
      const y = pg.height - r.cy;
      const nt = r.nt;
      // 1) thông tin sinh viên (trước bảng)
      if (!started) {
        if (/^ho va ten/.test(nt)) return void lines.push(line(p, y, [{ x: 28, text: `Họ và tên: ${after(r)}` }]));
        if (/^ma sinh vien/.test(nt)) return void lines.push(line(p, y, [{ x: 28, text: `Mã sinh viên: ${after(r).split(/\s+/)[0]}` }]));
        if (/^ma lop/.test(nt)) return void lines.push(line(p, y, [{ x: 28, text: `Mã lớp: ${after(r).split(/\s+/)[0]}` }]));
        if (/cap nhat cuoi/.test(nt)) { const m = r.text.match(/(\d{1,2}\s*[/.-]\s*\d{1,2}\s*[/.-]\s*\d{4}.*)$/); return void lines.push(line(p, y, [{ x: 443, text: `Cập nhật cuối: ${(m?.[1] ?? after(r)).replace(/\s+/g, '')}` }])); }
        if (kind === 'progress') {
          if (/^khoa /.test(nt) && !/\d/.test(nt) && r.toks.length < 8) return void lines.push(line(p, y, [{ x: 233, text: r.text }]));
          if (/^nganh/.test(nt)) return void lines.push(line(p, y, [{ x: 121, text: `Ngành: ${after(r)}` }]));
          if (/ap dung tu nam/.test(nt)) { const m = r.text.match(/(\d{4})/); if (m) return void lines.push(line(p, y, [{ x: 256, text: `Áp dụng từ năm: ${m[1]}` }])); }
          if (/so tin chi tich luy/.test(nt)) { const m = r.text.match(/(\d+)\s*\/\s*(\d+)/); if (m) return void lines.push(line(p, y, [{ x: 47, text: `Số tín chỉ tích lũy: ${m[1]}/${m[2]}` }])); }
          if (/diem tbtl he ?10/.test(nt)) { const m = after(r).match(/(\d+[.,]\d+)/); if (m) return void lines.push(line(p, y, [{ x: 47, text: `Điểm TBTL hệ 10: ${m[1].replace(',', '.')}/10` }])); }
          if (/diem tbtl he ?4/.test(nt)) { const m = after(r).match(/(\d+[.,]?\d*)/); if (m) return void lines.push(line(p, y, [{ x: 47, text: `Điểm TBTL hệ 4: ${m[1].replace(',', '.')}/4.0` }])); }
        }
        if (isHeader(nt)) { start(p, y + 1); prev = null; return; }
      }
      if (isHeader(nt)) { prev = null; return; }

      // 2) dòng môn học
      const d = dataRow(r, ++seq, warn, known);
      if (d && !(kind === 'progress' && !started && false)) {
        start(p, y + 1); rowsN++;
        lines.push(emitData(d, X, p, y, kind, fix, warn));
        prev = 'data';
        return;
      }
      seq--;
      if (!started) return;

      if (kind === 'transcript') {
        const sm = nt.match(/nam hoc (\d{4})[\s-]+(\d{4}).*?hoc k\w* ?(\d)/);
        if (sm) { lines.push(line(p, y, [{ x: 43, text: `Năm học ${sm[1]} - ${sm[2]} / Học kỳ ${sm[3]}` }])); prev = null; return; }
        if (/tich luy (chung|hoc k)/.test(nt)) {
          const nums = r.toks.map((t) => numTxt(t.text)).filter((x): x is string => x !== null);
          if (nums[0] && /^\d{2}$/.test(nums[0])) nums[0] = `${nums[0][0]}.${nums[0][1]}`; // mất dấu chấm: 37 → 3.7
          const g = nums[0] ? parseFloat(nums[0]) : NaN, c = nums[1] ? parseInt(nums[1], 10) : NaN;
          if (g >= 0 && g <= 4 && Number.isFinite(c)) lines.push(line(p, y, [{ x: 265, text: `${nums[0]} ${c} Tích lũy ${/chung/.test(nt) ? 'chung' : 'học kỳ'}` }]));
          else warn.push(tr('Không đọc được dòng tích lũy: “{text}”.', { text: r.text }));
          prev = null; return;
        }
        if (/mon hoc chuyen diem|mien diem/.test(nt)) { lines.push(line(p, y, [{ x: 43, text: 'Môn học chuyển điểm/miễn điểm' }])); prev = null; return; }
        if (prev === 'data' && nameX !== undefined && r.toks[0].x0 >= nameX - 25) {
          // dòng nối tiếp của ô nhiều dòng: chia theo cột tên / tình trạng / ghi chú
          const b1 = tinhX !== undefined ? (nameX + tinhX) / 2 : Infinity;
          const b2 = tinhX !== undefined && ghiX !== undefined ? (tinhX + ghiX) / 2 : Infinity;
          const part = (a: number, b: number) => r.toks.filter((t) => t.x0 >= a && t.x0 < b).map((t) => t.text).join(' ');
          const cells = [{ x: X.name, text: part(-Infinity, b1) }, { x: X.status, text: part(b1, b2) }, { x: X.note, text: part(b2, Infinity) }].filter((c) => c.text);
          if (cells.length) lines.push(line(p, y, cells));
        }
        return;
      }

      // Tiến độ: tiêu đề nhóm "Tên nhóm … 7/7 … Khối kiến thức Bắt buộc" (chữ "Khối" luôn có ở cột cuối, còn "7/7" hay bị đọc thành "77")
      let kk = r.toks.findIndex((t) => /^(khoi|kien)/.test(nrm(t.text.replace(/\s+/g, '')))); // "Khối kiến thức" (đôi khi chỉ đọc được một phần)
      if (kk < 0) kk = r.toks.findIndex((t, k) => k > 0 && /^\d{1,3}\/\d{1,3}$/.test(t.text)) + 1;
      if (kk > 0) {
        const pre = r.toks.slice(0, kk);
        const name = pre.filter((t) => t.text.length >= 2 && /[A-Za-zÀ-ỹ]/.test(t.text)).map((t) => t.text).join(' ');
        const rt = pre.map((t) => t.text.replace(/\s+/g, '')).find((x) => /^\d{1,3}\/\d{1,3}$/.test(x) || /^\d{2,4}$/.test(x));
        let ratio = '';
        if (rt?.includes('/')) ratio = rt;
        else if (rt) {
          const opts: { e: number; q: number; d: number }[] = [];
          // "898": hai chữ số lặp (8/8) cộng một ký tự rác (biểu tượng) dính phía sau
          if (rt.length % 2 === 1 && rt.length >= 3) { const h = (rt.length - 1) / 2; if (rt.slice(0, h) === rt.slice(h, 2 * h)) opts.push({ e: parseInt(rt.slice(0, h), 10), q: parseInt(rt.slice(0, h), 10), d: -1 }); }
          for (let k = 1; k < rt.length; k++) { const e = parseInt(rt.slice(0, k), 10), q = parseInt(rt.slice(k), 10); if (e <= q && q > 0 && q <= 60 && rt[k] !== '0') opts.push({ e, q, d: Math.abs(k - rt.length / 2) }); }
          opts.sort((x, y) => x.d - y.d);
          if (opts[0]) ratio = `${opts[0].e}/${opts[0].q}`;
        }
        if (ratio && !/\//.test(rt ?? "")) warn.push(tr('Nhóm “{name}”: số tín chỉ đọc là “{rt}”, đã hiểu là {ratio}.', { name, rt, ratio }));
        const note = r.toks.slice(kk).map((t) => t.text).join(' ').replace(/^.*?th[ứưu]c\s*/i, '').replace(/[^A-Za-zÀ-ỹ ]/g, '').trim();
        start(p, y + 1);
        const cells = [{ x: 61, text: name || 'Nhóm không tên' }];
        if (ratio) cells.push({ x: 408, text: ratio });
        cells.push({ x: 476, text: `Khối kiến thức ${note}`.trim() });
        lines.push(line(p, y, cells));
        prev = 'group'; return;
      }
      if (prev === 'group' && /^(bat buoc|tu chon|tu do|buoc|chon)$/.test(nt)) {
        lines.push(line(p, y, [{ x: 487, text: /buoc/.test(nt) ? 'Bắt buộc' : /do$/.test(nt) ? 'Tự do' : 'Tự chọn' }])); return;
      }
      if (prev === 'data' && nameX !== undefined && r.toks[0].x0 >= nameX - 20 && r.toks[r.toks.length - 1].x0 < nameX + (P.score - P.name) * 0.9) {
        lines.push(line(p, y, [{ x: X.name, text: r.text }]));
      }
      void ri;
    });
  });
  start(0, 0);
  if (kind === 'progress') fillRatios(lines, warn);
  return { lines, warnings: warn, rows: rowsN };
}

/** Nhóm không đọc được "đạt/yêu cầu": ước lượng bằng tổng tín chỉ các môn trong nhóm (đạt = môn đã có điểm từ 4,0 hoặc điểm đạt/miễn). */
function fillRatios(lines: Line[], warn: string[]) {
  const heads = lines.map((l, i) => ({ l, i })).filter(({ l }) => l.cells[0]?.x === 61 && l.cells.some((c) => c.x === 476));
  heads.forEach(({ l, i }, k) => {
    if (l.cells.some((c) => c.x === 408)) return;
    const end = k + 1 < heads.length ? heads[k + 1].i : lines.length;
    let total = 0, earned = 0;
    for (const d of lines.slice(i + 1, end)) {
      const cr = parseFloat(d.cells.find((c) => c.x === 413)?.text ?? '');
      if (!Number.isFinite(cr)) continue;
      total += cr;
      const sc = parseFloat(d.cells.find((c) => c.x === 321)?.text ?? '');
      if (Number.isFinite(sc) && (sc >= 4 || sc === 12 || sc === 21)) earned += cr;
    }
    if (total === 0) return;
    const noteText = [l, ...lines.slice(i + 1, end).filter((x) => x.cells[0]?.x === 487)].map((x) => x.cells.map((c) => c.text).join(' ')).join(' ');
    const elective = /tu/.test(nrm(noteText).split('khoi kien thuc')[1] ?? '');
    // Nhóm tự chọn: tổng các môn liệt kê lớn hơn số tín chỉ yêu cầu nên không suy ra được; tạm lấy bằng số đã đạt
    const req = elective ? earned : total;
    l.cells.splice(1, 0, { x: 408, text: `${earned}/${req}` });
    l.text = l.cells.map((c) => c.text).join(' ');
    warn.push(tr('Nhóm “{name}”: không đọc được số tín chỉ đạt/yêu cầu, tạm ghi {earned}/{req}.', { name: l.cells[0].text, earned, req }) + (elective ? ' ' + tr('(nhóm tự chọn nên số yêu cầu thật có thể lớn hơn)') : '') + ' ' + tr('Hãy đối chiếu với trường.'));
  });
}

/** Điểm vào chung: nhận dạng loại form rồi phân tích như PDF. */
export function parseOcr(pages: OcrPage[], fix?: NameFix, codes?: Iterable<[string, string]>): OcrResult {
  const kind = detectKind(pages);
  if (!kind) throw new Error(tr('Không nhận ra đây là ảnh của form “Bảng điểm” hay “Tiến độ hoàn thành chương trình đào tạo”. Hãy chụp rõ cả tiêu đề và bảng, chữ không bị cắt.'));
  const { lines, warnings, rows } = ocrToLines(pages, kind, fix, codes ? new Map(codes) : undefined);
  if (!rows) throw new Error(tr('Không đọc được dòng môn học nào trong ảnh. Hãy chụp lớn hơn, rõ nét và không bị che.'));
  const res = kind === 'transcript' ? parseTranscript(lines) : parseProgress(lines);
  const uniq = [...new Set(warnings)];
  return { ...res, warnings: [...uniq, ...res.warnings] };
}

/** Một mảnh chữ từ pdf.js: str, tọa độ trái x, baseline y (y càng lớn càng ở trên), độ rộng w. */
export interface Item { str: string; x: number; y: number; w: number }
export interface Cell { x: number; text: string }
export interface Line { page: number; y: number; cells: Cell[]; text: string }

const Y_TOL = 2.5; // cùng dòng nếu baseline lệch không quá 2.5pt
const GAP = 8; // khoảng hở > 8pt giữa hai mảnh chữ = sang ô (cột) khác
const SPACE = 1.2; // khoảng hở 1.2–8pt = dấu cách giữa hai từ

/**
 * PDF xuất từ Skia cắt chữ tiếng Việt thành rất nhiều mảnh nhỏ ("Đ", "o l", "ư", "ờ", "ng và"),
 * nên không thể đọc theo từng mảnh: ghép các mảnh sát nhau thành ô, rồi các ô cùng baseline thành dòng.
 */
export function buildLines(pages: Item[][]): Line[] {
  const out: Line[] = [];
  pages.forEach((items, page) => {
    // Mảnh chỉ có khoảng trắng bị bỏ: Skia chèn chúng giữa các cột nên làm dính cả dòng; dấu cách được suy ra từ khoảng hở.
    // Ký tự vùng riêng (U+E000–F8FF) là biểu tượng của font icon, ví dụ trước mã môn tự chọn: bỏ đi.
    const sorted = items.map((i) => ({ ...i, str: i.str.replace(/[\uE000-\uF8FF]/g, '') })).filter((i) => i.str.trim() !== '').sort((a, b) => b.y - a.y || a.x - b.x);
    const rows: Item[][] = [];
    for (const it of sorted) {
      const last = rows[rows.length - 1];
      if (last && Math.abs(last[0].y - it.y) <= Y_TOL) last.push(it);
      else rows.push([it]);
    }
    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);
      const cells: Cell[] = [];
      let end = -Infinity;
      for (const it of row) {
        const cur = cells[cells.length - 1];
        const gap = it.x - end;
        if (cur && gap <= GAP) cur.text += (gap > SPACE ? ' ' : '') + it.str;
        else cells.push({ x: it.x, text: it.str });
        end = it.x + it.w;
      }
      const clean = cells.map((c) => ({ x: c.x, text: c.text.normalize('NFC').replace(/\s+/g, ' ').trim() })).filter((c) => c.text !== '');
      if (clean.length) out.push({ page, y: row[0].y, cells: clean, text: clean.map((c) => c.text).join(' ') });
    }
  });
  return out;
}

/** Ghép chữ của các ô nằm trong khoảng x [from, to). */
export const colText = (line: Line, from: number, to: number) =>
  line.cells.filter((c) => c.x >= from && c.x < to).map((c) => c.text).join(' ').trim();

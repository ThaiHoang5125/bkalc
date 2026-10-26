import type { Attempt, RetakePolicy, Student } from './engine';
import { SPECIAL_NUMERIC, bandOf, canonSemester, semesterDisplay, bySemester, fromKdStudyRows, isSpecialCode, newId } from './engine';

const loadExcelJS = async () => (await import('exceljs/dist/exceljs.min.js')).default;

const cellText = (v: unknown): unknown => {
  if (v && typeof v === 'object') {
    const o = v as { result?: unknown; richText?: { text: string }[]; text?: unknown };
    if ('result' in o) return o.result;
    if (o.richText) return o.richText.map((r) => r.text).join('');
    if ('text' in o) return o.text;
  }
  return v;
};

/**
 * Đọc file Excel: ưu tiên sheet "Kết quả học tập" của KD Study (cột G/H/I);
 * nếu không có, tự tìm hàng tiêu đề chứa "môn" + "tín chỉ" + "điểm".
 */
export async function readExcel(buf: ArrayBuffer): Promise<Attempt[]> {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  for (const ws of wb.worksheets) {
    const tr = readTranscriptSheet(ws as never);
    if (tr) return tr;
  }
  const kd = wb.getWorksheet('Kết quả học tập');
  if (kd) {
    const rows: { name: unknown; credits: unknown; score: unknown }[] = [];
    kd.eachRow((row, n) => {
      if (n === 1) return;
      rows.push({ name: cellText(row.getCell(7).value), credits: cellText(row.getCell(8).value), score: cellText(row.getCell(9).value) });
    });
    return fromKdStudyRows(rows);
  }
  for (const ws of wb.worksheets) {
    let cols: { n: number; c: number; s: number; sem: number } | null = null;
    const rows: { name: unknown; credits: unknown; score: unknown; sem: unknown }[] = [];
    ws.eachRow((row) => {
      const cells = (row.values as unknown[]).map(cellText);
      if (!cols) {
        const low = cells.map((c) => String(c ?? '').toLowerCase());
        const n = low.findIndex((x) => x.includes('môn'));
        const c = low.findIndex((x) => x.includes('tín chỉ') || x === 'tc' || x.includes('stc'));
        const s = low.findIndex((x) => x.includes('điểm') && !x.includes('4') && !x.includes('chữ'));
        const sem = low.findIndex((x) => x.includes('học kỳ') || x.includes('hk'));
        if (n > 0 && c > 0 && s > 0) cols = { n, c, s, sem };
        return;
      }
      rows.push({ name: cells[cols.n], credits: cells[cols.c], score: cells[cols.s], sem: cols.sem > 0 ? cells[cols.sem] : '' });
    });
    if (cols) {
      const out = fromKdStudyRows(rows);
      rows.forEach((r, i) => { if (out[i] && typeof r.sem === 'string' && r.sem) out[i].semester = canonSemester(r.sem); });
      if (out.length) return out;
    }
  }
  return [];
}

const HEADERS = ['Stt', 'Mã môn học', 'Tên môn học', 'Điểm tổng kết', 'Điểm chữ', 'Tín chỉ', 'Đạt', 'Tình trạng', 'Nhóm', 'Ghi chú'];
const SPECIAL_OUT: Record<string, number> = { MT: 12, RT: 17, DT: 21 };
const f1 = (n: number | null) => (n === null ? '' : Math.round(n * 10) / 10);

/** Sheet "Bảng điểm" theo đúng bố cục form của Phòng Đào tạo HCMUT (học kỳ mới nhất ở trên, mỗi kỳ có 2 dòng tích lũy). */
export async function buildExcel(attempts: Attempt[], student?: Student, policy: RetakePolicy = 'highest'): Promise<Uint8Array> {
  const ExcelJS = await loadExcelJS();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Bảng điểm', { views: [{ state: 'frozen', ySplit: 0 }] });
  ws.columns = [{ width: 6 }, { width: 12 }, { width: 38 }, { width: 14 }, { width: 10 }, { width: 8 }, { width: 6 }, { width: 24 }, { width: 8 }, { width: 24 }];
  const thin = { style: 'thin' as const, color: { argb: 'FFBFBFBF' } };
  const box = { top: thin, left: thin, bottom: thin, right: thin };

  ws.mergeCells('A1:J1');
  Object.assign(ws.getCell('A1'), { value: 'BẢNG ĐIỂM' });
  ws.getCell('A1').font = { bold: true, size: 18 };
  ws.getCell('A1').alignment = { horizontal: 'center' };
  const info: string[] = [];
  if (student?.name) info.push(`Họ và tên: ${student.name}`);
  if (student?.id) info.push(`Mã sinh viên: ${student.id}`);
  if (student?.className) info.push(`Mã lớp: ${student.className}`);
  if (student?.transcriptUpdated) info.push(`Cập nhật cuối: ${student.transcriptUpdated}`);
  info.push('Điểm đặc biệt: CT = Cấm thi, VT = Vắng thi, CH = Chưa có điểm, RT = Rút môn học, KD = Không đạt, VP = Vắng thi có phép, DT = Điểm đạt, HT = Hoãn thi, MT = Điểm miễn.');
  info.forEach((s, k) => { ws.getCell(`A${k + 2}`).value = s; });
  const hr = info.length + 3;
  const head = ws.getRow(hr);
  head.values = HEADERS;
  head.font = { bold: true };
  head.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  head.eachCell((c) => { c.border = box; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }; });

  const rows = bySemester(attempts, policy);
  const order = [...rows].reverse();
  let stt = 0;
  for (const r of order) {
    const a1 = ws.addRow(['', '', '', f1(r.cumulativeGpa), '', r.cumulativeCredits, '', 'Tích lũy chung']);
    const a2 = ws.addRow([semesterDisplay(r.semester), '', '', f1(r.gpa), '', r.semCredits, '', 'Tích lũy học kỳ']);
    [a1, a2].forEach((row) => {
      ws.mergeCells(`H${row.number}:J${row.number}`);
      row.font = { bold: true };
      row.alignment = { horizontal: 'center' };
      row.eachCell({ includeEmpty: true }, (c) => { c.border = box; });
    });
    a1.getCell(4).numFmt = '0.0'; a2.getCell(4).numFmt = '0.0';
    a2.getCell(1).alignment = { horizontal: 'left' };
    for (const a of attempts.filter((x) => x.semester === r.semester)) {
      stt++;
      const b = a.score === null ? null : bandOf(a.score);
      const sp = a.special && SPECIAL_OUT[a.special] ? a.special : a.special ?? '';
      const passed = b ? b.passed : a.special === 'MT' || a.special === 'DT';
      const row = ws.addRow([stt, a.code ?? '', a.name, a.score ?? (a.special ? SPECIAL_OUT[a.special] ?? a.special : ''), b?.letter ?? sp, a.credits, passed ? '✓' : '', '', a.group ?? '', a.note ?? '']);
      row.eachCell({ includeEmpty: true }, (c, n) => { c.border = box; c.alignment = { vertical: 'middle', wrapText: n === 3 || n === 10, horizontal: n === 3 || n === 10 ? 'left' : 'center' }; });
    }
  }
  const out = await wb.xlsx.writeBuffer();
  return new Uint8Array(out as ArrayBuffer);
}

/** Đọc lại sheet "Bảng điểm" do buildExcel (hoặc form tương tự) tạo ra. Trả null nếu sheet không đúng định dạng. */
function readTranscriptSheet(ws: { eachRow: (cb: (row: { values: unknown }, n: number) => void) => void }): Attempt[] | null {
  let started = false;
  let semester = '';
  const out: Attempt[] = [];
  ws.eachRow((row) => {
    const c = (row.values as unknown[]).map(cellText);
    const txt = (k: number) => String(c[k] ?? '').trim();
    if (!started) { if (txt(2).toLowerCase().includes('mã môn') && txt(3).toLowerCase().includes('tên môn')) started = true; return; }
    if (/^Năm học/i.test(txt(1))) { semester = canonSemester(txt(1)); return; }
    const stt = Number(c[1]);
    if (!Number.isFinite(stt) || !txt(3)) return;
    const raw = c[4];
    const letter = txt(5).toUpperCase();
    let score: number | null = null;
    let special: Attempt['special'];
    const num = typeof raw === 'number' ? raw : Number(String(raw ?? '').replace(',', '.'));
    if (raw !== '' && raw != null && Number.isFinite(num)) {
      if (num > 10 && SPECIAL_NUMERIC[num]) special = SPECIAL_NUMERIC[num]; else if (num >= 0 && num <= 10) score = num;
    } else if (isSpecialCode(txt(4).toUpperCase())) special = txt(4).toUpperCase() as Attempt['special'];
    if (!special && score === null && isSpecialCode(letter)) special = letter as Attempt['special'];
    if (!special && score === null) special = 'CH';
    const credits = Number(c[6]);
    const note = txt(10);
    out.push({
      id: newId(), ...(txt(2) ? { code: txt(2).toUpperCase() } : {}), name: txt(3), credits: Number.isFinite(credits) ? credits : 0,
      score, ...(special ? { special } : {}), ...(letter && !special ? { officialLetter: letter } : {}),
      semester: semester || 'Chưa phân loại', ...(txt(9) ? { group: txt(9) } : {}),
      ...(note ? { note } : {}), ...(/Không tính TCTL/i.test(note) ? { excluded: true } : {}), source: 'excel',
    });
  });
  return started && out.length ? out : null;
}

export { newId };

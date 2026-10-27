/**
 * Chụp lại ảnh cho trang Hướng dẫn (public/guide/*.png) bằng Chrome headless, dữ liệu mẫu, không đụng dữ liệu thật.
 *
 *   npm run dev                      (cửa sổ khác, cổng 5173)
 *   node scripts/guide-shots.cjs     (cần Chrome; đặt CHROME=... nếu cài chỗ khác; GUIDE_URL=... nếu đổi địa chỉ)
 *
 * Mỗi ảnh = mở trang → (tuỳ chọn) bấm/gõ → khoanh đỏ + đánh số chỗ cần bấm → cắt vùng nội dung.
 * Số trên ảnh khớp với số trong chú thích (src/guideSteps.ts). Giao diện đổi thì chạy lại.
 * Không cần thư viện ngoài (Node 22+ có sẵn fetch/WebSocket).
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const URL = process.env.GUIDE_URL || 'http://localhost:5173/';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = path.join(__dirname, '..', 'public', 'guide');
const sample = require('../tests/sample37.json');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- dữ liệu mẫu (người giả, điểm từ tests/sample37.json) ---------- */
const sems = ['Năm học 2022 - 2023 / Học kỳ 1', 'Năm học 2022 - 2023 / Học kỳ 2', 'Năm học 2023 - 2024 / Học kỳ 1', 'Năm học 2023 - 2024 / Học kỳ 2', 'Năm học 2024 - 2025 / Học kỳ 1'];
const DATA = {
  version: 2,
  attempts: sample.map((a, i) => ({ ...a, semester: sems[Math.floor(i / 8) % sems.length] })),
  settings: { totalCredits: 132, targetGpa: 3.2, retakePolicy: 'highest' },
  student: { name: 'Nguyễn Văn A', id: '2210001', className: 'DD22', faculty: 'Điện - Điện tử' },
};

/* ---------- điều khiển Chrome qua DevTools Protocol ---------- */
async function launch(w = 1280, h = 800) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bkalc-shot-'));
  const port = 9300 + Math.floor(Math.random() * 500);
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, `--window-size=${w},${h}`, '--force-device-scale-factor=1', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
  let page;
  for (let i = 0; i < 60 && !page; i++) {
    try { page = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* chờ Chrome */ }
    if (!page) await sleep(200);
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const pending = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); const p = pending.get(d.id); if (p) { pending.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const close = async () => { try { await send('Browser.close'); } catch { /* đã đóng */ } ws.close(); proc.kill(); };
  return { send, ev, close };
}

/* Hàm chạy TRONG trang: tìm phần tử theo chữ, khoanh đỏ + số. */
const IN_PAGE = `
window.__find = (s) => {
  const all = [...document.querySelectorAll(s.sel || 'button,a,h1,h2,h3,h4,label,summary,div,span,p,input,textarea,select')];
  const hit = all.filter((e) => (s.h ? (e.innerText || '').includes(s.h) : true) && (s.t ? (e.innerText || '').trim().startsWith(s.t) || (e.placeholder || '').startsWith(s.t) || (e.getAttribute('aria-label') || '').startsWith(s.t) : true) && e.offsetParent !== null);
  hit.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height);
  let el = hit[s.i || 0];
  for (let k = 0; el && k < (s.up || 0); k++) el = el.parentElement;
  return el;
};
window.__clear = () => document.getElementById('__marks')?.remove();
window.__mark = (list) => {
  window.__clear();
  const box = document.createElement('div'); box.id = '__marks'; box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999';
  list.forEach((s, n) => {
    let r;
    if (s.r) r = { left: s.r[0], top: s.r[1], width: s.r[2], height: s.r[3] };
    else { const el = window.__find(s); if (!el) throw new Error('Không thấy: ' + JSON.stringify(s)); r = el.getBoundingClientRect(); }
    const p = s.pad ?? 5;
    const ring = document.createElement('div');
    ring.style.cssText = 'position:absolute;border:3px solid #e11d48;border-radius:10px;box-shadow:0 0 0 3px rgba(255,255,255,.85);left:' + (r.left - p) + 'px;top:' + (r.top - p) + 'px;width:' + (r.width + 2 * p) + 'px;height:' + (r.height + 2 * p) + 'px';
    const b = document.createElement('div'); b.textContent = String(s.n || n + 1);
    b.style.cssText = 'position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;background:#e11d48;color:#fff;font:700 15px system-ui;display:grid;place-items:center;box-shadow:0 0 0 2px #fff';
    ring.appendChild(b); box.appendChild(ring);
  });
  document.body.appendChild(box);
};
window.__rect = (s) => { const r = window.__find(s).getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; };
window.__click = (s) => { window.__find(s).click(); return true; };
const st = document.createElement('style'); st.textContent = '.credit,.toasts{display:none!important} *{animation:none!important;transition:none!important}'; document.head.appendChild(st); true;
`;

async function main() {
  const b = await launch();
  const e = b.ev;
  const q = JSON.stringify;
  const nav = async (label) => { await e(`window.__click({sel:'.navitem',t:${q(label)}})`); await sleep(500); await e('window.scrollTo(0,0); true'); };
  const click = async (s) => { await e(`window.__click(${q(s)})`); await sleep(400); };
  const scrollTo = async (s) => { await e(`window.__find(${q(s)}).scrollIntoView({block:'center'}); true`); await sleep(300); };
  /** Chụp vùng main (bên phải thanh bên) hoặc cả cửa sổ; marks khoanh trước khi chụp. */
  const snap = async (name, marks = [], opt = {}) => {
    await e(`window.__mark(${q(marks)}); true`);
    const clip = opt.clip || (opt.full ? { x: 0, y: 0, width: 1280, height: 800 } : { x: 300, y: 0, width: 880, height: 800 });
    const sy = await e('window.scrollY');
    const r = await b.send('Page.captureScreenshot', { format: 'png', clip: { ...clip, y: clip.y + sy, scale: 1 } });
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
    await e('window.__clear(); true');
    console.log('✓', name);
  };

  try {
    await b.send('Page.navigate', { url: URL }); await sleep(1500);
    await e(`localStorage.setItem('hcmut-gpa-data-v1', ${q(JSON.stringify(DATA))}); localStorage.setItem('hcmut-gpa-theme','light'); localStorage.setItem('hcmut-gpa-guide-stage','all'); true`);
    await b.send('Page.navigate', { url: URL }); await sleep(1800);
    await e(IN_PAGE);

    // Bắt đầu nhanh
    await nav('Dữ liệu & cài đặt');
    await snap('start-1', [{ sel: '.navitem', t: 'Dữ liệu & cài đặt', pad: 2 }, { sel: 'button', t: 'Chọn file PDF…', i: 0, n: 2 }], { full: true });

    // Tổng quan (3 tab: Tóm tắt / Biểu đồ / Công cụ)
    await nav('Tổng quan');
    const rects = await e(`[...document.querySelectorAll('.kpis .kpi')].map((k) => { const r = k.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })`);
    const tabs = await e(`(() => { const r = document.querySelector('.seg').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()`);
    await snap('overview-1', [{ r: [340, 233, 560, 100] }, { r: tabs, pad: 3 }, ...rects.map((r) => ({ r }))], { clip: { x: 300, y: 0, width: 880, height: 740 } });
    await click({ sel: '.seg button', t: 'Biểu đồ' });
    await snap('overview-2', [{ sel: '.seg button', t: 'Biểu đồ', pad: 3 }, { t: 'GPA theo học kỳ', sel: 'h3', up: 2 }, { t: 'Phân bố điểm chữ', sel: 'h3', up: 2 }], { clip: { x: 300, y: 440, width: 880, height: 360 } });

    // Bảng điểm
    await nav('Bảng điểm');
    await snap('transcript-1', [{ sel: 'button', t: 'Theo học kỳ' }, { t: 'Tìm môn đã học', sel: 'input' }, { sel: 'button', t: 'Chỉ môn chưa đạt' }], { clip: { x: 300, y: 0, width: 880, height: 600 } });
    await e(`(()=>{const i=window.__find({sel:'input',t:'Tìm mã môn hoặc tên môn để thêm'}); i.focus(); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(i,'EE3017'); i.dispatchEvent(new Event('input',{bubbles:true})); return true})()`);
    await sleep(500);
    await snap('transcript-2', [{ sel: 'input', t: 'Tìm mã môn hoặc tên môn để thêm', pad: 3 }, { sel: 'button', t: '+ Thêm môn', n: 2 }], { clip: { x: 300, y: 300, width: 880, height: 500 } });
    await nav('Bảng điểm');
    await snap('transcript-3', [{ r: [840, 585, 72, 40], pad: 2 }, { r: [665, 588, 40, 34], pad: 2 }, { r: [1128, 590, 30, 30], pad: 2 }], { clip: { x: 300, y: 480, width: 880, height: 320 } });

    // Mục tiêu
    await nav('Mục tiêu');
    await snap('goals-1', [{ sel: 'button', t: 'Giỏi' }, { t: 'Điểm TB cần đạt', up: 1, n: 2 }], { clip: { x: 300, y: 100, width: 880, height: 700 } });
    await click({ sel: 'button', t: 'Tính điểm môn đang học' });
    await snap('goals-2', [{ sel: 'button', t: 'Tính điểm môn đang học' }], { clip: { x: 300, y: 0, width: 880, height: 600 } });

    // Kế hoạch
    await nav('Kế hoạch');
    await snap('semplan-1', [{ sel: 'button', t: 'Tự xếp các môn bắt buộc còn lại' }, { sel: 'button', t: 'Thêm thao tác', n: 2 }], { clip: { x: 300, y: 0, width: 880, height: 520 } });
    await click({ sel: 'button', t: 'Tự xếp các môn bắt buộc còn lại' });
    await sleep(800);
    await e(`(()=>{const y=window.__find({sel:'summary',t:'Năm học thứ 5'}); if(!y.parentElement.open) y.click(); y.scrollIntoView({block:'start'}); window.scrollBy(0,-20); return true})()`);
    await sleep(500);
    await snap('semplan-2', [{ sel: 'summary', t: 'Năm học thứ 5', pad: 3 }], { clip: { x: 300, y: 0, width: 880, height: 800 } });

    // Xếp lịch
    await nav('Xếp lịch');
    await snap('timetable-1', [{ sel: 'textarea' }, { sel: 'button', t: 'Đọc đoạn chữ', n: 2 }], { clip: { x: 300, y: 270, width: 880, height: 530 } });
    await click({ sel: 'button', h: 'Lịch của tôi' });
    await snap('timetable-2', [{ sel: 'button', h: 'Lịch của tôi', pad: 3 }], { clip: { x: 300, y: 270, width: 880, height: 400 } });
    await click({ sel: 'button', h: 'Khung giờ mong' });
    await snap('timetable-3', [{ sel: 'button', h: 'Khung giờ mong', pad: 3 }], { clip: { x: 300, y: 270, width: 880, height: 530 } });

    // Dữ liệu & cài đặt (chụp tab Cài đặt trước để menu ⋯ không che)
    await nav('Dữ liệu & cài đặt');
    await click({ sel: 'button', t: 'Cài đặt' });
    await snap('data-2', [{ sel: '.seg button', t: 'Cài đặt', pad: 3 }], { clip: { x: 300, y: 0, width: 880, height: 560 } });
    await click({ sel: '.seg button', t: 'Dữ liệu' });
    await click({ sel: 'button', t: 'Thêm thao tác' });
    await snap('data-1', [{ sel: 'button', t: 'Thêm thao tác', pad: 3 }], { clip: { x: 600, y: 0, width: 600, height: 340 } });
  } finally { await b.close(); }
}
main().catch((err) => { console.error(err); process.exit(1); });

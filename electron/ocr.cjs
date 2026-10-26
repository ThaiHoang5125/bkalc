// Nhận dạng chữ trong ảnh chụp màn hình: chạy hoàn toàn trên máy (tesseract.js + dữ liệu tiếng Việt đóng gói sẵn trong app),
// không tải gì từ Internet và không gửi ảnh đi đâu.
const path = require('path');

// Khi đóng gói, các file này nằm trong app.asar.unpacked (worker và wasm không chạy được từ bên trong asar)
const real = (p) => p.replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
let worker = null;
let busy = Promise.resolve();

async function getWorker() {
  if (worker) return worker;
  const { createWorker } = require('tesseract.js');
  const lang = path.dirname(real(require.resolve('@tesseract.js-data/vie/package.json')));
  worker = await createWorker('vie', 1, {
    workerPath: real(require.resolve('tesseract.js/src/worker-script/node/index.js')),
    corePath: path.dirname(real(require.resolve('tesseract.js-core/package.json'))),
    langPath: path.join(lang, '4.0.0_best_int'),
    gzip: true,
    cacheMethod: 'none',
  });
  return worker;
}

/** Đọc một ảnh (Buffer PNG/JPG) → { width, height, words: [{ text, x0, y0, x1, y1, conf }] }. Các ảnh được xử lý lần lượt. */
function recognize(buf) {
  const job = busy.then(async () => {
    const w = await getWorker();
    const r = await w.recognize(buf, {}, { blocks: true });
    const words = [];
    for (const b of r.data.blocks || []) for (const p of b.paragraphs) for (const l of p.lines) for (const wd of l.words)
      words.push({ text: wd.text, x0: wd.bbox.x0, y0: wd.bbox.y0, x1: wd.bbox.x1, y1: wd.bbox.y1, conf: wd.confidence });
    const png = buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47;
    return { width: png ? buf.readUInt32BE(16) : 0, height: png ? buf.readUInt32BE(20) : 0, words };
  });
  busy = job.catch(() => {});
  return job;
}

async function shutdown() {
  if (worker) { const w = worker; worker = null; try { await w.terminate(); } catch { /* bỏ qua */ } }
}

module.exports = { recognize, shutdown };

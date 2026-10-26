// Electron main process: tạo cửa sổ và lưu dữ liệu ra file JSON trong thư mục userData.
const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { createGuard } = require('./lock.cjs');
const { resolveUserDataDir } = require('./userdata.cjs');

// Dữ liệu nằm ở %APPDATA%\BKalc; nếu máy còn thư mục cũ 'HCMUT GPA' thì sao chép sang (giữ nguyên bản cũ) để không mất tài khoản đã lưu.
app.setPath('userData', resolveUserDataDir(path.join(app.getPath('appData'), 'HCMUT GPA'), path.join(app.getPath('appData'), 'BKalc')));

const dataFile = () => path.join(app.getPath('userData'), 'gpa-data.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'BKalc',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    backgroundColor: '#f6f7f9',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  Menu.setApplicationMenu(null);
  lockDown(win);
  // Chỉ nhận URL dev khi chạy từ mã nguồn; bản đã đóng gói luôn tải đúng file trong app.
  const devUrl = app.isPackaged ? '' : process.env.ELECTRON_START_URL;
  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

// Khóa bảo trì: mặc định chặn DevTools, mở cửa sổ mới và điều hướng ra ngoài app.
// Ctrl+Shift+F12 mở hộp nhập mã; đúng mã thì được dùng DevTools đến khi thoát app.
const guard = createGuard();
let maintenance = false;
let unlockWin = null;

function lockDown(win) {
  const wc = win.webContents;
  wc.setWindowOpenHandler(() => ({ action: 'deny' }));
  wc.on('will-navigate', (e, url) => { if (!url.startsWith('file:') && app.isPackaged) e.preventDefault(); });
  wc.on('devtools-opened', () => { if (app.isPackaged && !maintenance) wc.closeDevTools(); });
  wc.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown' || !app.isPackaged) return;
    const k = input.key.toLowerCase();
    if (input.control && input.shift && k === 'f12') { e.preventDefault(); openUnlock(win); return; }
    const devKey = k === 'f12' || (input.control && input.shift && (k === 'i' || k === 'j' || k === 'c'));
    if (devKey && !maintenance) e.preventDefault();
  });
}

function openUnlock(parent) {
  if (maintenance) { parent.webContents.openDevTools({ mode: 'detach' }); return; }
  if (unlockWin) { unlockWin.focus(); return; }
  unlockWin = new BrowserWindow({
    width: 340, height: 190, parent, modal: true, resizable: false, minimizable: false, maximizable: false,
    title: 'Mã bảo trì', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'unlockPreload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  unlockWin.setMenu(null);
  unlockWin.loadFile(path.join(__dirname, 'unlock.html'));
  unlockWin.on('closed', () => { unlockWin = null; });
}

ipcMain.handle('lock:submit', (e, code) => {
  const r = guard.attempt(String(code ?? '').slice(0, 200));
  if (r.ok) {
    maintenance = true;
    const parent = BrowserWindow.fromWebContents(e.sender)?.getParentWindow();
    if (unlockWin) unlockWin.close();
    if (parent) parent.webContents.openDevTools({ mode: 'detach' });
  }
  return r;
});

ipcMain.handle('data:load', async () => {
  try {
    return fs.readFileSync(dataFile(), 'utf8');
  } catch {
    return null;
  }
});

ipcMain.handle('data:save', async (_e, text) => {
  const file = dataFile();
  const tmp = file + '.tmp';
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file); // ghi nguyên tử, tránh hỏng file khi tắt đột ngột
  return true;
});

ipcMain.handle('data:path', async () => dataFile());

ipcMain.handle('file:save', async (_e, { defaultName, base64, filters }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({ defaultPath: defaultName, filters });
  if (canceled || !filePath) return null;
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return filePath;
});

ipcMain.handle('ocr:image', async (_e, bytes) => {
  try {
    return { ok: true, page: await require('./ocr.cjs').recognize(Buffer.from(bytes)) };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
});

app.on('before-quit', () => { void require('./ocr.cjs').shutdown(); });

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

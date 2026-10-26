// Chuyển dữ liệu từ thư mục cũ (tên app trước đây là 'HCMUT GPA') sang thư mục mới 'BKalc'.
// Chỉ sao chép, không xóa bản cũ, để lỡ có sự cố người dùng vẫn còn dữ liệu gốc.
const fs = require('fs');
const path = require('path');

const FILE = 'gpa-data.json';

/** Trả về thư mục dữ liệu cần dùng: `newDir` nếu đã có/chuyển được, ngược lại `oldDir` (không mất dữ liệu). */
function resolveUserDataDir(oldDir, newDir) {
  try {
    if (fs.existsSync(path.join(newDir, FILE))) return newDir;
    if (!fs.existsSync(path.join(oldDir, FILE))) return newDir; // máy mới, chưa có gì để chuyển
    fs.cpSync(oldDir, newDir, { recursive: true });
    const a = fs.readFileSync(path.join(oldDir, FILE));
    const b = fs.readFileSync(path.join(newDir, FILE));
    return a.equals(b) ? newDir : oldDir;
  } catch {
    return oldDir;
  }
}

module.exports = { resolveUserDataDir };

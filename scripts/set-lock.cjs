// Đặt mã khóa mới: node scripts/set-lock.cjs "mã-mới"  (hoặc npm run lock:set -- "mã-mới")
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { hashCode } = require('../electron/lock.cjs');

const code = process.argv[2];
if (!code || code.length < 8) { console.error('Cần mã khóa dài tối thiểu 8 ký tự.'); process.exit(1); }
const salt = crypto.randomBytes(16).toString('hex');
const file = path.join(__dirname, '..', 'electron', 'lock.cjs');
const src = fs.readFileSync(file, 'utf8')
  .replace(/^const SALT = '.*';$/m, `const SALT = '${salt}';`)
  .replace(/^const HASH = '.*';$/m, `const HASH = '${hashCode(code, salt)}';`);
fs.writeFileSync(file, src);
console.log('Đã cập nhật electron/lock.cjs. Hãy build lại để mã mới có hiệu lực.');

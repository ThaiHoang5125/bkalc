// Khóa bảo trì: chỉ lưu băm (scrypt + salt) của mã khóa, không có mã gốc trong code.
// Đổi mã: `npm run lock:set -- "mã-mới"` rồi build lại (script sẽ ghi lại SALT/HASH bên dưới).
const crypto = require('crypto');

const SALT = '72241127ad1fe99ef4fb221f1d3011a7';
const HASH = 'dbe9b2037f19eff344a27d6b649718fddca15071680fb7a5e302e23f417a86b0';

function hashCode(code, saltHex) {
  return crypto.scryptSync(String(code), Buffer.from(saltHex, 'hex'), 32).toString('hex');
}

function check(code, saltHex = SALT, hashHex = HASH) {
  if (!saltHex || !hashHex) return false;
  const a = Buffer.from(hashCode(code, saltHex), 'hex');
  const b = Buffer.from(hashHex, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Giới hạn số lần thử: sai maxTries lần liên tiếp thì khóa lockMs mili giây.
function createGuard({ salt = SALT, hash = HASH, maxTries = 5, lockMs = 60000, now = Date.now } = {}) {
  let fails = 0;
  let lockedUntil = 0;
  return {
    attempt(code) {
      const t = now();
      if (t < lockedUntil) return { ok: false, locked: true, remainingMs: lockedUntil - t, triesLeft: 0 };
      if (check(code, salt, hash)) { fails = 0; return { ok: true, locked: false, remainingMs: 0, triesLeft: maxTries }; }
      fails += 1;
      if (fails >= maxTries) { fails = 0; lockedUntil = t + lockMs; return { ok: false, locked: true, remainingMs: lockMs, triesLeft: 0 }; }
      return { ok: false, locked: false, remainingMs: 0, triesLeft: maxTries - fails };
    },
  };
}

module.exports = { hashCode, check, createGuard };

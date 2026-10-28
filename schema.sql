-- Chạy một lần trong D1 Console của database bkalc-stats.
CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, seen INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_seen ON sessions (seen);
CREATE TABLE IF NOT EXISTS buckets (ts INTEGER PRIMARY KEY, peak INTEGER NOT NULL);

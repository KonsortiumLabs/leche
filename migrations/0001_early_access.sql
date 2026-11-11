CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  created_at TEXT NOT NULL, consent_at TEXT NOT NULL, consent_version TEXT NOT NULL,
  consent_text TEXT NOT NULL, email_verified INTEGER NOT NULL DEFAULT 0,
  utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, referrer_host TEXT,
  entry_path TEXT NOT NULL, unsubscribed_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS surveys (
  lead_id TEXT PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  flavor TEXT, price TEXT, intent TEXT, reservation INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS metrics (
  day TEXT NOT NULL, event TEXT NOT NULL, path TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(day,event,path)
);
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS internal_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS rate_expiry ON rate_limits(expires_at);

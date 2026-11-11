CREATE TABLE IF NOT EXISTS purchase_interest (
  lead_id TEXT PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  product TEXT NOT NULL, price_cents INTEGER NOT NULL, currency TEXT NOT NULL,
  offer_revision TEXT NOT NULL, interested INTEGER NOT NULL,
  recorded_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS email_tokens (
  token_hash TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK(purpose IN ('verify','unsubscribe')),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS email_token_lead ON email_tokens(lead_id);
CREATE INDEX IF NOT EXISTS email_token_expiry ON email_tokens(expires_at);

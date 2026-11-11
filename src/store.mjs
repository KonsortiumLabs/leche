import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, createHash, createHmac } from 'node:crypto';

export const CONSENT_VERSION = '2026-11-11-v1';
export const CONSENT_TEXT = 'Email me LÈCHE development and launch updates. I can unsubscribe at any time.';
export const sha = value => createHash('sha256').update(value).digest('hex');
export function openStore(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const keyPath = join(directory, 'rate-limit.key');
  try { writeFileSync(keyPath, randomBytes(32), { flag: 'wx', mode: 0o600 }); } catch (e) { if (e.code !== 'EEXIST') throw e; }
  const secret = readFileSync(keyPath);
  const dbPath = join(directory, 'leche.sqlite');
  const db = new DatabaseSync(dbPath);
  chmodSync(dbPath, 0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      created_at TEXT NOT NULL, consent_at TEXT NOT NULL, consent_version TEXT NOT NULL,
      consent_text TEXT NOT NULL, email_verified INTEGER NOT NULL DEFAULT 0,
      utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, referrer_host TEXT,
      entry_path TEXT NOT NULL, unsubscribed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, lead_id INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS surveys (
      lead_id INTEGER PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
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
    CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS rate_expiry ON rate_limits(expires_at);
  `);
  const metric = (event, path) => db.prepare(`INSERT INTO metrics(day,event,path,count) VALUES(?,?,?,1)
    ON CONFLICT(day,event,path) DO UPDATE SET count=count+1`).run(new Date().toISOString().slice(0, 10), event, path);
  return {
    db,
    metric,
    close: () => db.close(),
    rate(ip, group, max, windowMs = 60000) {
      const now = Date.now();
      const bucket = Math.floor(now / windowMs);
      const key = createHmac('sha256', secret).update(`${ip}|${group}|${bucket}`).digest('hex');
      db.prepare('DELETE FROM rate_limits WHERE expires_at < ?').run(now);
      db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
      const row = db.prepare(`INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?)
        ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count`).get(key, (bucket + 1) * windowMs);
      return row.count <= max;
    },
    session(token) {
      if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
      return db.prepare(`SELECT leads.* FROM sessions JOIN leads ON lead_id=leads.id
        WHERE token_hash=? AND expires_at>? AND unsubscribed_at IS NULL`).get(sha(token), Date.now()) || null;
    },
    signup(email, attribution, existingToken) {
      const now = new Date().toISOString();
      db.exec('BEGIN IMMEDIATE');
      try {
        const result = db.prepare(`INSERT OR IGNORE INTO leads
          (email,created_at,consent_at,consent_version,consent_text,utm_source,utm_medium,utm_campaign,referrer_host,entry_path)
          VALUES(?,?,?,?,?,?,?,?,?,?)`).run(email, now, now, CONSENT_VERSION, CONSENT_TEXT,
          attribution.source, attribution.medium, attribution.campaign, attribution.referrer, attribution.path);
        let token = null;
        if (result.changes) {
          token = randomBytes(32).toString('hex');
          db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(sha(token), result.lastInsertRowid, Date.now() + 86400000 * 30);
          metric('signup', '/early-access');
        } else if (this.session(existingToken)?.email === email) {
          token = existingToken;
        }
        db.exec('COMMIT');
        return { token, created: Boolean(result.changes) };
      } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    survey(leadId, values) {
      db.prepare(`INSERT INTO surveys(lead_id,flavor,price,intent,reservation,updated_at) VALUES(?,?,?,?,?,?)
        ON CONFLICT(lead_id) DO UPDATE SET flavor=excluded.flavor,price=excluded.price,intent=excluded.intent,
        reservation=excluded.reservation,updated_at=excluded.updated_at`).run(leadId, values.flavor,
          values.price, values.intent, values.reservation ? 1 : 0, new Date().toISOString());
    },
    preferences(leadId) { return db.prepare('SELECT flavor,price,intent,reservation FROM surveys WHERE lead_id=?').get(leadId) || null; },
    stats() {
      return {
        leads: db.prepare(`SELECT COUNT(*) total, COALESCE(SUM(unsubscribed_at IS NULL),0) opted_in,
          COALESCE(SUM(email_verified=1 AND unsubscribed_at IS NULL),0) verified_opted_in FROM leads`).get(),
        demand: db.prepare(`SELECT COUNT(*) responses, COALESCE(SUM(reservation),0) reservations,
          COALESCE(SUM(intent='would-buy'),0) would_buy FROM surveys JOIN leads ON leads.id=lead_id WHERE unsubscribed_at IS NULL`).get(),
        flavors: db.prepare(`SELECT flavor,COUNT(*) count FROM surveys JOIN leads ON leads.id=lead_id
          WHERE flavor IS NOT NULL AND unsubscribed_at IS NULL GROUP BY flavor`).all(),
        prices: db.prepare(`SELECT price,COUNT(*) count FROM surveys JOIN leads ON leads.id=lead_id
          WHERE price IS NOT NULL AND unsubscribed_at IS NULL GROUP BY price`).all(),
        metrics: db.prepare('SELECT * FROM metrics ORDER BY day DESC,event,path LIMIT 500').all(),
        note: 'Email addresses are unverified. Reservations are nonbinding. Pageviews are events, not unique people.'
      };
    },
    export() { return db.prepare(`SELECT l.*,s.flavor,s.price,s.intent,s.reservation,s.updated_at AS survey_updated_at
      FROM leads l LEFT JOIN surveys s ON l.id=s.lead_id ORDER BY l.id`).all(); },
    unsubscribe(leadId) {
      db.prepare('UPDATE leads SET unsubscribed_at=? WHERE id=?').run(new Date().toISOString(), leadId);
      db.prepare('DELETE FROM sessions WHERE lead_id=?').run(leadId);
    },
    deleteByEmail(email) { return db.prepare('DELETE FROM leads WHERE email=? COLLATE NOCASE').run(email); }
  };
}
export function toCsv(rows) {
  if (!rows.length) return 'email\r\n';
  const keys = Object.keys(rows[0]);
  const cell = v => {
    let s = String(v ?? '');
    if (/^[=+@\-\t\r\n]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [keys.map(cell).join(','), ...rows.map(row => keys.map(k => cell(row[k])).join(','))].join('\r\n');
}

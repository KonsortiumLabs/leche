import { launchStore } from './launch-store.mjs';
import { CONSENT_VERSION, CONSENT_TEXT } from './shared.mjs';

const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const digest = async value => hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));

// All mutable state lives in D1, never in an isolate's ephemeral filesystem.
export function d1Store(db) {
  if(!db) throw new Error('D1 binding DB is missing.');
  const stmt = (sql,...args) => db.prepare(sql).bind(...args);
  const first = (sql,...args) => stmt(sql,...args).first();
  const all = async (sql,...args) => (await stmt(sql,...args).all()).results;
  let keyPromise;
  const rateKey = () => keyPromise ||= (async()=>{
    let row=await first("SELECT value FROM internal_settings WHERE key='rate-secret'");
    if(!row) {
      await stmt("INSERT OR IGNORE INTO internal_settings(key,value) VALUES('rate-secret',?)",randomToken()).run();
      row=await first("SELECT value FROM internal_settings WHERE key='rate-secret'");
    }
    return crypto.subtle.importKey('raw',new TextEncoder().encode(row.value),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  })();
  const api = {
    ...launchStore(db),
    async health() { await first('SELECT COUNT(*) count FROM leads'); },
    async rate(ip,group,max,windowMs=60000) {
      const now=Date.now(),bucket=Math.floor(now/windowMs);
      const key=hex(await crypto.subtle.sign('HMAC',await rateKey(),new TextEncoder().encode(`${ip}|${group}|${bucket}`)));
      const results=await db.batch([
        stmt('DELETE FROM rate_limits WHERE expires_at < ?',now),
        stmt('DELETE FROM sessions WHERE expires_at < ?',now),
        stmt(`INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?)
          ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count`,key,(bucket+1)*windowMs)
      ]);
      return results[2].results[0].count<=max;
    },
    async session(token) {
      if(!token || !/^[a-f0-9]{64}$/.test(token)) return null;
      return first(`SELECT leads.* FROM sessions JOIN leads ON lead_id=leads.id
        WHERE token_hash=? AND expires_at>? AND unsubscribed_at IS NULL`,await digest(token),Date.now());
    },
    async signup(email,a,existingToken) {
      const id=crypto.randomUUID(),token=randomToken(),now=new Date().toISOString();
      // A random new lead ID gates both the session and metric. An ignored duplicate
      // insert cannot attach either to the existing lead, including concurrent signups.
      const result=await db.batch([
        stmt(`INSERT OR IGNORE INTO leads(id,email,created_at,consent_at,consent_version,consent_text,
          utm_source,utm_medium,utm_campaign,referrer_host,entry_path) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
          id,email,now,now,CONSENT_VERSION,CONSENT_TEXT,a.source,a.medium,a.campaign,a.referrer,a.path),
        stmt('INSERT INTO sessions SELECT ?,id,? FROM leads WHERE id=?',await digest(token),Date.now()+86400000*30,id),
        stmt(`INSERT INTO metrics(day,event,path,count) SELECT ?,'signup','/early-access',1
          WHERE EXISTS(SELECT 1 FROM leads WHERE id=?)
          ON CONFLICT(day,event,path) DO UPDATE SET count=count+1`,now.slice(0,10),id)
      ]);
      if(result[0].meta.changes) return {token,created:true};
      return {token:(await api.session(existingToken))?.email===email?existingToken:null,created:false};
    },
    async survey(leadId,v) {
      // Recheck consent at the write itself to handle a simultaneous unsubscribe.
      const result=await stmt(`INSERT INTO surveys(lead_id,flavor,price,intent,reservation,updated_at)
        SELECT id,?,?,?,?,? FROM leads WHERE id=? AND unsubscribed_at IS NULL
        ON CONFLICT(lead_id) DO UPDATE SET flavor=excluded.flavor,price=excluded.price,
        intent=excluded.intent,reservation=excluded.reservation,updated_at=excluded.updated_at`,
        v.flavor,v.price,v.intent,v.reservation?1:0,new Date().toISOString(),leadId).run();
      return result.meta.changes>0;
    },
    preferences: id => first('SELECT flavor,price,intent,reservation FROM surveys WHERE lead_id=?',id),
    async unsubscribe(id) {
      await db.batch([
        stmt('UPDATE leads SET unsubscribed_at=? WHERE id=?',new Date().toISOString(),id),
        stmt('DELETE FROM sessions WHERE lead_id=?',id)
      ]);
    },
    metric: (event,path) => stmt(`INSERT INTO metrics(day,event,path,count) VALUES(?,?,?,1)
      ON CONFLICT(day,event,path) DO UPDATE SET count=count+1`,new Date().toISOString().slice(0,10),event,path).run(),
    async stats() {
      return {
        leads:await first(`SELECT COUNT(*) total,COALESCE(SUM(unsubscribed_at IS NULL),0) opted_in,
          COALESCE(SUM(email_verified=1 AND unsubscribed_at IS NULL),0) verified_opted_in FROM leads`),
        demand:await first(`SELECT COUNT(*) responses,COALESCE(SUM(reservation),0) reservations,
          COALESCE(SUM(intent='would-buy'),0) would_buy FROM surveys JOIN leads ON leads.id=lead_id WHERE unsubscribed_at IS NULL`),
        flavors:await all(`SELECT flavor,COUNT(*) count FROM surveys JOIN leads ON leads.id=lead_id
          WHERE flavor IS NOT NULL AND unsubscribed_at IS NULL GROUP BY flavor`),
        prices:await all(`SELECT price,COUNT(*) count FROM surveys JOIN leads ON leads.id=lead_id
          WHERE price IS NOT NULL AND unsubscribed_at IS NULL GROUP BY price`),
        metrics:await all("SELECT * FROM metrics WHERE day >= date('now','-29 days') AND day <= date('now') ORDER BY day DESC,event,path"),
        measurement_window:{days:30,timezone:'UTC'},
        note:'Email addresses are unverified. Reservations are nonbinding. Pageviews are events, not unique people.'
      };
    },
    export: () => all(`SELECT l.*,s.flavor,s.price,s.intent,s.reservation,s.updated_at AS survey_updated_at,p.price_cents,p.currency,p.offer_revision,p.interested AS buy_at_price
      FROM leads l LEFT JOIN surveys s ON l.id=s.lead_id LEFT JOIN purchase_interest p ON p.lead_id=l.id ORDER BY l.created_at,l.id`)
  };
  return api;
}

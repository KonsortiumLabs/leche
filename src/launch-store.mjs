import { OFFER } from './offer.mjs';

const hex = bytes => Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const hash = async value => hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));

// Both adapters execute these same queries; D1 batch is atomic.
export function launchStore(db) {
  const q=(sql,...values)=>db.prepare(sql).bind(...values);
  const first=(sql,...values)=>q(sql,...values).first();
  return {
    purchaseInterest:id=>first('SELECT price_cents,currency,offer_revision,interested FROM purchase_interest WHERE lead_id=?',String(id)),
    async savePurchaseInterest(id,interested) {
      id=String(id);
      return q(`INSERT INTO purchase_interest(lead_id,product,price_cents,currency,offer_revision,interested,recorded_at)
        SELECT id,?,?,?,?,?,? FROM leads WHERE id=? AND unsubscribed_at IS NULL
        ON CONFLICT(lead_id) DO UPDATE SET product=excluded.product,price_cents=excluded.price_cents,
        currency=excluded.currency,offer_revision=excluded.offer_revision,interested=excluded.interested,recorded_at=excluded.recorded_at`,
        OFFER.product,OFFER.cents,OFFER.currency,OFFER.revision,interested?1:0,new Date().toISOString(),id).run();
    },
    async launchStats() {
      return {
        offer:OFFER,
        interest:await first(`SELECT COUNT(*) responses,COALESCE(SUM(p.interested),0) interested,
          COALESCE(SUM(p.interested=1 AND l.email_verified=1),0) verified_interested
          FROM purchase_interest p JOIN leads l ON l.id=p.lead_id
          WHERE l.unsubscribed_at IS NULL AND p.offer_revision=?`,OFFER.revision),
        sources:(await q(`SELECT COALESCE(l.utm_source,l.referrer_host,'direct / unknown') source,
          COUNT(*) signups,COALESCE(SUM(l.email_verified),0) verified,
          COALESCE(SUM(p.interested=1 AND p.offer_revision=?),0) price_interested
          FROM leads l LEFT JOIN purchase_interest p ON p.lead_id=l.id WHERE l.unsubscribed_at IS NULL
          GROUP BY source ORDER BY signups DESC LIMIT 30`,OFFER.revision).all()).results
      };
    },
    async emailTokens(id) {
      id=String(id);
      const verify=random(),unsubscribe=random(),now=Date.now();
      await db.batch([
        q('DELETE FROM email_tokens WHERE expires_at < ?',now),
        q('INSERT INTO email_tokens SELECT ?,id,?,? FROM leads WHERE id=? AND unsubscribed_at IS NULL',await hash(verify),'verify',now+86400000,id),
        q('INSERT INTO email_tokens SELECT ?,id,?,? FROM leads WHERE id=? AND unsubscribed_at IS NULL',await hash(unsubscribe),'unsubscribe',8640000000000000,id)
      ]);
      return {verify,unsubscribe};
    },
    async confirmEmail(token) {
      if(!/^[a-f0-9]{64}$/.test(token||''))return false;
      const digest=await hash(token);
      const r=await db.batch([
        q(`UPDATE leads SET email_verified=1 WHERE unsubscribed_at IS NULL AND id IN
          (SELECT lead_id FROM email_tokens WHERE token_hash=? AND purpose='verify' AND expires_at>?) RETURNING id`,digest,Date.now()),
        q("DELETE FROM email_tokens WHERE token_hash=? AND purpose='verify'",digest)
      ]);
      return r[0].results.length>0;
    },
    async unsubscribeEmail(token) {
      if(!/^[a-f0-9]{64}$/.test(token||''))return false;
      const digest=await hash(token),now=Date.now();
      const r=await db.batch([
        q(`UPDATE leads SET unsubscribed_at=COALESCE(unsubscribed_at,?) WHERE id IN
          (SELECT lead_id FROM email_tokens WHERE token_hash=? AND purpose='unsubscribe' AND expires_at>?) RETURNING id`,new Date().toISOString(),digest,now),
        q(`DELETE FROM sessions WHERE lead_id IN (SELECT lead_id FROM email_tokens
          WHERE token_hash=? AND purpose='unsubscribe' AND expires_at>?)`,digest,now)
      ]);
      return r[0].results.length>0;
    }
  };
}

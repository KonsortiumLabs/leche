import { openStore, toCsv } from '../src/store.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
const store=openStore(process.env.DATA_DIR || resolve(fileURLToPath(new URL('..',import.meta.url)),'data'));
const [command,arg]=process.argv.slice(2);
try {
  if(command==='stats') console.log(JSON.stringify(store.stats(),null,2));
  else if(command==='export' && arg) {writeFileSync(resolve(arg),toCsv(store.export()),{mode:0o600,flag:'wx'});console.log('Export saved. Keep it private; addresses are unverified.');}
  else if(command==='delete' && arg && process.argv.includes('--confirm')) {const result=store.deleteByEmail(arg);console.log(`Deleted ${result.changes} record(s) and associated sessions/survey.`);}
  else if(command==='unsubscribe' && arg) {const lead=store.db.prepare('SELECT id FROM leads WHERE email=? COLLATE NOCASE').get(arg);if(lead){store.unsubscribe(lead.id);console.log('Unsubscribed.');}else console.log('No matching record.');}
  else if(command==='backup' && arg) {await import('node:sqlite').then(({backup})=>backup(store.db,resolve(arg)));console.log('Consistent database backup saved. Keep it private.');}
  else {console.error('Usage: npm run stats | node scripts/admin.mjs export NEW_PRIVATE_PATH.csv | backup NEW_PRIVATE_PATH.sqlite | unsubscribe EMAIL | delete EMAIL --confirm');process.exitCode=1;}
} finally {store.close();}

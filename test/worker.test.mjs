import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import worker from '../src/worker.mjs';
import { d1Store } from '../src/d1-store.mjs';

// SQLite-backed implementation of D1's documented binding interface. This verifies
// actual SQL and atomic batches, but is not a substitute for live Cloudflare QA.
function binding(path) {
  const sqlite=new DatabaseSync(path);sqlite.exec('PRAGMA foreign_keys=ON');
  sqlite.exec(readFileSync(new URL('../migrations/0001_early_access.sql',import.meta.url),'utf8'));
  sqlite.exec(readFileSync(new URL('../migrations/0002_launch_validation.sql',import.meta.url),'utf8'));
  const db={sqlite,failSession:false,prepare(sql) {
    const make=args=>({bind(...values){return make(values);},
      result(){
        if(db.failSession&&sql.startsWith('INSERT INTO sessions'))throw new Error('Injected database failure');
        const results=sqlite.prepare(sql).all(...args);
        return {success:true,results,meta:{changes:sqlite.prepare('SELECT changes() n').get().n}};
      },async first(){return this.result().results[0]||null;},async all(){return this.result();},async run(){return this.result();}
    });return make([]);
  },async batch(statements) {
    sqlite.exec('BEGIN IMMEDIATE');
    try{const results=statements.map(s=>s.result());sqlite.exec('COMMIT');return results;}
    catch(e){sqlite.exec('ROLLBACK');throw e;}
  }};
  return db;
}
const origin='https://leche.example';
function request(env,path,{data,headers={},method=data===undefined?'GET':'POST'}={}) {
  return worker.fetch(new Request(origin+path,{method,headers:{'cf-connecting-ip':'192.0.2.10',...(data!==undefined?{'content-type':'application/json',origin}:{}),...headers},...(data!==undefined?{body:typeof data==='string'?data:JSON.stringify(data)}:{})}),env);
}
test('Worker keeps signup ownership, consent, survey and unsubscribe durable',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'leche-worker-')),path=join(dir,'d1.sqlite');let db=binding(path);
  const env={DB:db,ADMIN_TOKEN:'a'.repeat(48)};
  try {
    for(const route of ['/','/first-taste','/world','/early-access','/privacy','/contact'])assert.equal((await request(env,route)).status,200);
    assert.equal((await request(env,'/missing')).status,404);
    assert.equal((await request(env,'/api/health')).status,200);
    assert.equal((await request(env,'/api/signup',{data:{email:'person@example.com',consent:true},headers:{origin:'https://other.example'}})).status,403);
    assert.equal((await request(env,'/api/signup',{data:{email:'person@example.com',consent:false}})).status,400);
    assert.equal((await request(env,'/api/signup',{data:{email:'bad',consent:true}})).status,400);
    assert.equal((await request(env,'/api/signup',{data:{email:'person@example.com',consent:true,company:'bot'}})).status,400);
    const signup={email:' Person@Example.com ',consent:true,attribution:{source:'instagram',referrer:'https://example.com/private?secret=yes',path:'/world'}};
    const response=await request(env,'/api/signup',{data:signup});assert.equal(response.status,200);
    const cookie=response.headers.get('set-cookie').split(';')[0];assert.match(response.headers.get('set-cookie'),/HttpOnly; SameSite=Strict.*Secure/);
    const duplicate=await request(env,'/api/signup',{data:signup});assert.equal(duplicate.status,200);assert.equal(duplicate.headers.get('set-cookie'),null);
    assert.deepEqual(await duplicate.json(),await response.json());
    const survey={flavor:'cherry',price:'20-29',intent:'would-buy',reservation:true};
    assert.equal((await request(env,'/api/survey',{data:survey})).status,401);
    assert.equal((await request(env,'/api/survey',{data:{...survey,flavor:'invalid'},headers:{cookie}})).status,400);
    assert.equal((await request(env,'/api/survey',{data:survey,headers:{cookie}})).status,200);
    assert.equal((await request(env,'/api/survey',{data:survey,headers:{cookie}})).status,200);
    db.sqlite.close();db=binding(path);env.DB=db;
    const session=await (await request(env,'/api/session',{headers:{cookie}})).json();assert.equal(session.editable,true);assert.equal(session.preferences.reservation,1);
    let stats=await d1Store(db).stats();assert.equal(stats.leads.total,1);assert.equal(stats.demand.reservations,1);
    assert.equal(stats.metrics.filter(m=>m.event==='signup')[0].count,1);
    const lead=db.sqlite.prepare('SELECT * FROM leads').get();assert.equal(lead.email,'person@example.com');assert.equal(lead.referrer_host,'example.com');assert.equal(lead.utm_source,'instagram');assert.equal(lead.email_verified,0);assert.ok(lead.consent_text);
    assert.equal((await request(env,'/api/admin/export')).status,401);
    const csv=await request(env,'/api/admin/export',{headers:{authorization:`Bearer ${env.ADMIN_TOKEN}`}});assert.equal(csv.status,200);assert.match(await csv.text(),/person@example.com/);
    assert.equal((await request(env,'/api/unsubscribe',{data:{},headers:{cookie}})).status,200);
    assert.equal((await (await request(env,'/api/session',{headers:{cookie}})).json()).editable,false);
    assert.equal((await request(env,'/api/survey',{data:survey,headers:{cookie}})).status,401);
    stats=await d1Store(db).stats();assert.equal(stats.leads.opted_in,0);assert.equal(stats.demand.reservations,0);
    const again=await request(env,'/api/signup',{data:signup});assert.equal(again.headers.get('set-cookie'),null);
    assert.equal(db.sqlite.prepare('SELECT count(*) n FROM sessions').get().n,0);
    db.sqlite.prepare('DELETE FROM leads WHERE id=?').run(lead.id);assert.equal(db.sqlite.prepare('SELECT count(*) n FROM surveys').get().n,0);
  }finally{db.sqlite.close();rmSync(dir,{recursive:true,force:true});}
});
test('Worker rejects oversized requests, suppresses tracking, and never fakes a database save',async()=>{
  const db=binding(':memory:'),env={DB:db};
  try {
    assert.equal((await request(env,'/api/signup',{data:'x'.repeat(8200)})).status,413);
    assert.equal((await request(env,'/api/signup',{data:'{'})).status,400);
    assert.equal((await request(env,'/api/event',{data:{event:'page_view',path:'/'},headers:{'sec-gpc':'1'}})).status,200);
    assert.equal((await d1Store(db).stats()).metrics.length,0);
    assert.equal((await request(env,'/api/event',{data:{event:'product_view',path:'/world'}})).status,400);
    assert.equal((await request(env,'/api/event',{data:{event:'page_view',path:'/'}})).status,200);
    assert.equal((await d1Store(db).stats()).metrics[0].count,1);
    const missing=await request({},'/api/signup',{data:{email:'fail@example.com',consent:true}});assert.equal(missing.status,503);assert.equal((await missing.json()).ok,undefined);
    assert.equal((await request({},'/')).status,200);
    db.failSession=true;
    assert.equal((await request(env,'/api/signup',{data:{email:'rollback@example.com',consent:true}})).status,503);
    assert.equal(db.sqlite.prepare('SELECT count(*) n FROM leads').get().n,0);
    db.failSession=false;
    for(let i=0;i<8;i++)assert.equal((await request(env,'/api/signup',{data:{email:'limit@example.com',consent:true},headers:{'cf-connecting-ip':'192.0.2.20'}})).status,200);
    assert.equal((await request(env,'/api/signup',{data:{email:'limit@example.com',consent:true},headers:{'cf-connecting-ip':'192.0.2.20'}})).status,429);
    for(const row of db.sqlite.prepare('SELECT key FROM rate_limits').all())assert.match(row.key,/^[a-f0-9]{64}$/);
  }finally{db.sqlite.close();}
});
test('concurrent D1 duplicate signups create exactly one owner and one signup event',async()=>{
  const db=binding(':memory:');
  try {
    const a={source:null,medium:null,campaign:null,referrer:null,path:'/early-access'};
    const results=await Promise.all(Array.from({length:5},()=>d1Store(db).signup('same@example.com',a,null)));
    assert.equal(results.filter(r=>r.created).length,1);assert.equal(results.filter(r=>r.token).length,1);
    assert.equal(db.sqlite.prepare('SELECT count(*) n FROM sessions').get().n,1);
    assert.equal((await d1Store(db).stats()).metrics[0].count,1);
  }finally{db.sqlite.close();}
});

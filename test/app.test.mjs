import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/server.mjs';
import { toCsv } from '../src/store.mjs';
import { Readable } from 'node:stream';

// Exercise the actual HTTP request handler without binding a socket. This also
// runs in restricted build environments. Live HTTP/browser checks are separate.
function request(app, url, options={}) {
  return new Promise((resolve,reject)=>{
    const parsed=new URL(url);
    const req=Readable.from(options.body ? [Buffer.from(options.body)] : []);
    req.method=options.method||'GET';req.url=parsed.pathname+parsed.search;
    req.headers={host:parsed.host,...Object.fromEntries(Object.entries(options.headers||{}).map(([k,v])=>[k.toLowerCase(),v]))};
    req.socket={remoteAddress:'127.0.0.1'};
    const headers=new Headers();
    const res={headersSent:false,status:200,setHeader(k,v){headers.set(k,String(v));},writeHead(s,h={}){this.status=s;this.headersSent=true;for(const [k,v] of Object.entries(h))headers.set(k,String(v));},end(data){const text=Buffer.isBuffer(data)?data.toString():String(data??'');resolve({status:this.status,headers,text:async()=>text,json:async()=>JSON.parse(text)});}};
    Promise.resolve(app.server.listeners('request')[0](req,res)).catch(reject);
  });
}

test('early access: validation, durable storage, ownership, survey, export, privacy and abuse controls',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'leche-test-'));
  const secret='test-admin-token-with-at-least-32-characters';
  let app=createApp({dataDir:dir,adminToken:secret});
  const fetch=(url,options)=>request(app,url,options);
  const start=async()=> 'http://127.0.0.1:3000';
  const stop=async()=>{app.store.close();};
  let origin=await start();
  const post=(path,data,cookie,extra={})=>fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(cookie?{Cookie:cookie}:{}),...extra},body:JSON.stringify(data)});
  try {
    for(const route of ['/','/first-taste','/world','/early-access','/privacy','/contact']) {
      const r=await fetch(origin+route);assert.equal(r.status,200);const html=await r.text();
      assert.match(html,/<h1/);assert.match(html,/original-rounded-wordmark-reference.jpg/);
      assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);
      assert.match(html,/noindex,nofollow/);
    }
    assert.equal((await fetch(origin+'/missing')).status,404);
    assert.equal((await fetch(origin+'/assets/feed/row-2-middle-cherry-01-bottle.jpg')).status,200);
    assert.equal((await fetch(origin+'/data/leche.sqlite')).status,404);
    const input={email:' FIRST@example.com ',consent:true,attribution:{source:'instagram',medium:'social',campaign:'cherry-01',path:'/world',referrer:'https://instagram.com/?private=discard'}};
    assert.equal((await post('/api/signup',input,null,{Origin:'https://evil.example'})).status,403);
    assert.equal((await post('/api/signup',{...input,email:'invalid'})).status,400);
    assert.equal((await post('/api/signup',{...input,consent:false})).status,400);
    assert.equal((await post('/api/signup',{...input,company:'bot'})).status,400);
    const joined=await post('/api/signup',input);assert.equal(joined.status,200);
    const cookie=joined.headers.get('set-cookie').split(';')[0];assert.match(cookie,/leche_session=/);
    const record=app.store.export()[0];assert.equal(record.email,'first@example.com');assert.equal(record.referrer_host,'instagram.com');assert.equal(record.email_verified,0);assert.equal(record.utm_source,'instagram');
    const duplicate=await post('/api/signup',input);assert.equal(duplicate.status,200);assert.equal(duplicate.headers.get('set-cookie'),null);assert.equal(app.store.export().length,1);
    assert.equal((await post('/api/survey',{reservation:true})).status,401);
    assert.equal((await post('/api/survey',{flavor:'fake',reservation:true},cookie)).status,400);
    const poll={flavor:'cherry',price:'20-29',intent:'would-buy',reservation:true};
    assert.equal((await post('/api/survey',poll,cookie)).status,200);
    assert.equal((await post('/api/survey',poll,cookie)).status,200);
    assert.equal(app.store.stats().demand.reservations,1);
    await post('/api/event',{event:'page_view',path:'/world'},null,{DNT:'1'});
    assert.equal(app.store.stats().metrics.filter(r=>r.event==='page_view').length,0);
    assert.equal((await post('/api/event',{event:'signup',path:'/world'})).status,400);
    await post('/api/event',{event:'product_view',path:'/first-taste'});
    assert.equal(app.store.stats().metrics.find(r=>r.event==='product_view').count,1);
    assert.equal((await fetch(origin+'/api/admin/export')).status,401);
    const exported=await fetch(origin+'/api/admin/export',{headers:{Authorization:`Bearer ${secret}`}});
    assert.equal(exported.status,200);assert.match(await exported.text(),/first@example.com/);
    assert.match(toCsv([{email:'=formula@example.com'}]),/"'=formula/);
    await stop();app=createApp({dataDir:dir,adminToken:secret});origin=await start();
    assert.equal(app.store.export().length,1);assert.equal(app.store.stats().demand.reservations,1);
    const session=await fetch(origin+'/api/session',{headers:{Cookie:cookie}});assert.equal((await session.json()).preferences.flavor,'cherry');
    assert.equal((await post('/api/unsubscribe',{},cookie)).status,200);
    assert.equal((await post('/api/survey',poll,cookie)).status,401);assert.equal(app.store.stats().leads.opted_in,0);
    // Duplicate submissions must not silently re-subscribe a withdrawn address.
    await post('/api/signup',input);assert.equal(app.store.stats().leads.opted_in,0);
    let limited=false;for(let i=0;i<10;i++){if((await post('/api/signup',input)).status===429){limited=true;break;}}
    assert.equal(limited,true);
    app.store.deleteByEmail('first@example.com');assert.equal(app.store.export().length,0);
    assert.equal(app.store.db.prepare('SELECT COUNT(*) n FROM surveys').get().n,0);
  } finally {await stop();rmSync(dir,{recursive:true,force:true});}
});

test('production metadata uses the configured origin and secure cookies',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'leche-prod-'));
  const app=createApp({dataDir:dir,siteUrl:'https://brand.example'});
  const base='http://127.0.0.1:3000';
  const fetch=(url,options)=>request(app,url,options);
  try {
    assert.match(await (await fetch(base+'/world')).text(),/rel="canonical" href="https:\/\/brand.example\/world"/);
    assert.match(await (await fetch(base+'/sitemap.xml')).text(),/https:\/\/brand.example\/first-taste/);
    const r=await fetch(base+'/api/signup',{method:'POST',headers:{Origin:'https://brand.example','Content-Type':'application/json'},body:JSON.stringify({email:'person@example.com',consent:true})});
    assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/Secure/);assert.match(r.headers.get('set-cookie'),/HttpOnly/);
  } finally {app.store.close();rmSync(dir,{recursive:true,force:true});}
});

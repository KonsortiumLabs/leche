import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renderPage, routes, utilityRoutes } from '../src/pages.mjs';
import { robots, sitemap, SEARCH_PAGES, SHARE_CARDS } from '../src/seo.mjs';
import { validEvent } from '../src/analytics.mjs';
import { openStore } from '../src/store.mjs';
const origin='https://tasteleche.example';
test('search metadata, schemas and social artwork agree on canonical origin and real page content',()=>{
  const titles=new Set(),cards=new Set();
  for(const path of routes){
    const html=renderPage(path,origin);const title=html.match(/<title>(.*?)<\/title>/)[1];assert.ok(!titles.has(title));titles.add(title);
    assert.match(html,new RegExp(`rel="canonical" href="${origin}${path==='/'?'':path}"`));
    const image=html.match(/property="og:image" content="([^"]+)"/)[1];
    assert.ok(image.startsWith(origin+'/assets/social/'));assert.ok(existsSync(new URL('../public'+image.slice(origin.length),import.meta.url)));
    if(SHARE_CARDS[path])cards.add(image);
    assert.match(html,/name="twitter:image"/);assert.match(html,/property="og:image:alt"/);assert.match(html,/content="1200"/);assert.match(html,/content="630"/);
    if(SEARCH_PAGES.includes(path)){
      assert.match(html,/index,follow,max-image-preview:large/);
      const data=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
      assert.ok(data['@graph'].some(n=>n.url===origin+(path==='/'?'':path)));
      assert.doesNotMatch(JSON.stringify(data),/"offers"|"aggregateRating"|"price"|"availability"/);
    }else assert.match(html,/noindex,follow/);
  }
  assert.equal(cards.size,4);
  for(const path of [...utilityRoutes,'/missing']){
    const html=renderPage(path,origin);assert.match(html,/noindex,nofollow/);assert.doesNotMatch(html,/rel="canonical"|application\/ld\+json/);
  }
  assert.match(renderPage('/',''),/noindex,nofollow/);
  const map=sitemap(origin);for(const path of SEARCH_PAGES)assert.ok(map.includes(`<loc>${origin}${path==='/'?'':path}</loc>`));
  assert.doesNotMatch(map,/\/privacy|\/studio|confirm-email|\/leave/);
  assert.match(robots(origin),/Disallow: \/api\//);assert.doesNotMatch(robots(origin),/Disallow: \/studio/);
});
test('reporting covers a full 30-day window without silent 500-row truncation',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'leche-report-'));const store=openStore(dir);
 try{
  const insert=store.db.prepare('INSERT INTO metrics VALUES(?,?,?,?)');
  for(let i=0;i<30;i++)for(let e=0;e<4;e++)for(let p=0;p<6;p++)insert.run(new Date(Date.now()-i*86400000).toISOString().slice(0,10),'event'+e,'/page'+p,1);
  insert.run('2000-01-01','page_view','/',9999);
  assert.equal(store.stats().metrics.length,720);assert.equal(store.stats().measurement_window.days,30);
  const a={source:'instagram',medium:'social',campaign:'launch',referrer:null,path:'/first-taste'};
  const signed=store.signup('qa@example.test',a,null),lead=store.session(signed.token);await store.savePurchaseInterest(lead.id,true);
  let report=await store.launchStats();assert.equal(report.campaigns[0].campaign,'launch');assert.equal(report.campaigns[0].price_interested,1);
  store.unsubscribe(lead.id);report=await store.launchStats();assert.equal(report.campaigns.length,0);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('only bounded, relevant event names can be submitted',()=>{
 assert.equal(validEvent('signup','/early-access'),false);assert.equal(validEvent('purchase','/first-taste'),false);
 assert.equal(validEvent('gallery_engaged','/'),false);assert.equal(validEvent('gallery_engaged','/first-taste'),true);
 assert.equal(validEvent('signup_start','/world'),false);assert.equal(validEvent('signup_start','/early-access'),true);
 assert.equal(validEvent('user@example.com','/'),false);
});

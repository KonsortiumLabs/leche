import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { renderPage, routes } from '../src/pages.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
test('all rendered routes have unique IDs, available local images, alt text, and valid internal links',()=>{
  for(const route of routes) {
    const html=renderPage(route,'');
    const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(new Set(ids).size,ids.length,`Duplicate IDs in ${route}`);
    assert.equal([...html.matchAll(/<h1\b/g)].length,route==='/early-access'?3:1);
    for(const tag of html.matchAll(/<img\b[^>]+>/g)) {
      assert.match(tag[0],/\balt="[^"]+"/);
      const path=tag[0].match(/src="([^"]+)"/)[1];
      assert.ok(existsSync(resolve(root,'public','.'+path)),path);
    }
    for(const match of html.matchAll(/href="(\/[^"?#]*)/g)) {
      const href=match[1];
      assert.ok(routes.includes(href)||existsSync(resolve(root,'public','.'+href)),`Missing ${href}`);
    }
    for(const match of html.matchAll(/\b(?:for|aria-controls)="([^"]+)"/g)) assert.ok(ids.includes(match[1]),`Missing target ${match[1]}`);
    assert.doesNotMatch(html,/campaign imagery is digitally created|[↗↓→←⤢]/);
    assert.doesNotMatch(html,/safe to eat|certified vegan|sold out|add to cart|shipping soon/i);
  }
  const signup=renderPage('/early-access','');
  assert.equal([...signup.matchAll(/<option\b/g)].length,[...signup.matchAll(/<\/option>/g)].length);
  assert.match(readFileSync(resolve(root,'public/styles.css'),'utf8'),/prefers-reduced-motion/);
});

 test('brand copy keeps allure understated and product claims qualified',()=>{
  for (const route of routes) {
    const html=renderPage(route,'https://tasteleche.com');
    assert.doesNotMatch(html,/kissing|intimacy|intimate|for your(?:<br>)?\s*(?:<em>)?own pleasure/i);
  }
  const product=renderPage('/first-taste','');
  assert.match(product,/cherry-flavored nail lacquer/);
  assert.match(product,/Edibility has not been validated/);
  assert.match(product,/a little more than meets the eye 🍒/);
 });

test('requested supporting phrases start their own responsive lines and logo uses cherry ink',()=>{
 const product=renderPage('/first-taste','');
 for(const phrase of ['Color, gloss, and a little something extra.','and naturally derived ingredients as our starting point.','We’ll share final ingredients and supported uses before launch.']) assert.ok(product.includes('<span class="copy-line">'+phrase+'</span>'));
 assert.ok(renderPage('/world','').includes('<span class="copy-line">Flavored lip gloss and body glazes are next on our mind.</span>'));
 assert.ok(product.includes('0.294118  0 0 0 0 0.050980  0 0 0 0 0.105882'));
 assert.ok(product.includes('id="brand-light"'));
});


test("approved nail replacement is used without retired image or stale srcset", () => {
  for (const route of routes) {
    const html = renderPage(route);
    assert.ok(!html.includes("row-1-right-nail-application"), route);
  }
});

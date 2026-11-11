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
    assert.match(html,/digitally created/);
    assert.doesNotMatch(html,/safe to eat|certified vegan|sold out|add to cart|shipping soon/i);
  }
  const signup=renderPage('/early-access','');
  assert.equal([...signup.matchAll(/<option\b/g)].length,[...signup.matchAll(/<\/option>/g)].length);
  assert.match(readFileSync(resolve(root,'public/styles.css'),'utf8'),/prefers-reduced-motion/);
});

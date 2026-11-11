import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../src/store.mjs';
import {emailConfigured,sendWelcome} from '../src/email.mjs';
import {OFFER} from '../src/offer.mjs';
test('price interest is distinct, durable, and excluded after unsubscribe; email tokens are purpose-bound and single-use',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'leche-launch-'));let store=openStore(dir);
 try{
 const a={source:'instagram',medium:null,campaign:null,referrer:null,path:'/first-taste'};
 const signup=store.signup('launch@example.com',a,null),lead=store.session(signup.token);
 await store.savePurchaseInterest(lead.id,true);await store.savePurchaseInterest(lead.id,true);
 assert.equal((await store.launchStats()).interest.interested,1);
 assert.equal((await store.purchaseInterest(lead.id)).price_cents,OFFER.cents);
 assert.equal(emailConfigured({}),false);
 assert.deepEqual(await sendWelcome({store,lead,env:{},siteUrl:'https://example.com',transport:()=>{throw Error('should not send');}}),{status:'disabled'});
 const tokens=await store.emailTokens(lead.id);
 assert.equal(await store.confirmEmail(tokens.unsubscribe),false);
 assert.equal(await store.confirmEmail(tokens.verify),true);
 assert.equal(await store.confirmEmail(tokens.verify),false);
 assert.equal((await store.launchStats()).interest.verified_interested,1);
 assert.ok(!JSON.stringify(store.export()).includes(tokens.unsubscribe));
 store.close();store=openStore(dir);
 assert.equal((await store.launchStats()).interest.interested,1);
 assert.equal(await store.unsubscribeEmail(tokens.unsubscribe),true);
 assert.equal(store.session(signup.token),null);
 assert.equal((await store.launchStats()).interest.interested,0);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});

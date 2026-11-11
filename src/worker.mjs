import { validEvent, isBot } from './analytics.mjs';
import { robots, sitemap, PUBLIC_ORIGIN } from './seo.mjs';
import { OFFER, PRICE_EVENTS } from './offer.mjs';
import { emailConfigured, sendWelcome } from './email.mjs';
import { renderPage, routes, utilityRoutes } from './pages.mjs';
import { d1Store, digest } from './d1-store.mjs';
import { toCsv } from './shared.mjs';

const allowedPaths=new Set([...routes,'/404']);
const valid={flavor:['cherry','vanilla','peach','undecided'],price:['under-20','20-29','30-39','40-plus','unsure'],intent:['would-buy','curious','not-for-me']};
const cleanTag=v=>typeof v==='string'&&/^[a-zA-Z0-9 _.-]{1,80}$/.test(v)?v:null;
const token=req=>(req.headers.get('cookie')||'').match(/(?:^|;\s*)leche_session=([a-f0-9]{64})(?:;|$)/)?.[1]||null;
const fail=(status,message)=>Object.assign(new Error(message),{status});
function attribution(a) {
  a=a&&typeof a==='object'?a:{};let referrer=null;
  try {const u=new URL(a.referrer);if(['https:','http:'].includes(u.protocol))referrer=u.hostname.slice(0,253);}catch{}
  return {source:cleanTag(a.source),medium:cleanTag(a.medium),campaign:cleanTag(a.campaign),referrer,path:allowedPaths.has(a.path)?a.path:'/early-access'};
}
async function body(req) {
  if(!req.headers.get('content-type')?.startsWith('application/json'))throw fail(415,'Please submit the form as JSON.');
  if(Number(req.headers.get('content-length'))>8192)throw fail(413,'That request is too large.');
  const reader=req.body?.getReader();if(!reader)throw fail(400,'Invalid form.');
  let size=0;const chunks=[];
  try {
    while(true) {const {done,value}=await reader.read();if(done)break;size+=value.length;
      if(size>8192){await reader.cancel();throw fail(413,'That request is too large.');}chunks.push(value);}
  } finally {reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{throw fail(400,'Please check your details and try again.');}
  if(!data||typeof data!=='object'||Array.isArray(data))throw fail(400,'Invalid form.');
  return data;
}
async function authorized(header,secret) {
  if(typeof secret!=='string'||secret.length<32||typeof header!=='string'||header.length>1024)return false;
  const a=await digest(header),b=await digest(`Bearer ${secret}`);let difference=0;
  for(let i=0;i<a.length;i++)difference|=a.charCodeAt(i)^b.charCodeAt(i);
  return difference===0;
}
export default {
  async fetch(req,env) {
    const headers=new Headers({
      'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',
      'Referrer-Policy':'strict-origin-when-cross-origin',
      'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()',
      'Content-Security-Policy':"default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self'; img-src 'self'; connect-src 'self' https://cloudflareinsights.com; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'",
      'Cache-Control':'no-store'
    });
    const send=(status,data,type='application/json; charset=utf-8')=>{
      headers.set('Content-Type',type);
      return new Response(req.method==='HEAD'?null:typeof data==='string'?data:JSON.stringify(data),{status,headers});
    };
    try {
      const url=new URL(req.url),path=url.pathname;
      const siteUrl=env.SITE_URL||PUBLIC_ORIGIN;
      if(new URL(siteUrl).origin!==siteUrl||!/^https?:\/\//.test(siteUrl))throw new Error('Invalid SITE_URL');
      const publicOrigin=url.origin===siteUrl;
      const secure=url.protocol==='https:';
      if(secure)headers.set('Strict-Transport-Security','max-age=31536000');
      const setCookie=value=>headers.set('Set-Cookie',`leche_session=${value||''}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${value?2592000:0}${secure?'; Secure':''}`);
      if(path.startsWith('/api/')) {
        headers.set('X-Robots-Tag','noindex, nofollow');
        // The platform supplies CF-Connecting-IP; never trust client-forwarded IPs.
        const ip=req.headers.get('cf-connecting-ip')||'unknown';
        if(req.method==='POST' && (req.headers.get('origin')!==(env.SITE_URL||url.origin)||req.headers.get('sec-fetch-site')==='cross-site'))
          return send(403,{error:'Please submit from the LÈCHE website.'});
        if(path==='/api/event'&&req.method==='POST'&&(req.headers.get('dnt')==='1'||req.headers.get('sec-gpc')==='1'||isBot(req.headers.get('user-agent'))))return send(200,{ok:true});
        const store=d1Store(env.DB);
        if(req.method==='POST'&&!await store.rate(ip,'all-post',100))return send(429,{error:'A little pause. Please try again in a minute.'});
        if(path==='/api/health'&&req.method==='GET'){await store.health();return send(200,{status:'ok'});}
        if(path==='/api/session'&&req.method==='GET') {
          const lead=await store.session(token(req));return send(200,{editable:Boolean(lead),preferences:lead?await store.preferences(lead.id):null,purchaseInterest:lead?await store.purchaseInterest(lead.id):null,emailVerified:Boolean(lead?.email_verified),emailEnabled:emailConfigured(env)});
        }
        if(path==='/api/signup'&&req.method==='POST') {
          if(!await store.rate(ip,'signup',8,600000)){headers.set('Retry-After','600');return send(429,{error:'A little pause. Please try again in ten minutes.'});}
          const input=await body(req),email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
          if(email.length>254||email.length<6||!/^[^\s@\x00-\x1f]+@[^\s@\x00-\x1f]+\.[^\s@\x00-\x1f]+$/.test(email))return send(400,{error:'Please enter a valid email address.',field:'email'});
          if(input.consent!==true)return send(400,{error:'Please tick the email consent box to join.',field:'consent'});
          if(input.company)return send(400,{error:'We couldn’t accept that submission. Please try again.'});
          if(input.purchaseIntent!==undefined&&typeof input.purchaseIntent!=='boolean')return send(400,{error:'Invalid product interest.'});
          const result=await store.signup(email,attribution(req.headers.get('dnt')==='1'||req.headers.get('sec-gpc')==='1'?{}:input.attribution),token(req));
          if(result.token||token(req))setCookie(result.token);
          const owned=result.token?await store.session(result.token):null;
          if(owned&&input.purchaseIntent===true)await store.savePurchaseInterest(owned.id,true);
          return send(200,{ok:true,message:'Thank you. Your request has been received.'});
        }
        if(path==='/api/interest' && req.method==='POST') {
          const lead=await store.session(token(req));
          if(!lead)return send(401,{error:'Join the list in this browser first.'});
          const input=await body(req);
          if(typeof input.interested!=='boolean')return send(400,{error:'Please choose your interest.'});
          await store.savePurchaseInterest(lead.id,input.interested);
          return send(200,{ok:true,message:input.interested?`Your interest at ${OFFER.display} is saved.`:'Your preference is updated.'});
        }
        if(path==='/api/email/request' && req.method==='POST') {
          const lead=await store.session(token(req));
          if(!lead)return send(401,{error:'Join the list in this browser first.'});
          if(!await store.rate(String(lead.id),'email',2,3600000))return send(429,{error:'Please wait an hour before requesting another email.'});
          return send(200,await sendWelcome({store,lead,env:env,siteUrl:siteUrl||url.origin}));
        }
        if(['/api/email/confirm','/api/email/unsubscribe'].includes(path) && req.method==='POST') {
          if(!await store.rate(ip,'email-token',12,600000))return send(429,{error:'Please try again later.'});
          const input=await body(req);
          const ok=path.endsWith('/confirm')?await store.confirmEmail(input.token):await store.unsubscribeEmail(input.token);
          return send(ok?200:400,ok?{ok:true}:{error:'This link is invalid or has expired. Request a new email from the browser where you joined, or contact @tasteleche.'});
        }
        if(path==='/api/survey'&&req.method==='POST') {
          const lead=await store.session(token(req));
          if(!lead)return send(401,{error:'Please join the list in this browser before saving preferences.'});
          if(!await store.rate(ip,'survey',15,600000))return send(429,{error:'Please try again in ten minutes.'});
          const input=await body(req),values={};
          for(const field of Object.keys(valid)) {
            if(input[field]!=null&&input[field]!==''&&!valid[field].includes(input[field]))return send(400,{error:'Please select one of the available options.'});
            values[field]=input[field]||null;
          }
          if(typeof input.reservation!=='boolean')return send(400,{error:'Please check your reservation choice.'});
          values.reservation=input.reservation;
          if(!await store.survey(lead.id,values))return send(401,{error:'This signup is no longer active.'});
          return send(200,{ok:true,message:values.reservation?'Preferences saved. Your nonbinding interest in CHERRY 01 is recorded.':'Preferences saved. Thank you for helping shape LÈCHE.'});
        }
        if(path==='/api/unsubscribe'&&req.method==='POST') {
          const lead=await store.session(token(req));
          if(!lead)return send(401,{error:'No active signup was found in this browser. Contact @tasteleche for help with another signup.'});
          await store.unsubscribe(lead.id);setCookie(null);
          return send(200,{ok:true,message:'You’re unsubscribed. Your email will no longer be included in updates.'});
        }
        if(path==='/api/event'&&req.method==='POST') {
          if(!await store.rate(ip,'events',40))return send(429,{error:'Please slow down.'});
          const input=await body(req);
          if(!validEvent(input.event,input.path)||!allowedPaths.has(input.path))return send(400,{error:'Invalid event.'});
          if(input.event==='product_view'&&input.path!=='/first-taste')return send(400,{error:'Invalid product event.'});
          await store.metric(input.event,input.path);return send(200,{ok:true});
        }
        if(['/api/admin/stats','/api/admin/export'].includes(path)&&req.method==='GET') {
          if(!await store.rate(ip,'admin',10))return send(429,{error:'Please try again later.'});
          if(!await authorized(req.headers.get('authorization'),env.ADMIN_TOKEN))return send(401,{error:'Unauthorized.'});
          if(path.endsWith('/stats'))return send(200,{...await store.stats(),...await store.launchStats(),email_enabled:emailConfigured(env)});
          headers.set('Content-Disposition','attachment; filename="leche-early-access.csv"');
          return send(200,toCsv((await store.export()).filter(row=>url.searchParams.get('active')!=='1'||!row.unsubscribed_at)),'text/csv; charset=utf-8');
        }
        return send(404,{error:'Endpoint not found.'});
      }
      if(!['GET','HEAD'].includes(req.method)){headers.set('Allow','GET, HEAD');return send(405,'Method not allowed.','text/plain');}
      if(path==='/robots.txt')return send(200,robots(publicOrigin?siteUrl:''),'text/plain');
      if(path==='/sitemap.xml')return send(200,siteUrl?sitemap(siteUrl):'<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>','application/xml');
      if(path.length>1&&path.endsWith('/')){headers.set('Location',path.slice(0,-1)+url.search);return new Response(null,{status:308,headers});}
      // Existing static files are served by Cloudflare's asset layer before this handler.
      return send(routes.includes(path)||utilityRoutes.includes(path)?200:404,renderPage(path,publicOrigin?siteUrl:''),'text/html; charset=utf-8');
    } catch(e) {
      // Log no request body, email, cookie, authorization header, or raw database error.
      if(!e.status)console.error('LÈCHE request failed; check D1 binding, migration and quota.');
      return send(e.status||503,{error:e.status?e.message:'We couldn’t save that right now. Please try again later.'});
    }
  }
};

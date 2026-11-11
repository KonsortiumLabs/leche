import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { openStore, toCsv } from './store.mjs';
import { renderPage, routes } from './pages.mjs';

const project = resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicDir = resolve(project, 'public');
const MIME = {'.svg':'image/svg+xml','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon'};
const allowedPaths = new Set([...routes, '/404']);
const valid = {
  flavor: ['cherry','vanilla','peach','undecided'],
  price: ['under-20','20-29','30-39','40-plus','unsure'],
  intent: ['would-buy','curious','not-for-me']
};
const cleanTag = value => typeof value==='string' && /^[a-zA-Z0-9 _.-]{1,80}$/.test(value) ? value : null;
function attribution(input) {
  const a = input && typeof input==='object' ? input : {};
  let referrer=null;
  try { const u=new URL(a.referrer); if (['http:','https:'].includes(u.protocol)) referrer=u.hostname.slice(0,253); } catch {}
  return { source:cleanTag(a.source),medium:cleanTag(a.medium),campaign:cleanTag(a.campaign),referrer,
    path:allowedPaths.has(a.path) ? a.path : '/early-access' };
}
function cookie(req) { return (req.headers.cookie || '').match(/(?:^|;\s*)leche_session=([a-f0-9]{64})(?:;|$)/)?.[1] || null; }
function secureEqual(a,b) { if(typeof a!=='string'||typeof b!=='string')return false;const left=Buffer.from(a),right=Buffer.from(b);return left.length===right.length&&timingSafeEqual(left,right); }
async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw Object.assign(new Error('Please submit the form as JSON.'),{status:415});
  let size=0; const chunks=[];
  for await (const chunk of req) {
    size+=chunk.length;
    if(size>8192) throw Object.assign(new Error('That request is too large.'),{status:413});
    chunks.push(chunk);
  }
  let parsed;
  try { parsed=JSON.parse(Buffer.concat(chunks).toString()); } catch { throw Object.assign(new Error('Please check your details and try again.'),{status:400}); }
  if (!parsed || typeof parsed!=='object' || Array.isArray(parsed)) throw Object.assign(new Error('Invalid form.'),{status:400});
  return parsed;
}
export function createApp(options={}) {
  const siteUrl = (options.siteUrl ?? process.env.SITE_URL ?? process.env.RENDER_EXTERNAL_URL ?? '').replace(/\/$/,'');
  if(siteUrl) { const u=new URL(siteUrl); if(u.origin!==siteUrl || !['http:','https:'].includes(u.protocol)) throw new Error('SITE_URL must be an HTTP(S) origin, with no path.'); }
  if(process.env.NODE_ENV==='production' && !siteUrl.startsWith('https://')) throw new Error('Production requires SITE_URL with HTTPS.');
  const store = openStore(options.dataDir || process.env.DATA_DIR || resolve(project,'data'));
  const adminToken = options.adminToken ?? process.env.ADMIN_TOKEN;
  const trustProxy = options.trustProxy ?? process.env.TRUST_PROXY==='true';
  const productionSecure = siteUrl.startsWith('https://');
  const server = createServer(async (req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; font-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'");
    if(productionSecure) res.setHeader('Strict-Transport-Security','max-age=31536000');
    const send=(status,data,type='application/json; charset=utf-8')=>{
      res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'});
      res.end(req.method==='HEAD'?undefined:typeof data==='string'?data:JSON.stringify(data));
    };
    try {
      const host=req.headers.host;
      if (!host || !/^[a-zA-Z0-9.:[\]-]+$/.test(host)) return send(400,{error:'Invalid host.'});
      const url=new URL(req.url,`http://${host}`); const path=url.pathname;
      const ip=trustProxy ? (req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress) : req.socket.remoteAddress;
      if(path.startsWith('/api/')) {
        if(req.method==='POST') {
          const expected=siteUrl || `http://${host}`;
          if(req.headers.origin!==expected || req.headers['sec-fetch-site']==='cross-site') return send(403,{error:'Please submit from the LÈCHE website.'});
          if(!store.rate(ip,'all-post',100,60000)) return send(429,{error:'A little pause. Please try again in a minute.'});
        }
        if(path==='/api/health' && req.method==='GET') {
          store.db.prepare('SELECT 1').get(); return send(200,{status:'ok'});
        }
        if(path==='/api/session' && req.method==='GET') {
          const lead=store.session(cookie(req));
          return send(200,{editable:Boolean(lead),preferences:lead?store.preferences(lead.id):null});
        }
        if(path==='/api/signup' && req.method==='POST') {
          if(!store.rate(ip,'signup',8,600000)) {res.setHeader('Retry-After','600');return send(429,{error:'A little pause. Please try again in ten minutes.'});}
          const input=await body(req);
          const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
          if(email.length>254 || email.length<6 || !/^[^\s@\x00-\x1f]+@[^\s@\x00-\x1f]+\.[^\s@\x00-\x1f]+$/.test(email)) return send(400,{error:'Please enter a valid email address.',field:'email'});
          if(input.consent!==true) return send(400,{error:'Please tick the email consent box to join.',field:'consent'});
          if(input.company) return send(400,{error:'We couldn’t accept that submission. Please try again.'});
          const result=store.signup(email,attribution(input.attribution),cookie(req));
          if(result.token) res.setHeader('Set-Cookie',`leche_session=${result.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${productionSecure?'; Secure':''}`);
          else if(cookie(req)) res.setHeader('Set-Cookie',`leche_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${productionSecure?'; Secure':''}`);
          // Identical response for new and existing email records. Ownership is checked separately using the cookie.
          return send(200,{ok:true,message:'Thank you. Your request has been received.'});
        }
        if(path==='/api/survey' && req.method==='POST') {
          const lead=store.session(cookie(req));
          if(!lead) return send(401,{error:'Please join the list in this browser before saving preferences.'});
          if(!store.rate(ip,'survey',15,600000)) return send(429,{error:'Please try again in ten minutes.'});
          const input=await body(req); const values={};
          for(const field of Object.keys(valid)) {
            if(input[field]!==null && input[field]!=='' && input[field]!==undefined && !valid[field].includes(input[field])) return send(400,{error:'Please select one of the available options.'});
            values[field]=input[field]||null;
          }
          if(typeof input.reservation!=='boolean') return send(400,{error:'Please check your reservation choice.'});
          values.reservation=input.reservation;
          store.survey(lead.id,values);
          return send(200,{ok:true,message:values.reservation?'Preferences saved. Your nonbinding interest in CHERRY 01 is recorded.':'Preferences saved. Thank you for helping shape LÈCHE.'});
        }
        if(path==='/api/unsubscribe' && req.method==='POST') {
          const lead=store.session(cookie(req));
          if(!lead) return send(401,{error:'No active signup was found in this browser. Contact @tasteleche for help with another signup.'});
          store.unsubscribe(lead.id);
          res.setHeader('Set-Cookie',`leche_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${productionSecure?'; Secure':''}`);
          return send(200,{ok:true,message:'You’re unsubscribed. Your email will no longer be included in updates.'});
        }
        if(path==='/api/event' && req.method==='POST') {
          if(req.headers.dnt==='1' || req.headers['sec-gpc']==='1') return send(200,{ok:true});
          if(!store.rate(ip,'events',40,60000)) return send(429,{error:'Please slow down.'});
          const input=await body(req);
          if(!['page_view','product_view','share'].includes(input.event) || !allowedPaths.has(input.path)) return send(400,{error:'Invalid event.'});
          if(input.event==='product_view' && input.path!=='/first-taste') return send(400,{error:'Invalid product event.'});
          store.metric(input.event,input.path); return send(200,{ok:true});
        }
        if(['/api/admin/stats','/api/admin/export'].includes(path) && req.method==='GET') {
          if(!store.rate(ip,'admin',10,60000)) return send(429,{error:'Please try again later.'});
          if(!adminToken || adminToken.length<32 || !secureEqual(req.headers.authorization,`Bearer ${adminToken}`)) return send(401,{error:'Unauthorized.'});
          if(path.endsWith('/stats')) return send(200,store.stats());
          res.setHeader('Content-Disposition','attachment; filename="leche-early-access.csv"');
          return send(200,toCsv(store.export()),'text/csv; charset=utf-8');
        }
        return send(404,{error:'Endpoint not found.'});
      }
      if(!['GET','HEAD'].includes(req.method)) {res.setHeader('Allow','GET, HEAD');return send(405,'Method not allowed.','text/plain');}
      if(path==='/robots.txt') return send(200,siteUrl?`User-agent: *\nDisallow: /api/\nSitemap: ${siteUrl}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n','text/plain');
      if(path==='/sitemap.xml') return send(200,`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${siteUrl?routes.map(p=>`<url><loc>${siteUrl}${p==='/'?'':p}</loc></url>`).join(''):''}</urlset>`,'application/xml');
      if(path.startsWith('/assets/') || ['/styles.css','/app.js'].includes(path)) {
        let decoded; try { decoded=decodeURIComponent(path); } catch { return send(400,'Bad path','text/plain'); }
        const file=resolve(publicDir,'.'+decoded);
        if(!file.startsWith(publicDir+sep) || !MIME[extname(file)]) return send(404,'Not found','text/plain');
        try {
          const info=await stat(file); if(!info.isFile()) throw new Error('Not file');
          const etag=`"${info.size}-${Math.trunc(info.mtimeMs)}"`;
          res.setHeader('ETag',etag); res.setHeader('Cache-Control','public, max-age=3600');
          if(req.headers['if-none-match']===etag) {res.writeHead(304);return res.end();}
          res.writeHead(200,{'Content-Type':MIME[extname(file)],'Content-Length':info.size});
          return res.end(req.method==='HEAD'?undefined:await readFile(file));
        } catch { return send(404,'Not found','text/plain'); }
      }
      if(path.length>1 && path.endsWith('/')) {res.writeHead(308,{Location:path.slice(0,-1)+url.search});return res.end();}
      return send(routes.includes(path)?200:404,renderPage(path,siteUrl),'text/html; charset=utf-8');
    } catch(e) {
      if(!res.headersSent) send(e.status||500,{error:e.status?e.message:'We couldn’t save that right now. Please try again.'});
      else res.end();
      if(!e.status) console.error('Request failed:',e.code || e.name); // Never log email, cookies or request bodies.
    }
  });
  server.requestTimeout=15000; server.headersTimeout=10000;
  return {server,store};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const {server,store}=createApp();
  const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
  server.listen(port,host,()=>console.log(`LÈCHE is running at http://${host}:${port}`));
  const stop=()=>server.close(()=>{store.close();process.exit(0);});
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
}

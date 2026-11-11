// Search and social metadata share one source of truth. No unverified commerce schema.
export const PUBLIC_ORIGIN = 'https://tasteleche.com';
export const SEARCH_PAGES = ['/', '/first-taste', '/world', '/early-access', '/contact'];
const SHARE_IMAGE = {
  path: '/assets/feed/row-2-middle-cherry-01-bottle.jpg?v=product-only-20261111',
  alt: 'CHERRY 01 nail lacquer bottle beside cherries',
  width: 1080,
  height: 1080
};
const SOCIAL_COPY = {
  '/': ['LÈCHE. Beauty with taste.', 'Not scented. Flavored. Cherry-flavored nail lacquer is coming. A little more than meets the eye 🍒'],
  '/first-taste': ['CHERRY 01. Your first taste of LÈCHE.', 'A classic red. With a twist. CHERRY 01, our first cherry-flavored nail lacquer, is coming.'],
  '/world': ['A little more than meets the eye 🍒', 'Flavored beauty with a playful streak. Familiar rituals. Unexpected details. Welcome to LÈCHE.'],
  '/early-access': ['Be there for the first taste.', 'CHERRY 01 is coming. Join LÈCHE for first looks and news of the first release.']
};
const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function seoHead(path, origin, title, description) {
  const indexable = Boolean(origin) && SEARCH_PAGES.includes(path);
  const canonical = origin && (SEARCH_PAGES.includes(path)||path==='/privacy') ? `${origin}${path==='/'?'':path}` : null;
  const { path: imagePath, alt, width, height } = SHARE_IMAGE;
  const [socialTitle,socialDescription]=SOCIAL_COPY[path]||[title,description];
  const image=`${origin||''}${imagePath}`;
  const tag=(property,content,name=false)=>`<meta ${name?'name':'property'}="${property}" content="${escape(content)}">`;
  let head=`<title>${escape(title)}</title>${tag('description',description,true)}${tag('robots',indexable?'index,follow,max-image-preview:large':origin&&path==='/privacy'?'noindex,follow':'noindex,nofollow',true)}`;
  if(canonical)head+=`<link rel="canonical" href="${escape(canonical)}">${tag('og:url',canonical)}`;
  head+=tag('og:type','website')+tag('og:site_name','LÈCHE')+tag('og:locale','en_US')+tag('og:title',socialTitle)+tag('og:description',socialDescription)+tag('og:image',image)+tag('og:image:type','image/jpeg')+tag('og:image:width',width)+tag('og:image:height',height)+tag('og:image:alt',alt);
  head+=tag('twitter:card','summary_large_image',true)+tag('twitter:title',socialTitle,true)+tag('twitter:description',socialDescription,true)+tag('twitter:image',image,true)+tag('twitter:image:alt',alt,true);
  if(!indexable)return head;
  const org=origin+'/#organization',site=origin+'/#website';
  const graph=[];
  if(path==='/')graph.push({'@type':'Organization','@id':org,name:'LÈCHE',alternateName:'Taste Leche',url:origin+'/',logo:{'@type':'ImageObject',url:origin+'/assets/brand/original-rounded-wordmark-reference.jpg',width:677,height:427},sameAs:['https://www.instagram.com/tasteleche/'],description:'LÈCHE is a flavored beauty brand. Its first release, CHERRY 01 cherry-flavored nail lacquer, is coming soon.'},{'@type':'WebSite','@id':site,url:origin+'/',name:'LÈCHE',alternateName:['Taste Leche','Leche'],publisher:{'@id':org},inLanguage:'en-US'});
  graph.push({'@type':path==='/world'?'AboutPage':path==='/contact'?'ContactPage':'WebPage','@id':canonical+'#webpage',url:canonical,name:title,description,inLanguage:'en-US',isPartOf:{'@id':site},about:{'@id':org},primaryImageOfPage:{'@type':'ImageObject',url:image,width,height}});
  if(path!=='/')graph.push({'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'LÈCHE',item:origin+'/'},{'@type':'ListItem',position:2,name:({'/first-taste':'CHERRY 01','/world':'Our world','/early-access':'Early access','/contact':'Contact'})[path],item:canonical}]});
  head+=`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}</script>`;
  return head;
}
export function sitemap(origin) {
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${SEARCH_PAGES.map(path=>`<url><loc>${escape(origin)}${path==='/'?'':path}</loc><image:image><image:loc>${escape(origin)}${SHARE_IMAGE.path}</image:loc></image:image></url>`).join('')}</urlset>`;
}
export function robots(origin) {
  // Let crawlers read noindex on utility pages. Their APIs remain disallowed.
  return origin?`User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n';
}

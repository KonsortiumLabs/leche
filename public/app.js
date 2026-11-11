(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const page=document.body.dataset.page;
  const privatePage=['/studio','/confirm-email','/leave','/404'].includes(page);
  let excluded=false;
  try {
    const preference=new URLSearchParams(location.search).get('measure');
    if(preference==='off')sessionStorage.setItem('leche_measure_off','1');
    if(preference==='on')sessionStorage.removeItem('leche_measure_off');
    excluded=sessionStorage.getItem('leche_measure_off')==='1';
  } catch {}
  const measurementAllowed=!privatePage && !excluded && navigator.doNotTrack!=='1' && !navigator.globalPrivacyControl;
  async function api(path,data) {
    const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    let result;
    try { result=await response.json(); } catch { throw new Error('We couldn’t connect. Please try again.'); }
    if(!response.ok) throw Object.assign(new Error(result.error||'Something went wrong. Please try again.'),{field:result.field});
    return result;
  }
  const measured=new Set();
  function event(name) {
    if(!measurementAllowed||measured.has(name))return;
    measured.add(name);
    fetch('/api/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:name,path:page}),keepalive:true}).catch(()=>{});
  }
  const canonical=$('link[rel="canonical"]')?.href;
  if(measurementAllowed && location.protocol==='https:' && canonical && new URL(canonical).origin===location.origin) {
    const beacon=document.createElement('script');beacon.type='module';
    beacon.src='https://static.cloudflareinsights.com/beacon.min.js';
    beacon.dataset.cfBeacon=JSON.stringify({token:'c92f5b2bbce648709089ba2f867baf22'});
    document.head.append(beacon);
  }
  document.addEventListener('click',e=>{
    const a=e.target.closest('a');if(!a)return;
    const u=new URL(a.href,location.href);
    if(u.origin===location.origin&&u.pathname==='/early-access')event('early_access_click');
    if(u.hostname==='www.instagram.com'||u.hostname==='instagram.com')event('instagram_click');
  });
  document.querySelectorAll('#signup-form,#interest-form').forEach(form=>form.addEventListener('focusin',()=>event('signup_start'),{once:true}));
  if(!['/studio','/confirm-email','/leave'].includes(page))event('page_view'); if(page==='/first-taste') event('product_view');
  const query=new URLSearchParams(location.search);
  const tag=v=>v&&/^[a-zA-Z0-9 _.-]{1,80}$/.test(v)?v:null;
  let referrer=null;try{const ref=new URL(document.referrer);if(ref.origin!==location.origin)referrer=ref.origin;}catch{}
  const currentAttribution=measurementAllowed?{source:tag(query.get('utm_source')),medium:tag(query.get('utm_medium')),campaign:tag(query.get('utm_campaign')),referrer,path:page}:{path:page};
  let attribution=currentAttribution;
  // Keep only first-touch campaign fields for this tab. No tracking identifier.
  try {
    const previous=sessionStorage.getItem('leche_attribution');
    if(!measurementAllowed)sessionStorage.removeItem('leche_attribution');
    else if(previous) attribution=JSON.parse(previous);
    else sessionStorage.setItem('leche_attribution',JSON.stringify(currentAttribution));
  } catch {}

  const toggle=$('.menu-toggle'),menu=$('#mobile-menu');
  function setMenu(open,restore=false){
    menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu');
    document.documentElement.classList.toggle('menu-is-open',open);
    document.querySelector('main').inert=open;document.querySelector('.site-footer').inert=open;
    if(open) menu.querySelector('a')?.focus();else if(restore)toggle.focus();
  }
  function closeMenu(restore=false){setMenu(false,restore);}
  toggle?.addEventListener('click',()=>setMenu(menu.hidden));
  document.addEventListener('keydown',e=>{
    if(menu.hidden)return;
    if(e.key==='Escape'){closeMenu(true);return;}
    if(e.key==='Tab'){
      const focusables=[toggle,...menu.querySelectorAll('a')],first=focusables[0],last=focusables.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  menu.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
  document.addEventListener('click',e=>{if(!menu.hidden&&!e.target.closest('.site-header'))closeMenu();});
  matchMedia('(min-width:761px)').addEventListener('change',e=>{if(e.matches)closeMenu();});

  async function showSurvey(focus=true) {
    const response=await fetch('/api/session',{cache:'no-store'});
    if(!response.ok) throw new Error('Your signup was received, but preferences couldn’t load. Refresh to try again.');
    const session=await response.json();
    $('#signup-panel').hidden=true;
    if(session.editable) {
      $('#survey-panel').hidden=false;$('#existing-panel').hidden=true;
      $('#buy-at-price').checked=Boolean(session.purchaseInterest?.interested);
      $('#send-confirmation').hidden=!session.emailEnabled||session.emailVerified;
      $('#email-state').textContent=session.emailVerified?'Your email is confirmed.':session.emailEnabled?'Confirm your email to complete your launch-list profile.':'';
      if(session.preferences) {
        const p=session.preferences;
        document.querySelectorAll('[name="flavor"]').forEach(el=>{el.checked=el.value===p.flavor;});
        $('#price').value=p.price||'';$('#intent').value=p.intent||'';$('#reservation').checked=Boolean(p.reservation);
        $('#success-message').textContent='Your taste, noted. You can update your answers below.';
      }
      if(focus) $('#success-title').focus({preventScroll:true});
    } else { $('#existing-panel').hidden=false;$('#survey-panel').hidden=true;if(focus)$('#existing-panel h1').focus({preventScroll:true}); }
  }
  const signup=$('#signup-form');
  signup?.addEventListener('submit',async e=>{
    e.preventDefault();const email=$('#email'),consent=$('#consent'),status=$('#signup-status'),button=signup.querySelector('button');
    $('#email-error').textContent='';status.textContent='';email.removeAttribute('aria-invalid');consent.removeAttribute('aria-invalid');
    if(!email.validity.valid) {$('#email-error').textContent='Please enter a valid email address.';email.setAttribute('aria-invalid','true');email.focus();return;}
    if(!consent.checked) {status.textContent='Please tick the email consent box to join.';consent.setAttribute('aria-invalid','true');consent.focus();return;}
    button.disabled=true;button.textContent='saving your place…';
    try { await api('/api/signup',{email:email.value,consent:true,company:$('#company').value,attribution});await showSurvey();await requestConfirmation($('#email-state')); }
    catch(error) {status.textContent=error.message;event('signup_error');}
    finally {button.disabled=false;button.innerHTML='let me in <span aria-hidden="true">↗</span>';}
  });
  if(signup) fetch('/api/session',{cache:'no-store'}).then(r=>r.json()).then(s=>{if(s.editable)showSurvey(false).catch(()=>{});}).catch(()=>{});
  $('#survey-form')?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,button=form.querySelector('button'),status=$('#survey-status');
    button.disabled=true;status.textContent='';
    try {await api('/api/interest',{interested:$('#buy-at-price').checked});const result=await api('/api/survey',{flavor:$('[name="flavor"]:checked')?.value||null,price:$('#price').value||null,intent:$('#intent').value||null,reservation:$('#reservation').checked});status.textContent=result.message;}
    catch(error){status.textContent=error.message;}
    finally{button.disabled=false;}
  });
  document.querySelectorAll('.share-button').forEach(share=>share.addEventListener('click',async e=>{
    const button=e.currentTarget,status=$('#share-status');
    const cleanUrl=new URL(location.pathname,location.origin).href;
    try {
      if(navigator.share) {await navigator.share({title:document.title,text:page==='/first-taste'?'Meet CHERRY 01. Cherry-flavored nail lacquer is coming.':'a little more than meets the eye. 🍒',url:cleanUrl});button.textContent='shared ↗';event('share');}
      else {await navigator.clipboard.writeText(cleanUrl);button.textContent='link copied ↗';event('share_copy');}
      status.textContent='Ready to share.';
    } catch(error){if(error.name!=='AbortError'){button.textContent='copy the address to share';status.textContent='Sharing is unavailable. Copy the page address from your browser.';}}
  }));
  $('#unsubscribe')?.addEventListener('click',async e=>{
    const button=e.currentTarget;button.disabled=true;
    try {const result=await api('/api/unsubscribe',{});$('#unsubscribe-status').textContent=result.message;button.textContent='unsubscribed';}
    catch(error){$('#unsubscribe-status').textContent=error.message;button.disabled=false;}
  });
  // Native scroll-snap gallery. Every image remains reachable without JavaScript.
  const gallery=$('#product-gallery');
  if(gallery) {
    const slides=[...gallery.querySelectorAll('.gallery-slide')],thumbs=[...document.querySelectorAll('.gallery-thumb')];
    const names=['the bottle','the color','the details','the mood'];
    const viewer=$('.image-viewer'); let index=0, ticking=false, lastTrigger=null;
    const reduce=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
    function update(i,announce=false){
      index=(i+slides.length)%slides.length;
      thumbs.forEach((b,n)=>b.setAttribute('aria-current',String(n===index)));
      $('.gallery-count').textContent=`${index+1} / ${slides.length}`;
      $('#gallery-caption').textContent=`0${index+1} / ${names[index]}`;
      if(announce)$('#gallery-status').textContent=`Image ${index+1} of ${slides.length}: ${names[index]}`;
      if(viewer.open){const source=slides[index].querySelector('img');$('.viewer-image').src=source.src;$('.viewer-image').alt=source.alt;$('.viewer-count').textContent=`${index+1} / ${slides.length}`;}
    }
    function go(i){event('gallery_engaged');update(i,true);gallery.scrollTo({left:index*gallery.clientWidth,behavior:reduce()?'instant':'smooth'});}
    thumbs.forEach((b,i)=>b.addEventListener('click',()=>go(i)));
    $('.gallery-prev').addEventListener('click',()=>go(index-1));$('.gallery-next').addEventListener('click',()=>go(index+1));
    gallery.addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(()=>{const next=Math.round(gallery.scrollLeft/gallery.clientWidth);if(next>0)event('gallery_engaged');update(next);ticking=false;});}},{passive:true});
    gallery.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(index+(e.key==='ArrowRight'?1:-1));}});
    new ResizeObserver(()=>gallery.scrollTo({left:index*gallery.clientWidth,behavior:'instant'})).observe(gallery);
    slides.forEach((slide,i)=>slide.querySelector('button').addEventListener('click',e=>{lastTrigger=e.currentTarget;viewer.showModal();document.documentElement.classList.add('viewer-open');update(i);$('.viewer-close').focus();}));
    $('.viewer-close').addEventListener('click',()=>viewer.close());
    viewer.addEventListener('close',()=>{document.documentElement.classList.remove('viewer-open');lastTrigger?.focus({preventScroll:true});go(index);});
    viewer.addEventListener('click',e=>{if(e.target===viewer)viewer.close();});
    $('.viewer-prev').addEventListener('click',()=>update(index-1,true));$('.viewer-next').addEventListener('click',()=>update(index+1,true));
    viewer.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();update(index+(e.key==='ArrowRight'?1:-1),true);}});
    const dock=$('.product-dock'); let ctaVisible=false,footerVisible=false;
    const syncDock=()=>{dock.hidden=ctaVisible||footerVisible;};
    new IntersectionObserver(entries=>{ctaVisible=entries[0].isIntersecting;syncDock();},{threshold:0.1}).observe($('.primary-product-action'));
    new IntersectionObserver(entries=>{footerVisible=entries[0].isIntersecting;syncDock();},{threshold:0}).observe($('.site-footer'));
  }
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window){
    const reveal=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');reveal.unobserve(e.target);}}),{threshold:.08});
    document.querySelectorAll('.taste-story-heading,.brand-direction>div,.campaign-pair figure,.brand-invitation,.premise>div').forEach(el=>{el.classList.add('scroll-reveal');reveal.observe(el);});
  }

  async function requestConfirmation(target) {
    if(!target)return;
    try {
      const session=await (await fetch('/api/session',{cache:'no-store'})).json();
      if(!session.editable||!session.emailEnabled||session.emailVerified)return;
      const result=await api('/api/email/request',{});
      target.textContent=result.status==='sent'?'Check your inbox to confirm your email.':result.status==='verified'?'Your email is confirmed.':result.status==='disabled'?'':'Your interest is saved. Confirmation email is temporarily unavailable.';
    }catch{target.textContent='Your interest is saved. We couldn’t send another confirmation email just now.';}
  }
  $('#send-confirmation')?.addEventListener('click',async e=>{e.currentTarget.disabled=true;await requestConfirmation($('#email-state'));e.currentTarget.disabled=false;});

  const sheet=$('.interest-sheet');let sheetTrigger=null;
  if(sheet){
    function closeSheet(){sheet.close();}
    document.querySelectorAll('.interest-trigger').forEach(button=>button.addEventListener('click',()=>{
      sheetTrigger=button;sheet.showModal();document.documentElement.classList.add('sheet-is-open');
      if(!$('#interest-entry').hidden)$('#interest-email').focus({preventScroll:true});else $('#interest-success h2').focus();
      const cents=$('.price-proposition').dataset.price;event(`price_intent_${cents}`);
    }));
    $('.sheet-close').addEventListener('click',closeSheet);
    sheet.addEventListener('close',()=>{document.documentElement.classList.remove('sheet-is-open');sheetTrigger?.focus({preventScroll:true});});
    sheet.addEventListener('click',e=>{if(e.target===sheet){const r=sheet.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeSheet();}});
    $('#interest-form').addEventListener('submit',async e=>{
      e.preventDefault();const email=$('#interest-email'),consent=$('#interest-consent'),status=$('#interest-status'),button=e.currentTarget.querySelector('button');
      status.textContent='';email.removeAttribute('aria-invalid');consent.removeAttribute('aria-invalid');
      if(!email.validity.valid){status.textContent='Please enter a valid email address.';email.setAttribute('aria-invalid','true');email.focus();return;}
      if(!consent.checked){status.textContent='Please tick the email consent box.';consent.setAttribute('aria-invalid','true');consent.focus();return;}
      button.disabled=true;button.textContent='saving your interest…';
      try{
        await api('/api/signup',{email:email.value,consent:true,company:$('#interest-company').value,attribution,purchaseIntent:true});
        const session=await (await fetch('/api/session',{cache:'no-store'})).json();
        $('#interest-entry').hidden=true;$('#interest-success').hidden=false;
        $('#interest-saved-message').textContent=session.editable&&session.purchaseInterest?.interested?`Your interest at the proposed $${Number($('.price-proposition').dataset.price)/100} price is saved. No order or payment has been made.`:'Your request is received. If this email is already on the list, it remains subscribed. Existing preferences have not been changed.';
        $('#interest-success h2').focus({preventScroll:true});await requestConfirmation($('#interest-success .email-status'));
      }catch(err){status.textContent=err.message;event('signup_error');}
      finally{button.disabled=false;button.innerHTML='save my interest <span aria-hidden="true">↗</span>';}
    });
    const priceBox=$('.price-proposition');
    const priceObserver=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){event(`price_view_${priceBox.dataset.price}`);priceObserver.disconnect();}},{threshold:.5});priceObserver.observe(priceBox);
  }
  const emailAction=$('.email-action');
  if(emailAction){
    const actionToken=location.hash.slice(1);history.replaceState(null,'',location.pathname);
    $('#email-action-button').addEventListener('click',async e=>{const b=e.currentTarget,status=$('#email-action-status');b.disabled=true;
      try{await api(emailAction.dataset.emailAction==='confirm'?'/api/email/confirm':'/api/email/unsubscribe',{token:actionToken});status.textContent=emailAction.dataset.emailAction==='confirm'?'Your email is confirmed. Good to have you.':'You’re unsubscribed. You won’t receive launch updates.';b.hidden=true;}catch(err){status.textContent=err.message;b.disabled=false;}
    });
  }
  // Lightweight perspective; no WebGL bundle, device sensors, or scroll interception.
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),finePointer=matchMedia('(hover:hover) and (pointer:fine)');
  const depthObjects=[...document.querySelectorAll('.depth-object')],visibleDepth=new Set();let depthFrame=0;
  const depthObserver=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)visibleDepth.add(e.target);else visibleDepth.delete(e.target);}),{rootMargin:'80px'});
  depthObjects.forEach(el=>{
    depthObserver.observe(el);el.classList.add('depth-active');
    if(el.classList.contains('hero-object'))el.style.setProperty('--base-angle','5deg');
    if(el.classList.contains('tease-image'))el.style.setProperty('--base-angle','-3deg');
    el.addEventListener('pointermove',e=>{
      if(motion.matches||!finePointer.matches||e.pointerType==='touch')return;
      const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      el.style.setProperty('--depth-x',`${-y*5}deg`);el.style.setProperty('--depth-ry',`${x*7}deg`);
    },{passive:true});
    el.addEventListener('pointerleave',()=>{el.style.setProperty('--depth-x','0deg');el.style.setProperty('--depth-ry','0deg');});
  });
  function scrollDepth(){if(depthFrame||motion.matches)return;depthFrame=requestAnimationFrame(()=>{
    for(const el of visibleDepth){const r=el.getBoundingClientRect(),progress=Math.max(-1,Math.min(1,(innerHeight/2-(r.top+r.height/2))/innerHeight));el.style.setProperty('--depth-y',`${progress*14}px`);if(!finePointer.matches)el.style.setProperty('--depth-x',`${progress*2}deg`);}
    const photo=$('[data-parallax]');if(photo){const r=photo.parentElement.getBoundingClientRect();if(r.bottom>0)photo.style.setProperty('--photo-y',`${Math.min(30,Math.max(-12,-r.top*.045))}px`);}
    depthFrame=0;
  });}
  addEventListener('scroll',scrollDepth,{passive:true});scrollDepth();
  motion.addEventListener('change',()=>{if(motion.matches){depthObjects.forEach(el=>{el.style.removeProperty('--depth-y');el.style.removeProperty('--depth-x');el.style.removeProperty('--depth-ry');});}else scrollDepth();});

})();

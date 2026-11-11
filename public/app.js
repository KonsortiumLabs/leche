(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const page=document.body.dataset.page;
  const measurementAllowed=navigator.doNotTrack!=='1' && !navigator.globalPrivacyControl;
  async function api(path,data) {
    const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    let result;
    try { result=await response.json(); } catch { throw new Error('We couldn’t connect. Please try again.'); }
    if(!response.ok) throw Object.assign(new Error(result.error||'Something went wrong. Please try again.'),{field:result.field});
    return result;
  }
  function event(name) { if(measurementAllowed) api('/api/event',{event:name,path:page}).catch(()=>{}); }
  event('page_view'); if(page==='/first-taste') event('product_view');
  const query=new URLSearchParams(location.search);
  const currentAttribution={source:query.get('utm_source'),medium:query.get('utm_medium'),campaign:query.get('utm_campaign'),referrer:document.referrer,path:page};
  let attribution=currentAttribution;
  // Keep only first-touch campaign fields for this tab. No tracking identifier.
  try {
    const previous=sessionStorage.getItem('leche_attribution');
    if(previous) attribution=JSON.parse(previous);
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
    try { await api('/api/signup',{email:email.value,consent:true,company:$('#company').value,attribution});await showSurvey(); }
    catch(error) {status.textContent=error.message;}
    finally {button.disabled=false;button.innerHTML='let me in <span aria-hidden="true">↗</span>';}
  });
  if(signup) fetch('/api/session',{cache:'no-store'}).then(r=>r.json()).then(s=>{if(s.editable)showSurvey(false).catch(()=>{});}).catch(()=>{});
  $('#survey-form')?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,button=form.querySelector('button'),status=$('#survey-status');
    button.disabled=true;status.textContent='';
    try {const result=await api('/api/survey',{flavor:$('[name="flavor"]:checked')?.value||null,price:$('#price').value||null,intent:$('#intent').value||null,reservation:$('#reservation').checked});status.textContent=result.message;}
    catch(error){status.textContent=error.message;}
    finally{button.disabled=false;}
  });
  $('.share-button')?.addEventListener('click',async e=>{
    const button=e.currentTarget,status=$('#share-status');
    const cleanUrl=new URL(location.pathname,location.origin).href;
    try {
      if(navigator.share) {await navigator.share({title:'The world of LÈCHE',text:'a little more than meets the eye. 🍒',url:cleanUrl});button.textContent='shared ↗';}
      else {await navigator.clipboard.writeText(cleanUrl);button.textContent='link copied ↗';}
      status.textContent='Ready to share.';event('share');
    } catch(error){if(error.name!=='AbortError'){button.textContent='copy the address to share';status.textContent='Sharing is unavailable. Copy the page address from your browser.';}}
  });
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
    function go(i){update(i,true);gallery.scrollTo({left:index*gallery.clientWidth,behavior:reduce()?'instant':'smooth'});}
    thumbs.forEach((b,i)=>b.addEventListener('click',()=>go(i)));
    $('.gallery-prev').addEventListener('click',()=>go(index-1));$('.gallery-next').addEventListener('click',()=>go(index+1));
    gallery.addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(()=>{update(Math.round(gallery.scrollLeft/gallery.clientWidth));ticking=false;});}},{passive:true});
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

})();

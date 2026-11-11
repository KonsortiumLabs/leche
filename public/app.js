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
  function closeMenu(restore=false) { menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open menu');if(restore)toggle.focus(); }
  toggle?.addEventListener('click',()=>{const opening=menu.hidden;menu.hidden=!opening;toggle.setAttribute('aria-expanded',String(opening));toggle.setAttribute('aria-label',opening?'Close menu':'Open menu');});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden)closeMenu(true);});
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
        $('#success-message').textContent='You’re on the list. Your saved preferences are below; change them whenever you like in this browser.';
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
      if(navigator.share) {await navigator.share({title:'The world of LÈCHE',text:'a little more than meets the eye.',url:cleanUrl});button.textContent='shared ↗';}
      else {await navigator.clipboard.writeText(cleanUrl);button.textContent='link copied ↗';}
      status.textContent='Ready to share.';event('share');
    } catch(error){if(error.name!=='AbortError'){button.textContent='copy the address to share';status.textContent='Sharing is unavailable. Copy the page address from your browser.';}}
  });
  $('#unsubscribe')?.addEventListener('click',async e=>{
    const button=e.currentTarget;button.disabled=true;
    try {const result=await api('/api/unsubscribe',{});$('#unsubscribe-status').textContent=result.message;button.textContent='unsubscribed';}
    catch(error){$('#unsubscribe-status').textContent=error.message;button.disabled=false;}
  });
})();

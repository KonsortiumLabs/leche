(() => {
  const $=s=>document.querySelector(s);let key='',stats=null,quantity=1;
  async function request(path){const r=await fetch(path,{headers:{Authorization:`Bearer ${key}`},cache:'no-store'});if(!r.ok)throw new Error(r.status===401?'Access is locked. Check the owner key.':'Could not load data. Try again.');return r;}
  const metric=(label,value)=>{const el=document.createElement('div'),number=document.createElement('strong'),text=document.createElement('span');number.textContent=value??0;text.textContent=label;el.append(number,text);return el;};
  async function refresh(){
    stats=await (await request('/api/admin/stats')).json();
    $('#stat-grid').replaceChildren(metric('active subscribers',stats.leads.opted_in),metric('verified emails',stats.leads.verified_opted_in),metric(`interested at ${stats.offer.display}`,stats.interest.interested),metric('verified price interest',stats.interest.verified_interested));
    $('#studio-note').textContent=`Current price hypothesis: ${stats.offer.display} USD. No money or orders collected.`;
    $('#source-rows').replaceChildren(...stats.sources.map(s=>{const tr=document.createElement('tr');[s.source,s.signups,s.verified,s.price_interested].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td);});return tr;}));
    const sum=name=>stats.metrics.filter(m=>m.event===name).reduce((n,m)=>n+m.count,0);
    $('#event-totals').replaceChildren(metric('product-view events',sum('product_view')),metric('price-view events',sum(`price_view_${stats.offer.cents}`)),metric('price-interest clicks',sum(`price_intent_${stats.offer.cents}`)),metric('survey responses',stats.demand.responses));
    $('#email-readiness').textContent=stats.email_enabled?'Sender configured. Verify real delivery before announcing the email flow.':'Email sending is off. Sender setup is still required.';
  }
  $('#studio-login').addEventListener('submit',async e=>{e.preventDefault();key=$('#studio-key').value;$('#studio-status').textContent='Opening studio…';try{await refresh();$('#studio-key').value='';$('#studio-login').hidden=true;$('#studio-data').hidden=false;$('#studio-status').textContent='';}catch(err){key='';$('#studio-status').textContent=err.message;}});
  $('#studio-refresh').addEventListener('click',async()=>{try{await refresh();}catch(e){$('#studio-note').textContent=e.message;}});
  $('#studio-export').addEventListener('click',async()=>{try{const r=await request('/api/admin/export?active=1'),blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='leche-early-access.csv';a.click();URL.revokeObjectURL(url);}catch(e){$('#studio-note').textContent=e.message;}});
  $('#studio-lock').addEventListener('click',()=>{key='';stats=null;$('#studio-data').hidden=true;$('#studio-login').hidden=false;$('#stat-grid').replaceChildren();$('#source-rows').replaceChildren();$('#event-totals').replaceChildren();$('#studio-key').focus();});
  const bag=$('#preview-bag');
  function update(){ $('#quantity-value').textContent=quantity;$('#bag-subtotal').textContent=`$${(stats.offer.cents*quantity/100).toFixed(2)}`;$('#quantity-minus').disabled=quantity<=1;$('#quantity-plus').disabled=quantity>=6;$('#bag-items').hidden=quantity===0;$('#bag-empty').hidden=quantity!==0; }
  function close(){bag.close();document.documentElement.classList.remove('viewer-open');$('#preview-add').focus();}
  $('#preview-availability').addEventListener('change',e=>{$('#preview-add').textContent=e.target.value==='sold-out'?'notify me ↗':'add to bag ↗';$('#preview-message').textContent='';});
  $('#preview-add').addEventListener('click',()=>{if($('#preview-availability').value==='sold-out'){$('#preview-message').textContent='Preview: this state will offer a restock notification. No subscription was created.';return;}quantity=1;$('#checkout-preview').hidden=true;$('#confirmation-preview').hidden=true;update();bag.showModal();document.documentElement.classList.add('viewer-open');});
  $('#quantity-minus').addEventListener('click',()=>{quantity=Math.max(1,quantity-1);update();});$('#quantity-plus').addEventListener('click',()=>{quantity=Math.min(6,quantity+1);update();});$('#bag-remove').addEventListener('click',()=>{quantity=0;update();});
  $('#bag-close').addEventListener('click',close);$('#preview-finish').addEventListener('click',close);bag.addEventListener('close',()=>document.documentElement.classList.remove('viewer-open'));
  $('#preview-checkout').addEventListener('click',()=>{$('#bag-items').hidden=true;$('#checkout-preview').hidden=false;});$('#back-to-bag').addEventListener('click',()=>{$('#checkout-preview').hidden=true;update();});$('#preview-confirmation').addEventListener('click',()=>{$('#checkout-preview').hidden=true;$('#confirmation-preview').hidden=false;});
})();

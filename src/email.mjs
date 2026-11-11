const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function emailConfigured(env) {
  return Boolean(env.RESEND_API_KEY && /^[^\r\n]+@[^\r\n]+$/.test(env.EMAIL_FROM||'') && env.EMAIL_POSTAL_ADDRESS);
}
export function welcomeEmail({siteUrl,tokens,address}) {
  const verify=`${siteUrl}/confirm-email#${tokens.verify}`,leave=`${siteUrl}/leave#${tokens.unsubscribe}`;
  return {
    subject:'A little LÈCHE in your inbox.',
    text:`Good to have you.\n\nYou're part of the beginning of LÈCHE. Beauty with taste, starting with CHERRY 01.\n\nConfirm your email for first looks and launch news:\n${verify}\n\nThis confirms your email only. No order, payment or product allocation.\n\na little more than meets the eye 🍒\n\nUnsubscribe: ${leave}\n${address}`,
    html:`<!doctype html><html><body style="margin:0;background:#f3eade;color:#3c1720;font-family:Arial,sans-serif"><table role="presentation" width="100%"><tr><td align="center" style="padding:48px 24px"><table role="presentation" width="480" style="max-width:100%"><tr><td><img src="${escape(siteUrl)}/assets/optimized/row-1-middle-wordmark-480.jpg" width="120" alt="LÈCHE"><h1 style="font-size:42px;letter-spacing:-2px;font-weight:400">good to have you.</h1><p style="line-height:1.7">You’re part of the beginning of LÈCHE.<br>Beauty with taste, starting with CHERRY 01.</p><p style="line-height:1.7">Confirm your email for first looks and launch news.</p><p style="margin:32px 0"><a href="${escape(verify)}" style="background:#4b0d1b;color:#f3eade;padding:18px 28px;border-radius:30px;text-decoration:none;display:inline-block">confirm my email</a></p><p style="font-size:12px;line-height:1.7">This confirms your email only. No order, payment or product allocation.</p><p style="margin-top:40px">a little more than meets the eye 🍒</p><p style="font-size:11px;line-height:1.7"><a href="${escape(leave)}" style="color:inherit">unsubscribe</a><br>${escape(address)}</p></td></tr></table></td></tr></table></body></html>`
  };
}
export async function sendWelcome({store,lead,env,siteUrl,transport=fetch}) {
  if(!emailConfigured(env))return {status:'disabled'};
  if(lead.email_verified)return {status:'verified'};
  const tokens=await store.emailTokens(lead.id);
  const message=welcomeEmail({siteUrl,tokens,address:env.EMAIL_POSTAL_ADDRESS});
  try {
    const response=await transport('https://api.resend.com/emails',{
      method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`leche-${tokens.verify}`},
      body:JSON.stringify({from:env.EMAIL_FROM,to:[lead.email],...message}),signal:AbortSignal.timeout(8000)
    });
    if(!response.ok)return {status:'unavailable'};
    const result=await response.json();
    return {status:result.id?'sent':'unavailable'};
  }catch{return {status:'unavailable'};}
}

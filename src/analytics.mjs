import { PRICE_EVENTS } from './offer.mjs';
export const CLIENT_EVENTS = ['page_view','product_view','share','share_copy','signup_start','signup_error','early_access_click','instagram_click','gallery_engaged',...PRICE_EVENTS];
export function validEvent(event,path) {
  if(!CLIENT_EVENTS.includes(event))return false;
  if(['product_view','gallery_engaged',...PRICE_EVENTS].includes(event))return path==='/first-taste';
  if(['signup_start','signup_error'].includes(event))return ['/early-access','/first-taste'].includes(path);
  return true;
}
export const isBot = ua => /bot\b|crawler|spider|facebookexternalhit|headless|lighthouse/i.test(ua||'');
export const ANALYTICS_DASHBOARD = 'https://dash.cloudflare.com/3bb96d864a812f8269284016316ebb83/web-analytics';

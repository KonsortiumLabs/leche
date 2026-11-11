// One price hypothesis, not a sale price or an offer to ship.
export const OFFER = Object.freeze({product:'cherry-01', cents:2800, currency:'USD', revision:'cherry-01-28-v1', display:'$28'});
export const PRICE_EVENTS = [`price_view_${OFFER.cents}`, `price_intent_${OFFER.cents}`];

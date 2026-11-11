# LÈCHE: from launch list to shopping

## Current public experience
The public site is a real pre-launch storefront. CHERRY 01 has a four-image swipe gallery, full-screen image viewer, explicit image controls, product details, ingredient/care disclosure, and a mobile conversion dock. The primary action joins the real launch list; the optional survey records flavor, price expectations, buying interest, and nonbinding product interest in D1. No money or orders are collected.

## Shopping release design
Keep this same product page and imagery system when the product can be sold. Replace only the purchase area and supply final product information:

1. **Product:** CHERRY 01, nail lacquer, confirmed size and price beside the shade/flavor. Gallery stays swipeable; final manufactured-product photography replaces campaign renders when available.
2. **Choice:** one selected CHERRY 01 shade initially. Do not show unavailable future categories as purchasable variants. Show a quantity control with stock-aware limits when inventory exists.
3. **Primary action:** “add to bag” replaces “be first to know”. Mobile dock mirrors the confirmed product price and purchase action. Actual availability determines whether the action adds an item or offers release/restock notifications.
4. **Bag drawer:** accessible modal with actual SKU, size, image, quantity, line total, remove action, subtotal, and checkout action. No surprise additions. Explain that tax and shipping are calculated at checkout.
5. **Checkout:** provider-hosted checkout with guest purchase, eligible express wallets, address, real shipping methods, tax, payment, and final total. Never collect card numbers in the application or treat a return URL as proof of payment.
6. **Confirmation:** server-verified payment webhook creates one order idempotently, adjusts inventory, and sends the receipt. Confirmation shows the actual order reference, delivery expectation, contact and tracking when supplied by fulfillment.
7. **After purchase:** shipping/tracking messages, cancellation/refund handling, returns information and customer support. Marketing consent remains separate from transactional messages.

## Information needed to enable purchases
- Approved final formula, full ingredient declaration, verified intended uses and supporting evidence. Tasting and intimate-use suitability need assessment for this product, not inference from a children's nail-polish claim.
- Confirmed manufacturer, production inventory, SKU, fill volume, price and fulfillment lead time.
- Business/contact details, payment account, shipping regions/rates, return policy, customer support and transactional email provider.
- Product photography and approved labeling, instructions, storage information and claims.

## Implementation boundaries
- Keep live mode set to pre-launch until those inputs exist. Do not introduce a fake price, fake stock counter, disabled checkout masquerading as a real shop, or unsupported ingredient badges.
- Keep launch-list D1 records separate from customers and orders. Do not silently convert old marketing interest into a purchase or saved payment record.
- Use a payment provider's test environment to verify duplicate webhooks, failed/abandoned payments, tax/shipping totals, inventory races, refunds and email delivery before enabling real sales.
- Existing early-access operation remains within the $0 budget. Any paid commerce service, domain, or billing plan requires a separate decision.

## Reference check, November 11, 2026
Kid Licks is a likely category reference, not confirmed as the brand the founder meant. Its own FAQ says its polish uses edible ingredients but is not intended for eating. Its current published list includes alcohol, confectioner's glaze and possible colors; that is not a formulation recipe or evidence for LÈCHE's final composition, tasting experience, or intimate use.
- https://kidlicks.com/pages/faq
- https://www.fda.gov/cosmetics/resources-industry-cosmetics/small-businesses-homemade-cosmetics-fact-sheet

FDA guidance distinguishes supporting evidence on ingredients from evidence appropriate to the finished product and its use. A qualified formulator/safety assessor can evaluate what existing evidence is relevant and what additional evidence is needed. Ingredient inspiration alone does not establish “edible,” “natural,” or intimate-use safety claims for LÈCHE.

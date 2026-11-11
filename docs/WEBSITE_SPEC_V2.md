# LÈCHE • website specification v2

## The challenge
A new brand with ONLY an Instagram account and a compelling concept. Build a mobile-native, desktop-excellent **multi-page digital beauty flagship** that makes people want to join the world of LÈCHE, understand the difference, and express genuine demand. The brand aims for aesthetic desirability comparable to SKIMS, Kylie Cosmetics and rhode (no relationship or endorsement). Initial product idea: flavored nail lacquer. There is no actual tested formula, production, inventory or orders.

## Required routes (purposeful, concise, not one long page)
- `/` **Home** — full-screen art-directed hero using exact wordmark and approved campaign photography; short intro, product tease, clear next steps. Short page, not every section piled here.
- `/first-taste` **CHERRY 01** — elegant concept product presentation, desired sensory premise, manicure/pedicure gallery, brief truth-in-advertising development-stage notice and early-access CTA. Use EXACT product bottle reference supplied, don't invent new packaging or safety specs.
- `/world` **The World of LÈCHE** — editorial/image story, sensory beauty philosophy, curated visual gallery and campaign copy. Treat the brand as broader than nail polish; future categories are *possibilities*, not launched SKUs.
- `/early-access` **Early Access** — extremely low-friction email waitlist, opt-in/consent as needed, optional flavor + purchase-intent survey, a real nonbinding reservation-of-interest option. Never collect payment for nonexistent product or present it as a confirmed order.
- Privacy/contact/404 pages as needed, with truthful information and no invented business address/email.

## Experience language
- First impression: visually arresting but not explicit. Dreamy oxblood/burgundy with champagne blush, warm ivory, natural skin tones, tightly cropped editorial photography, beautiful glass, floral shadows used sparingly (not spa-like flowers), modern type hierarchy.
- Use the real Pillow Lava-inspired wordmark raster. Do not substitute a generic serif. Supporting typography thin refined and readable on 375px viewport.
- Mobile-native design first; equally considered spacious art-directed desktop layouts. Fast transitions, no scroll-jacking, proper menu, reduced-motion support, accessible interactions and visible primary CTAs.
- Site should be interactive and exploratory but not bloated: each route has a different role; no blog/CMS/cart/user account at v0.

## Conversion and validation (working, not pretend)
- Email collected via backend, with server validation, duplicate handling, abuse prevention, consent, UTM/source attribution, clear real success/failure, export/review workflow.
- Optional flavor poll and price/purchase-intent after email; capture separately, no fake scarcity or preorders.
- Privacy-first pageview, product-view, signup and share metrics. Distinguish likes from demand (signed-up and opt-in prospects).
- SEO, Open Graph preview, robots/sitemap/canonical as appropriate. Strong page speed and Lighthouse/accessibility practices.

## Brand & copy
- Brand: LÈCHE @tasteleche. `pleasure looks good on you 🍒` and `a little more than meets the eye.` are established profile language.
- Campaign phrases: `not scented. flavored.` (concept only), `good taste gets a little messy.`, `just a little tease.`, `something sweet is coming.` Lowercase/compact where appropriate.
- Cherry is campaign flavor/world, **not master identity**. No fake Jenner affiliation or claims of completed formulation.
- Do not claim vegan, cruelty-free, plant-based, organic, safe to eat, non-toxic, made in USA, shipping soon, etc. unless proven. These are desired formulation goals, not verified facts.

## Tech implementation
Initialize from scratch; recommended Next.js/TypeScript/Tailwind + restrained animation, database/provider waitlist. A repository should be CREATED, not expected to exist. Tests: build, typecheck/lint, smoke navigation, responsive layout and waitlist when backend credentials are available. Deliver operating local site and deployment-ready config, report any credentials/deployment not completed rather than claiming live functionality.

## Acceptance criteria
1. Four coherent, distinctive routes; excellent mobile and desktop visuals based on provided assets.
2. Wordmark and imagery visibly consistent and not redrawn by default.
3. No fake shopping or product availability.
4. Waitlist is tested with real persistence or clearly flagged blocked by missing credentials.
5. Clear conversion path, analytics hooks, accessibility and performance checks.
6. Documentation includes setup and status of every working/incomplete flow.

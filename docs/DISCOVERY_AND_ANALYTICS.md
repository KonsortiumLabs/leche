# LÈCHE discovery and measurement

## Live destinations
- Website: https://leche.kash-3bb.workers.dev/
- Owner reporting: https://leche.kash-3bb.workers.dev/studio (existing ADMIN_TOKEN required; held only in the tab's memory)
- Traffic/performance: https://dash.cloudflare.com/3bb96d864a812f8269284016316ebb83/web-analytics (Cloudflare account sign-in)
- Sitemap: https://leche.kash-3bb.workers.dev/sitemap.xml

## What is implemented
Server-rendered per-page titles/descriptions, canonical URLs, Open Graph and Twitter large-image cards, image dimensions and alt text, Organization and WebSite identity linked to @tasteleche, WebPage/AboutPage/ContactPage and breadcrumbs. No invented product availability, reviews, sale offers, or safety claims. Five indexable pages; privacy is noindex/follow; studio, email actions, unknown URLs and previews are noindex/nofollow. API responses include X-Robots-Tag. Robots allows the crawler to read utility-page noindex; it disallows APIs.

Four 1200×630 JPEG share cards are in public/assets/social. The source HTML composition is scripts/share-cards.html. Render with the supplied original imagery and font; do not regenerate the logo or photos. Share scrapers cache previews independently; a live metadata fix may require a new scrape before an old shared link changes. Actual platform presentation is controlled by the platform, not guaranteed by our metadata.

## Measurement
Cloudflare Web Analytics is free, manually installed through the public beacon identifier in app.js. It supplies visits, referrers, device/browser categories, country-level traffic and performance. The first-party /api/event endpoint records bounded daily totals in existing D1 metrics; no additional database migration is required.

Both client tracking systems honor DNT/GPC, omit private utility routes, and honor ?measure=off for your QA tab. Use ?measure=on to re-enable. This exclusion does not stop a form from creating a real signup. Never use real production signups for casual QA. Known crawler agents are excluded by the first-party API. The beacon runs only on HTTPS pages with a matching canonical origin. Ad blockers and privacy controls can reduce coverage.

First-party interactions are counted once per named event per loaded document. Page reloads are new views. Native shares and copied links are separate. Signup starts reflect entering a form; errors include signup-flow failures. Saved signups and price interest come from the backend, not browser conversion pixels. New-signup events are insertion counts, even if a subscriber subsequently unsubscribes; active-subscriber cards and campaign cohorts exclude unsubscribed records. Do not divide these different measures into a claimed visitor conversion rate.

Event reports cover 30 calendar days including today in UTC. Active subscriber/source/campaign and survey summaries are all-time. The source/campaign tables are capped at the top 30/50 groups respectively. There is no historical backfill for newly introduced events. Repeated sessions and unverified addresses are not independent evidence of purchases.

## Campaign links
Use the private studio link builder. Example for the Instagram bio:
https://leche.kash-3bb.workers.dev/first-taste?utm_source=instagram&utm_medium=social&utm_campaign=cherry-01-launch

Use a different campaign label for each placement (bio, story, creator, or paid test). Do not include personal information in UTM parameters. First-touch source/medium/campaign, referral host and entry page persist for that tab and attach to a submitted signup unless measurement is opted out. Internal links should not overwrite attribution.

## Remaining external setup
The user plans to purchase tasteleche.com; registration/connection is not confirmed. After connecting it to the existing Worker, set SITE_URL to its HTTPS origin, redirect the old hostname to the preferred one preserving path/query, update the analytics hostname in Cloudflare, and verify canonical/sitemap/share URLs. Do not buy or enable a paid plan without the user's instruction.

Google Search Console and Bing Webmaster Tools ownership/submission have not been completed. Once the preferred domain is live, verify ownership in the owner's accounts and submit /sitemap.xml. Search Console is where actual indexed pages, search queries and impressions are checked. Technical readiness and sitemap publication do not guarantee indexing, rankings or rich results. No fabricated verification codes or IndexNow keys are installed.

## Validation
npm run check && npm test. Tests cover route metadata, canonical consistency, JSON-LD, share asset existence, full reporting windows, source cohorts, unsubscribe handling, bot/DNT/GPC suppression, event validation and protected reporting. Browser QA checks mobile layout and campaign links; production QA checks published metadata, asset bytes and successful analytics requests.

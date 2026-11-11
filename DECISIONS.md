# LÈCHE decisions

## User-approved source of truth — 2026-11-11

- Build a new, independent application, editable and hostable outside ChatGPT.
- Preserve the original sculptural LÈCHE raster wordmark, including the È accent.
- Use the supplied campaign images. Do not regenerate or redesign them.
- Four primary routes: Home, First Taste, The World, Early Access.
- Brand scope is sensory beauty. CHERRY 01 flavored nail lacquer is its first concept.
- Concept-stage presentation, real early-access persistence, no checkout, payment, availability, formula safety or certification claims.
- WEBSITE_SPEC_V2.md supersedes the older spec referenced in MASTER_CONTEXT.md.

## Implementation choices — awaiting ordinary design review

- Shared server-rendered pages with a Cloudflare Worker + D1 backend for public hosting; the dependency-free Node 24 + SQLite server remains for local development. No ChatGPT runtime, login or hosting dependency. The recommended Next.js stack was not mandatory; package network access was unavailable and a native runtime allows complete persistent functionality without third-party credentials.
- Current UI colors: warm ivory #f3eade, wine #4b0d1b, champagne blush #e3c8bf. Supporting typography uses the locally available Helvetica Neue / Arial stack. No substitute font is used as the logo.
- Logo uses the exact original raster in a CSS crop of the surrounding blank canvas. No tracing, vectorization, regeneration or edited raster was made. Original bytes are retained.
- Homepage leads with the hand/glass campaign and concise concept explanation; First Taste uses the exact bottle and manicure/pedicure images; The World carries the original wordmark campaign and editorial imagery. Mouth/cherry imagery appears once in The World.
- Third-row candidate imagery remains included in source assets for review but is not published in the visitor experience. Reference screenshots/moodboards are not presented as actual posts, metrics or products.
- Public-hosting records use D1. The optional local Node server uses private SQLite files; that adapter requires a persistent local disk.
- Signup requires explicit email consent. Surveys and nonbinding reservations are optional. Email addresses are unverified; they are never counted as confirmed customers or sales.
- Duplicate signup returns a generic response. Only an opaque, HttpOnly session issued for a newly created lead permits survey edits. Typing an existing email cannot obtain editing access. Unsubscribed addresses are not silently reactivated.
- The operator can review/export D1 records through the Cloudflare console or optional bearer-protected read-only API. The CLI applies only to the local Node database. No public admin account or guessed credentials.
- Analytics store daily event totals; no third-party scripts, analytics cookies or visitor identifiers. DNT and GPC suppress client measurement. First-touch campaign data uses tab-scoped session storage; server strips full referrer/query information.
- Official contact is Instagram @tasteleche. No domain, business email or address is invented.

## Verification status

- Syntax checks passed.
- Automated request-handler tests passed against actual SQLite persistence, including closing/reopening the database. Tests deliberately avoid socket binding because this session prohibits it.
- All 15 source assets were inspected visually before implementation, as was the asset board. Source-byte equality is checked by the asset audit.
- Live server launch was attempted but the environment denied listening on 127.0.0.1 (EPERM).
- Browser visual QA was attempted; local file preview was blocked by browser policy. No browser screenshot, Lighthouse score or completed mobile/browser test is claimed.
- Public hosting/domain connection, email delivery/verification, actual browser QA and production traffic testing remain outstanding.

## Public deployment status — 2026-11-11

- Source and original images are in the user's public repository: https://github.com/KonsortiumLabs/leche. The original 38 files were verified against local Git object hashes after browser upload.
- User rejected hosting charges and clarified a hard $0 budget. No Render resource was deployed, no card was submitted, and the paid Blueprint has been retired with an empty services list.
- Public target is Cloudflare Workers Free + D1 Free, with a free workers.dev address. No paid-plan upgrade, purchased domain, paid storage or email provider is authorized.
- Worker uses standard Request/Response and Web Crypto. No Node filesystem, persistent server, or runtime package is required. Original page templates and campaign files are shared unchanged.
- D1 signup batches atomically insert the lead, ownership session and signup metric. Concurrent duplicates cannot claim an existing record or inflate counts. SQL tests verify rollback after an injected failure.
- Abuse prevention keeps short-lived HMAC hashes in D1. The signing key is generated with Web Crypto and stored privately in D1. No secrets are shipped to the browser or committed to Git.
- Six local tests pass, including the Worker handler against a SQLite-backed implementation of D1's binding interface. These validate actual SQL and transaction behavior, not Cloudflare's deployed runtime.
- Cloudflare is currently signed out. Public deployment, actual D1 migration, live signup verification and browser visual QA remain outstanding. Do not claim the site is live until a public URL is verified.
- The repository connection cannot write through its connector; signed-in GitHub browser uploads are used. No unrelated repositories are changed.

## 2026-11-11 — Flagship visual overhaul
- User requested a more immersive, contemporary beauty flagship and clearer product differentiation, with mobile as the priority.
- Reworked opening into full-bleed approved campaign imagery, immediate flavored-lacquer positioning, paired editorial typography, softer controls, and distinct image-led routes.
- Original raster wordmark retained byte-for-byte; SVG color filter removes the paper background only at rendering, with inverse ink on dark photography. No redrawn logo or regenerated image.
- Signup endpoints, consent, survey ownership, and D1 persistence retained.

## 2026-11-11 — Pre-launch voice and secondary-page rebuild
- Shifted from repeated concept language to a real pre-launch beauty brand voice, per user direction.
- Clear flavored-beauty identity with CHERRY 01 first; future lip gloss/body glaze ambitions and natural/fruit formulation direction described without asserting final ingredients or validated safety.
- Product page pairs full original bottle image with short premise, signup, and ingredient/care details. Brand page separates self-directed pleasure, broader vision, campaign, and invitation. Signup retains consent and real persistence.
- Added cherry tagline and prominent Instagram links; removed em dashes from public copy.

## 2026-11-11 — Mobile interaction and commerce path
- Added native swipe/scroll-snap four-image product gallery, thumbnails, arrow-key/buttons, full-screen viewer, and reduced-motion-aware transitions.
- Added mobile join-list dock that yields to the primary action and footer, plus full-height mobile navigation with focus management and background inertness.
- Mapped real shopping, bag, checkout, verified order, and post-purchase states in docs/LAUNCH_PLAN.md. Public action remains pre-launch because no final formula/price/stock/fulfillment is confirmed.
- Kid Licks is a likely category reference only. Do not copy its ingredient list as LÈCHE's or treat its claims as proof of tasting/intimate-use suitability.

## November 11: dimensional design and $28 validation
- User chose a beauty-with-taste founding angle; no actual formula/prototype exists. The children's brand is a reference only.
- One proposed $28 price replaces the assistant's rejected $38 suggestion. No randomized pricing or payments.
- Added perspective/light effects using original imagery, compact product hierarchy, price-interest bottom sheet, optimized delivery sizes and licensed Manrope font.
- Added separate purchase-interest records, protected owner reporting, an illustrative shopping preview, and email confirmation/unsubscribe code. Sending stays disabled until provider key, verified sender and mailing address are configured.
- Apply migrations/0002_launch_validation.sql before deploying the new API. Owner studio uses the existing ADMIN_TOKEN protection.

## November 11: sentence hierarchy and launch copy
- Separated invitation/reassurance, consent/unsubscribe, and pre-launch/final-details lines in the interest sheet. Reused intentional sentence grouping in signup and survey helper copy.
- Replaced the overlapping email focus outline with a spaced field and visible contained focus treatment; keyboard focus remains visible.
- Rewrote product details around color, flavor, formulation direction and the first release. Removed "someday" and research-style framing without inventing an ingredient list or completed safety tests.

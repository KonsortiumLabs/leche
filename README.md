# LÈCHE — independent digital flagship

A server-rendered four-page flagship and database-backed early-access application using the original LÈCHE imagery. Public hosting targets **Cloudflare Workers Free + D1 Free**, with a strict **$0 budget** and a free workers.dev URL. Source is owned in this GitHub repository and does not depend on ChatGPT.

**Status:** application built and locally tested; Cloudflare account connection, database migration, public deployment and browser QA are still pending. No paid service has been started. See [free deployment instructions](docs/CLOUDFLARE.md).

The Node 24 + local SQLite adapter remains available for local development without installed packages.

## Run locally

```sh
cd leche
npm start
```

Open http://127.0.0.1:3000. Development with restart-on-edit: `npm run dev`.

The current Codex session denies local server ports. The server launch was therefore blocked here; run the command in your regular terminal. The actual request handlers and SQLite database were tested without a network listener.

## Included

| Route | Purpose |
|---|---|
| `/` | Editorial homepage, hand/glass hero, introduction and CHERRY 01 tease |
| `/first-taste` | Original bottle reference, concept story, manicure/pedicure gallery, development details |
| `/world` | Brand philosophy, original wordmark campaign, editorial image story and sharing |
| `/early-access` | Email signup, optional preferences, hypothetical price/intent poll and nonbinding reservation |
| `/privacy` | Current data practices and same-browser unsubscribe |
| `/contact` | Official Instagram contact |

Custom 404, responsive navigation, reduced-motion support, labeled forms, status messages, keyboard focus, SEO metadata, Open Graph, robots and sitemap are included. All source imagery is unchanged in `public/assets/`. Only approved six-post campaign assets appear publicly; the other supplied files remain available as references.

## Actual early-access behavior

1. `POST /api/signup` validates email and explicit consent, checks origin, limits request size, checks honeypot and rate limits, then saves a unique email with timestamped consent and bounded attribution.
2. The server returns success only after the database operation. Existing emails are deduplicated; their preferences cannot be edited by merely entering the address again.
3. A 30-day HttpOnly / SameSite=Strict cookie grants editing access for the newly created record in that browser. HTTPS production cookies also use Secure.
4. `POST /api/survey` saves optional flavor, hypothetical USD price, purchase intent and nonbinding reservation separately. Updates do not inflate response or reservation counts.
5. Cloudflare records persist in D1 across deploys. The local Node adapter stores records in `data/leche.sqlite`, ignored by Git. Use the correct operator tools for the chosen backend.
6. `/privacy` can unsubscribe the current browser’s signup. Other access, correction, unsubscribe and deletion requests go through @tasteleche and require operator identity verification.

There is **no payment, order, allocation, inventory, manufactured product, validated formula, confirmed launch date or email verification/delivery integration**. Signups are unverified opt-ins. No confirmation email is promised or sent. A mailing provider can import the CSV after operational setup; only active consenting records may receive updates, and every email must support unsubscribe. Resubscription or cross-device edits require an identity-verified operator workflow until an email-verification provider is added.

## Review and export

For Cloudflare D1 use the owner dashboard or the authenticated API described in [CLOUDFLARE.md](docs/CLOUDFLARE.md). The following CLI commands apply **only to the local Node database**:

```sh
npm run stats
node scripts/admin.mjs export /absolute/private/location/leche-leads.csv
node scripts/admin.mjs backup /absolute/private/location/leche-backup.sqlite
node scripts/admin.mjs unsubscribe person@example.com
node scripts/admin.mjs delete person@example.com --confirm
```

The export contains consent, attribution, email verification status, unsubscribe date and optional research. **Filter out `unsubscribed_at` rows before any mailing.** Files are created with owner-only permissions; export refuses to overwrite an existing file. CSV formula prefixes are escaped. Delete permanently removes the lead and associated session/survey; aggregated nonidentifying metrics remain.

For a read-only admin API, set a random `ADMIN_TOKEN` of at least 32 characters and use `Authorization: Bearer <token>` for `/api/admin/stats` or `/api/admin/export`. The API is disabled when the token is missing/short. Never put this token in browser code, query strings or Git.

Metrics distinguish raw page/product/share events, opt-ins, verified opt-ins (currently zero), survey responses and nonbinding reservations. Pageviews are not unique people. Do not interpret stated intent or an unverified email as a purchase.

## Host independently for $0

Follow [docs/CLOUDFLARE.md](docs/CLOUDFLARE.md). `wrangler.jsonc` uses the same pages and assets with the Worker backend in `src/worker.mjs` and persistent D1 storage in `src/d1-store.mjs`. Keep Workers and D1 on their free plans. Do not activate billing or buy a domain.

The earlier paid Render proposal was not deployed and `render.yaml` is now disabled. Docker and the local Node server are optional development/self-hosting adapters, not required for Cloudflare.

## Checks

```sh
npm run check
npm test
```

Tests invoke the real Node and Worker handlers without opening a port. Worker tests use actual SQLite SQL through a D1 binding adapter and cover atomic rollback and concurrent duplicate signups. They also exercise: validation, consent, CSRF/origin checks, honeypot, deduplication, record ownership, survey enum checks, idempotency, restart persistence, unsubscribe, protected CSV, deletion, rate limits, DNT, production metadata and secure cookies. They use temporary databases and never seed production leads.

**Not completed here:** live HTTP/browser tests, mobile screenshots, Lighthouse/axe, Docker build, public deployment/domain, email provider and email verification. Browser QA was blocked by session network/preview policy. These are verification/setup limitations, not simulated integrations.

Before public launch, run the app and test 375px/390px/768px/1440px layouts, keyboard/menu behavior, missing/invalid consent, actual signup/reload/survey/unsubscribe, network failure and share behavior. Confirm the real contact/operator privacy details and hosting data location. No legal or formulation readiness is implied by this build.

## Source map

- `src/pages.mjs` — server-rendered page content and metadata
- `public/styles.css` — responsive art direction and interaction styles
- `public/app.js` — accessible forms, navigation, sharing and minimal measurement
- `src/server.mjs` — HTTP/static routes, API validation, headers and authorization
- `src/store.mjs` — local Node SQLite adapter
- `src/worker.mjs` — public Cloudflare request handler
- `src/d1-store.mjs` — persistent D1 records, sessions, aggregation and export
- `migrations/0001_early_access.sql` — D1 schema, applied before live signup testing
- `scripts/admin.mjs` — private operator workflow
- `test/app.test.mjs` — request-handler and persistence checks
- `docs/` — original kit instructions; `DECISIONS.md` — implementation decisions and status

No third-party runtime packages are used. Supplied campaign/brand assets belong to the user and are not relicensed by this application.

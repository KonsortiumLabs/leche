# LÈCHE — independent digital flagship

A complete, server-rendered website and database-backed early-access application. It runs on Node.js 24+ with no installed packages, build service, ChatGPT account, Sites hosting, paid API or frontend framework required.

## Run

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
5. Records survive process restart in `data/leche.sqlite`. The database directory is private and ignored by Git. It must be retained and backed up by the hosting operator.
6. `/privacy` can unsubscribe the current browser’s signup. Other access, correction, unsubscribe and deletion requests go through @tasteleche and require operator identity verification.

There is **no payment, order, allocation, inventory, manufactured product, validated formula, confirmed launch date or email verification/delivery integration**. Signups are unverified opt-ins. No confirmation email is promised or sent. A mailing provider can import the CSV after operational setup; only active consenting records may receive updates, and every email must support unsubscribe. Resubscription or cross-device edits require an identity-verified operator workflow until an email-verification provider is added.

## Review and export

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

## Host independently

`render.yaml` provides a proposed one-service Render deployment with a 1 GB persistent disk. It has not been applied and no hosting charge has been authorized. After the source is in its own GitHub repository, a Render Blueprint can deploy it and provide a public HTTPS address. The app reads Render's automatic `RENDER_EXTERNAL_URL`; no domain purchase is needed. The configured disk preserves signups across deploys. Browser sign-in/account authorization is still needed for GitHub repository creation and Render deployment.

Use any Node 24 host with a **persistent local disk**, or a single Docker container with a persistent volume. This SQLite build is not for ephemeral serverless functions or multiple independent replicas.

```sh
cp .env.example .env
# Edit .env with your real SITE_URL, then:
node --env-file=.env src/server.mjs
```

For Docker:

```sh
SITE_URL=https://YOUR-CONFIRMED-DOMAIN docker compose up -d --build
```

Replace the example with an origin you own. Put a TLS reverse proxy in front of the loopback-bound port 3000. Set `TRUST_PROXY=true` only if that proxy overwrites X-Forwarded-For and the application cannot be reached directly. Otherwise leave it false; rate limiting will apply to the proxy as a whole. Persist `/app/data`; schedule encrypted/offsite backups with the `backup` command. Docker image creation was not run in this restricted session.

`SITE_URL` controls canonical URLs, social image URLs, sitemap and accepted form Origin. Production refuses to run without an HTTPS origin. Without a configured origin, local pages are noindex and robots disallows crawling. Configure the actual origin before public launch; do not invent domain ownership.

## Checks

```sh
npm run check
npm test
```

Tests invoke the real HTTP handler without opening a port and exercise SQLite: validation, consent, CSRF/origin checks, honeypot, deduplication, record ownership, survey enum checks, idempotency, restart persistence, unsubscribe, protected CSV, deletion, rate limits, DNT, production metadata and secure cookies. They use temporary databases and never seed production leads.

**Not completed here:** live HTTP/browser tests, mobile screenshots, Lighthouse/axe, Docker build, public deployment/domain, email provider and email verification. Browser QA was blocked by session network/preview policy. These are verification/setup limitations, not simulated integrations.

Before public launch, run the app and test 375px/390px/768px/1440px layouts, keyboard/menu behavior, missing/invalid consent, actual signup/reload/survey/unsubscribe, network failure and share behavior. Confirm the real contact/operator privacy details and hosting data location. No legal or formulation readiness is implied by this build.

## Source map

- `src/pages.mjs` — server-rendered page content and metadata
- `public/styles.css` — responsive art direction and interaction styles
- `public/app.js` — accessible forms, navigation, sharing and minimal measurement
- `src/server.mjs` — HTTP/static routes, API validation, headers and authorization
- `src/store.mjs` — SQLite schema, durable records, sessions, aggregation and export
- `scripts/admin.mjs` — private operator workflow
- `test/app.test.mjs` — request-handler and persistence checks
- `docs/` — original kit instructions; `DECISIONS.md` — implementation decisions and status

No third-party runtime packages are used. Supplied campaign/brand assets belong to the user and are not relicensed by this application.

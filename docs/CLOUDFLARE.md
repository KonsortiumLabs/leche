# LÈCHE: free public deployment

Budget is strictly $0. Stay on **Workers Free** and **D1 Free**. Do not enter a
card, upgrade a plan, purchase a domain, or enable paid add-ons. Use the included
workers.dev address. Free quotas are finite: when exhausted, requests can fail
until the quota resets. This is preferable to billing under the user's constraint.

## Account and deployment

1. Sign in to the owner's Cloudflare account. Create/use a Workers Free account.
2. Connect only `KonsortiumLabs/leche` if GitHub integration is used. Review the
   GitHub permission grant with the owner. Name the Worker `leche`, branch `main`.
3. Set the build environment's `NODE_VERSION` to `24.15.0` for the Node SQLite tests.
   Build command: `npm run check && npm test`. Deploy command:
   `npm run deploy:cloudflare`. Leave non-production/branch builds disabled so
   previews do not connect to the production signup database.
4. `wrangler.jsonc` declares a `DB` binding named `leche-signups`. Modern Wrangler
   can create this D1 database on first deployment when its ID is omitted. Use
   only the free D1 plan. If automatic provisioning is unavailable, create the
   database in the dashboard and add its actual `database_id` to the config.
5. Apply `migrations/0001_early_access.sql` to **that exact D1 database**, using the
   D1 console or `npm run migrate:cloudflare` after adding its actual database ID
   to `wrangler.jsonc`. Do not guess IDs. Automatic creation alone does not apply
   the schema. Until the migration is applied, signup requests correctly fail.
6. Verify `/api/health` returns `{"status":"ok"}`. Verify all four pages and the
   supplied images on the assigned HTTPS URL. Set `SITE_URL` only when a verified
   custom domain is added; otherwise the Worker uses the request's own origin.
7. Run a clearly labeled test signup, survey, reload, export and unsubscribe.
   Remove the test record through the operator console after explicit approval.
   Confirm actual mobile layout, navigation, keyboard use and share behavior.

Wrangler's automatic provisioning preserves bindings across later deploys even
if the ID isn't committed, but D1 migration CLI commands may still require it.
Record the real ID in the config after provisioning; it is an identifier, not a
secret. Never commit API tokens, admin tokens, cookies or signup records.

## Operator access

The Cloudflare D1 console gives the owner access to the `leads`, `surveys`,
`sessions` and aggregate `metrics` tables. `internal_settings` holds the private
rate-limit key and must not be included in public exports.

For the existing read-only CSV/stats API, generate a random secret with at least
32 characters and store it as the Worker's encrypted `ADMIN_TOKEN` secret.
Send it only in an `Authorization: Bearer ...` header. Without this secret the
API stays disabled; the D1 console remains available.

- Export: `GET /api/admin/export` (CSV, formula prefixes escaped).
- Summary: `GET /api/admin/stats` (opt-ins, surveys, stated interest, event totals).
- Filter out `unsubscribed_at` records before any mailing.
- Email addresses are unverified and no automated email is sent.
- Deletion is an operator action; verify ownership before deleting a lead. D1
  foreign keys cascade deletion to its sessions and survey.
- Retain private backups using D1 export/Time Travel tools, within free limits.

The local `scripts/admin.mjs` CLI manages **only the local Node SQLite database**.
It does not read or change Cloudflare D1.

## Verification limits

Local tests call the actual Worker handler and execute its SQL against SQLite
through a D1-compatible test adapter. They cover persistence, concurrency,
transaction rollback, consent, deduplication, ownership, surveys, unsubscribe,
rate limiting, private export, request validation and honest failure responses.
Wrangler bundling, the real D1 deployment, browser layout and public signup still
need to be verified after account access. Do not report these as complete.

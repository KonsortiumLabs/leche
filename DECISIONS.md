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

- Dependency-free Node 24 server-rendered application with SQLite. No ChatGPT runtime, login or hosting dependency. The recommended Next.js stack was not mandatory; package network access was unavailable and a native runtime allows complete persistent functionality without third-party credentials.
- Current UI colors: warm ivory #f3eade, wine #4b0d1b, champagne blush #e3c8bf. Supporting typography uses the locally available Helvetica Neue / Arial stack. No substitute font is used as the logo.
- Logo uses the exact original raster in a CSS crop of the surrounding blank canvas. No tracing, vectorization, regeneration or edited raster was made. Original bytes are retained.
- Homepage leads with the hand/glass campaign and concise concept explanation; First Taste uses the exact bottle and manicure/pedicure images; The World carries the original wordmark campaign and editorial imagery. Mouth/cherry imagery appears once in The World.
- Third-row candidate imagery remains included in source assets for review but is not published in the visitor experience. Reference screenshots/moodboards are not presented as actual posts, metrics or products.
- All records are stored locally in a private SQLite database, suitable for one persistent Node instance or container volume. Do not deploy this design to ephemeral filesystem/serverless hosting.
- Signup requires explicit email consent. Surveys and nonbinding reservations are optional. Email addresses are unverified; they are never counted as confirmed customers or sales.
- Duplicate signup returns a generic response. Only an opaque, HttpOnly session issued for a newly created lead permits survey edits. Typing an existing email cannot obtain editing access. Unsubscribed addresses are not silently reactivated.
- The operator can review/export data through a local CLI or optional bearer-protected read-only API. No public admin account or guessed credentials.
- Analytics store daily event totals; no third-party scripts, analytics cookies or visitor identifiers. DNT and GPC suppress client measurement. First-touch campaign data uses tab-scoped session storage; server strips full referrer/query information.
- Official contact is Instagram @tasteleche. No domain, business email or address is invented.

## Verification status

- Syntax checks passed.
- Automated request-handler tests passed against actual SQLite persistence, including closing/reopening the database. Tests deliberately avoid socket binding because this session prohibits it.
- All 15 source assets were inspected visually before implementation, as was the asset board. Source-byte equality is checked by the asset audit.
- Live server launch was attempted but the environment denied listening on 127.0.0.1 (EPERM).
- Browser visual QA was attempted; local file preview was blocked by browser policy. No browser screenshot, Lighthouse score or completed mobile/browser test is claimed.
- Public hosting/domain connection, email delivery/verification, actual browser QA and production traffic testing remain outstanding.

## Independent public deployment preparation — 2026-11-11

- User explicitly requested a public, shareable running website.
- Prepared a Render Blueprint for one Node 24 service with a 1 GB persistent volume. This is a proposed paid deployment, not an applied resource or accepted charge.
- The application accepts Render's documented RENDER_EXTERNAL_URL as its canonical/form origin when SITE_URL is not set. This avoids hardcoding or inventing a deployment URL.
- Render-specific deployment trusts its documented X-Forwarded-For header. Do not reuse TRUST_PROXY=true on directly exposed untrusted servers.
- GitHub connector identifies KonsortiumLabs but exposes no repository-creation action. The browser is signed out of GitHub and Render, so creation, upload and deployment are waiting for account access. Existing unrelated repositories were not modified.

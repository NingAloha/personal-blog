# Cloudflare-native application

This directory contains the Cloudflare Worker application and its production
D1/R2 integration. The Express/Caddy/VPS deployment remains a potential rollback
origin and is not a target of the current CI/CD workflow. The old Preview
configuration remains in Wrangler for now, but the preview website is being
retired; no preview URL is advertised as an active site.

## Architecture

```text
Markdown migration source
  -> repeatable importer
  -> D1: article identity, localized metadata, Markdown body
  -> R2: media under deterministic content/... keys

Browser or crawler
  -> Cloudflare Worker
       -> Workers Static Assets for the Vue client
       -> D1 for content, localization, and visitor counters
       -> R2 for /api/media/content/...
       -> D1-backed HTML metadata and sitemap
```

The importer is a migration tool, not a CMS. It accepts `--content-root`, so a
future export directory may live outside this Git repository. It never modifies
or deletes source Markdown or media.

## D1 content model

Migration `migrations/0001_content.sql` creates:

- `articles`: stable ID (`<type>:<slug>`), content type, and base slug.
- `article_variants`: one `zh` or `en` row per article, containing the original
  front matter as JSON, Markdown body, featured flag, sortable date, and source
  hash used by idempotent upserts.

English requests prefer `en` and fall back to `zh`; Chinese requests use `zh`
only. Lists preserve the current featured-first and date sorting behavior.

## R2 media

A source asset such as
`content/tech-blogs/example/assets/image.png` uses that same deterministic R2
key. Stored Markdown refers to `/api/media/content/...`; API and rendered HTML
materialize it against the Worker origin. MIME metadata is preserved. The
Worker rejects traversal, backslashes, NUL bytes, empty segments, and keys
outside `content/`.

## Visitor statistics

Migration `migrations/0002_statistics.sql` adds site/article counters and
ten-minute visit deduplication. Only a keyed HMAC of request scope, IP, and user
agent is stored; raw IP addresses are never persisted. Language siblings share
the base-slug counter. VPS production statistics are not imported automatically.

`STATS_HASH_SECRET` must be configured as a Wrangler secret in production. Do
not put it in committed configuration or an environment file.

## Static frontend and dynamic SEO

`npm run build:frontend:production` builds the production frontend with
production metadata and indexing policy. The legacy preview build remains
available in package scripts until its environment is retired. Builds use same-origin
`/api` requests and exclude local Markdown, legacy generated sitemaps, and
production-only public files. The Worker injects D1-backed titles,
descriptions, canonical and alternate links, language metadata, JSON-LD, and
rendered Markdown into navigation responses. `/sitemap.xml` is generated from
the active D1 variants, so content changes do not require a Git commit or
frontend rebuild.

If a non-production preview is deployed in the future, it must retain
`PREVIEW_MODE=true`, `X-Robots-Tag: noindex, nofollow`, and a disallow-all
`robots.txt`.

## Local development

Node.js 22 or later is required.

```bash
cd cloudflare
npm ci
npm run db:migrate:local
npm run content:validate
npm run content:import:local

# Put a disposable STATS_HASH_SECRET in an ignored .dev.vars file first.
npm run dev
```

The complete site is then served at `http://127.0.0.1:8787`. Supply an external
content directory with `--content-root` when the ignored root `content/`
directory is not present. Local Wrangler state, `.dev.vars*`, `.env*`,
credentials, account selection, and content sources are ignored by Git. The
ordinary frontend `npm run build` and Express server are retained only for the
VPS rollback path.

## Repeatable content import

```text
node scripts/import-content.mjs --dry-run [--content-root PATH]
node scripts/import-content.mjs --local [--persist-to PATH] [--content-root PATH]
node scripts/import-content.mjs --remote --confirm-remote \
  --env production --bucket personal-blog-content-production [--content-root PATH]
```

The importer scans all content before writing. Missing files, unsafe paths,
duplicate variants, and parsing failures include source filenames. Media is
uploaded first; D1 changes use deterministic primary keys and conditional
upserts. Repeated runs overwrite the same R2 keys and do not create duplicate
D1 rows. Inline Markdown images are rewritten; external/data URLs are left
unchanged.

## Production deployment

Cloudflare dynamic SEO, D1 content, and R2 media are authoritative for the
public Production site. Repository sitemap/prerender scripts remain available
only for the unchanged VPS rollback origin.

The production frontend is built using:

```text
npm run build:frontend:production
```

After creating and binding isolated Production D1/R2 resources, initialize and
validate them before attaching the root domain:

```text
npx wrangler d1 migrations apply CONTENT_DB --remote --env production
node scripts/import-content.mjs --remote --confirm-remote \
  --env production --bucket personal-blog-content-production
npm run deploy:production
```

Set `STATS_HASH_SECRET` with `wrangler secret put` and seed any approved legacy
counter values directly in Production D1. Keep the
VPS and its DNS values available until the Cloudflare deployment has been
validated and the root-domain cutover is explicitly approved.

Production currently uses **Worker Custom Domains** (`custom_domain: true`),
not Worker Routes. A Custom Domain may manage DNS records, so removing the
Wrangler route declarations alone is **not** a verified rollback to the VPS.
Before changing domain attachment, record the current zone's DNS settings and
prepare a manual rollback: remove the Worker Custom Domain association when
appropriate, restore the intended proxied VPS origin DNS records, then verify
both apex and `www` over HTTPS. Actual DNS / custom-domain state must be checked
in the Cloudflare dashboard; deployment configuration alone does not establish
what is currently live. Do not delete the VPS until cutover and rollback have
been independently tested.

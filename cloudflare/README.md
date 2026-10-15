# Cloudflare-native application

This directory documents the Cloudflare Worker, D1, and R2 implementation used by the production website.

## Architecture

```text
Optional local content source
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

The importer is an optional data import tool, not a CMS. It accepts `--content-root`, so a
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
the base-slug counter.

`STATS_HASH_SECRET` must be configured as a Wrangler secret in production. Do
not put it in committed configuration or an environment file.

## Static frontend and dynamic SEO

`npm run build:frontend:production` builds the production frontend with
production metadata and indexing policy. Builds use same-origin `/api` requests and exclude local Markdown and generated sitemaps. The Worker injects D1-backed titles,
descriptions, canonical and alternate links, language metadata, JSON-LD, and
rendered Markdown into navigation responses. `/sitemap.xml` is generated from
the active D1 variants, so content changes do not require a Git commit or
frontend rebuild.

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
credentials, account selection, and content sources are ignored by Git. 

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
public Production site. 

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

Set `STATS_HASH_SECRET` with `wrangler secret put` (never commit the secret).

Production uses **Worker Custom Domains** (`custom_domain: true`) for `ningaloha.com` and `www.ningaloha.com`. Verify domain associations and resource bindings in Cloudflare when changing the deployment.

The CI workflow deploys application code and static assets only. Apply D1 schema migrations manually when the schema changes, and manage published content independently in D1/R2. The web-based `/admin` editor has not yet been implemented.

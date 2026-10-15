# Cloudflare-native Preview

This directory contains the independently deployable Cloudflare Preview stack.
The Express/Caddy/VPS production deployment remains a separate build and is not
replaced by these commands.

## Architecture

```text
Markdown migration source
  -> repeatable importer
  -> D1: article identity, localized metadata, Markdown body
  -> R2: media under deterministic content/... keys

Browser or crawler
  -> one Preview Worker at test.ningaloha.com
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
the base-slug counter. Preview counters are isolated and VPS production
statistics are not imported automatically.

`STATS_HASH_SECRET` must be a Wrangler secret in each deployed environment. Do
not put it in committed configuration or an environment file.

## Static frontend and dynamic SEO

`npm run build:frontend` runs Vite in `cloudflare-preview` mode. The output uses
same-origin `/api` requests and excludes repository Markdown, generated VPS
sitemaps, and production-only public files. The Worker injects D1-backed titles,
descriptions, canonical and alternate links, language metadata, JSON-LD, and
rendered Markdown into navigation responses. `/sitemap.xml` is generated from
the active D1 variants, so content changes do not require a Git commit or
frontend rebuild.

Preview responses include `X-Robots-Tag: noindex, nofollow`; Preview
`robots.txt` disallows all crawling. This is controlled by `PREVIEW_MODE` and
must remain enabled on `test.ningaloha.com`.

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

The complete site is then served at `http://127.0.0.1:8787`. Local Wrangler
state, `.dev.vars*`, `.env*`, credentials, and account selection are ignored by
Git. The ordinary frontend `npm run build` and Express server remain the VPS
path.

## Repeatable content import

```text
node scripts/import-content.mjs --dry-run [--content-root PATH]
node scripts/import-content.mjs --local [--persist-to PATH] [--content-root PATH]
node scripts/import-content.mjs --remote --confirm-remote \
  --env preview --bucket personal-blog-content-preview [--content-root PATH]
```

The importer scans all content before writing. Missing files, unsafe paths,
duplicate variants, and parsing failures include source filenames. Media is
uploaded first; D1 changes use deterministic primary keys and conditional
upserts. Repeated runs overwrite the same R2 keys and do not create duplicate
D1 rows. Inline Markdown images are rewritten; external/data URLs are left
unchanged.

## Preview deployment

Account selection is local-only:

```dotenv
# cloudflare/.env.preview.local (ignored)
CLOUDFLARE_ACCOUNT_ID=<selected-account-id>
```

Before deploying, verify that this account owns the `ningaloha.com` zone and
that `test.ningaloha.com` has no conflicting DNS record. Never attach the root
domain from Preview.

```bash
cd cloudflare
npx wrangler whoami
npx wrangler d1 migrations apply CONTENT_DB --remote --env preview
node scripts/import-content.mjs --remote --confirm-remote \
  --env preview --bucket personal-blog-content-preview
openssl rand -hex 32 | npx wrangler secret put STATS_HASH_SECRET --env preview
npm run deploy:preview
```

Existing Preview resources:

- Worker: `personal-blog-content-api-preview`
- D1: `personal-blog-content-api-preview-content-db`
- R2: `personal-blog-content-preview`
- Website: `https://test.ningaloha.com`

The production Worker, database, and bucket are not created or modified by
these Preview commands. Never target the unrelated `matrix-media` bucket.

## Production boundary

Repository sitemap/prerender scripts remain authoritative for the current VPS
site and are intentionally unchanged. Cloudflare dynamic SEO is authoritative
only for the Cloudflare deployment. Promoting it to `ningaloha.com`, importing
VPS statistics, enabling indexing, or retiring Express/Caddy are separate
future decisions requiring explicit review.

# Cloudflare-native content pipeline

This directory is an independently testable content path for Cloudflare D1, R2,
and Workers. It does not replace the existing Express/VPS deployment unless the
frontend is explicitly built with `VITE_CONTENT_API_BASE_URL`.

## Architecture

```text
Markdown import source
  -> importer (safe front matter parsing + validation)
  -> D1: article identity, localized metadata, Markdown body
  -> R2: referenced media under deterministic content/... keys

Vue frontend
  -> Worker read-only content API
       -> D1 for lists and article bodies
       -> R2 for /api/media/content/...
  -> existing Express API for visitor statistics
```

The importer is a migration tool, not a CMS. It accepts `--content-root`, so a
future writing/export directory can live outside this Git repository. It never
modifies or deletes source Markdown or source media.

## D1 model

Migration `migrations/0001_content.sql` creates two tables:

- `articles`: stable ID (`<type>:<slug>`), content type, and base slug.
- `article_variants`: one `zh` or `en` row per article, containing the original
  front matter as JSON, Markdown body, featured flag, sortable date, and a
  source hash used by idempotent upserts.

The Worker groups variants by base slug. English requests prefer `en` and fall
back to `zh`; Chinese requests use `zh` only. List sorting uses the selected
variant's `featured`, then `date` or `startDate`, matching the existing content
repository.

## R2 keys and media URLs

A source asset such as:

```text
content/tech-blogs/example/assets/image.png
```

uses the same deterministic R2 key:

```text
content/tech-blogs/example/assets/image.png
```

The stored Markdown refers to `/api/media/content/...`. When returning article
content, the Worker expands that path against its request origin, so a frontend
can use a separate Worker domain without hardcoded domains in D1. R2 object
metadata preserves the detected MIME type. The Worker rejects encoded or plain
`.` / `..`, backslashes, NUL bytes, empty path segments, and keys outside the
`content/` namespace.

## Local development

Requires Node.js 22 or later.

```bash
cd cloudflare
npm ci

# Create/update the local D1 schema.
npm run db:migrate:local

# Validate all content without changing D1 or R2.
npm run content:validate

# Import into local D1 and R2. It is safe to repeat this command.
npm run content:import:local

# Serve the Worker at http://127.0.0.1:8787.
npm run dev
```

In another terminal, opt the frontend into the Worker content API:

```bash
# From the repository root:
cp frontend/.env.cloudflare.example frontend/.env.cloudflare.local
# Replace the example URL with the local Worker or deployed preview Worker URL.
cd frontend
npm run dev -- --mode cloudflare

# Produce a Cloudflare-backed client bundle.
npm run build:client -- --mode cloudflare
```

The default frontend configuration remains `/api`, so ordinary builds and the
existing VPS deployment are unchanged. Statistics intentionally continue to use
the Express `/api/stats/*` endpoints; run the Express backend as usual if local
view counters are needed.

Local Wrangler state is stored under `cloudflare/.wrangler/` and is ignored by
Git.

## Import command

```text
node scripts/import-content.mjs --dry-run [--content-root PATH]
node scripts/import-content.mjs --local [--persist-to PATH] [--content-root PATH]
node scripts/import-content.mjs --remote --confirm-remote \
  --env preview --bucket personal-blog-content-preview \
  [--content-root PATH]
```

The command scans all three content types before writing anything. Missing
files, unsafe paths, duplicate variants, and parsing failures are reported with
their source filenames. Media is uploaded first; D1 changes are then submitted
as one Wrangler import file using deterministic primary keys and conditional
upserts. Do not wrap that file in explicit `BEGIN` / `COMMIT` statements: remote
D1 imports reject SQL-managed transactions and provide their own rollback
behavior.
Repeated runs overwrite the same R2 keys and do not create duplicate D1 rows.

The importer currently rewrites inline Markdown image syntax (`![alt](path)`),
which covers all images in the current content set. External and data URLs are
left unchanged. Unknown local file extensions are uploaded as
`application/octet-stream`.

## Remote preview setup

Remote setup requires the repository owner to authenticate Wrangler and create
Cloudflare resources. OAuth credentials and account IDs are not stored in the
repository. When one login belongs to multiple Cloudflare accounts, select the
target account in an ignored local file:

```dotenv
# cloudflare/.env.preview.local
CLOUDFLARE_ACCOUNT_ID=<selected-account-id>
```

From `cloudflare/`:

```bash
npx wrangler login
npx wrangler whoami
npx wrangler r2 bucket create personal-blog-content-preview --env preview
npx wrangler deploy --env preview
npx wrangler d1 migrations apply CONTENT_DB --remote --env preview
node scripts/import-content.mjs --remote --confirm-remote \
  --env preview --bucket personal-blog-content-preview
```

The initial D1 binding omits a resource ID so Wrangler can provision the
environment's database during the first authorized deploy. Wrangler then writes
the non-secret D1 database ID into the preview binding. The named preview R2
bucket must exist before deploy.

The current preview deployment uses:

- Worker: `personal-blog-content-api-preview`
- D1: `personal-blog-content-api-preview-content-db`
- R2: `personal-blog-content-preview`
- URL: `https://personal-blog-content-api-preview.89t6jf6p9b.workers.dev`

The production Worker, D1 database, and R2 bucket have not been created. Use the
`production` environment only after preview acceptance and an explicit
production migration decision.

Do not commit Wrangler credentials, `.env*`, `.dev.vars*`, generated local
state, or a frontend `.env.cloudflare.local` file.

## SEO boundary

The current sitemap and static prerender scripts still read repository Markdown
at build time. They were deliberately left unchanged to keep the VPS release
pipeline working. A Cloudflare-backed client can retrieve fresh D1 content after
loading, but build-time HTML, sitemap routes, and metadata will become stale once
D1 is the source of truth.

Before production migration, choose and verify one SEO strategy, for example a
read-only content snapshot/export consumed during builds or Cloudflare-side SSR.
Do not remove repository content or claim SEO parity until that work is tested.

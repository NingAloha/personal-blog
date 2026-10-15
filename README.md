# Personal Blog

NingAloha 的个人网站源码，使用 Vue 3、Vite 与 Cloudflare Workers Static
Assets。线上文章与元数据存储在 Cloudflare D1，文章图片和媒体存储在 R2。

- Production: <https://ningaloha.com>
- Preview: <https://test.ningaloha.com>

## Architecture

```text
Browser or crawler
  -> Cloudflare Worker
       -> Vue static assets
       -> read-only content and statistics APIs
       -> D1 article variants, Markdown, metadata, and counters
       -> R2 article media
       -> D1-backed article HTML, metadata, robots.txt, and sitemap.xml
```

Chinese and English variants share one base slug and one article counter.
English requests prefer the English variant and fall back to Chinese when it is
missing.

The previous Express/Caddy/VPS deployment is retained as a rollback origin. It
is not deleted, modified, or deployed by the current GitHub Actions workflow.

## Repository boundary

This repository contains application source code, tests, migrations, and
deployment configuration only. Article Markdown and article media are not
tracked by Git. The root `content/` directory is ignored and may be used only as
a local migration source.

The authoritative production content lives in D1 and R2. Application deployment
does not import, overwrite, or delete content.

```text
personal-blog/
├── frontend/              # Vue application
├── backend/               # retained Express implementation and repository tests
├── cloudflare/            # Worker, D1 migrations, R2 importer, tests, Wrangler config
├── scripts/               # retained legacy build and VPS rollback utilities
├── .github/workflows/     # verification and Cloudflare application deployment
└── content/               # optional local source, ignored by Git
```

Original personal writing and media remain excluded from the MIT License; see
[CONTENT_COPYRIGHT.md](./CONTENT_COPYRIGHT.md).

## Local development

Node.js 22 or later is required.

```bash
cd frontend && npm ci
cd ../backend && npm ci
cd ../cloudflare && npm ci

npm run db:migrate:local
node scripts/import-content.mjs --local \
  --content-root /absolute/path/to/content

# Put a disposable STATS_HASH_SECRET in an ignored .dev.vars file first.
npm run dev
```

The complete Cloudflare application is then available at
`http://127.0.0.1:8787`. Local Wrangler state, environment files, account
selection, build output, dependencies, and `content/` are ignored by Git.

The retained Express backend can still be run locally when an external
`content/` directory is present, but it is no longer the production application
deployment target.

## Content migration

The importer accepts an explicit external source directory and never modifies
or deletes its Markdown or media files:

```bash
cd cloudflare

node scripts/import-content.mjs --dry-run \
  --content-root /absolute/path/to/content

node scripts/import-content.mjs --remote --confirm-remote \
  --env preview \
  --bucket personal-blog-content-preview \
  --content-root /absolute/path/to/content
```

Production imports are deliberately manual and must explicitly target the
Production environment and bucket. Repeated imports use deterministic D1 keys
and R2 object keys and do not create duplicate articles.

See [cloudflare/README.md](./cloudflare/README.md) for schema, media rules,
Preview/Production resources, and rollback procedures.

## Continuous integration and deployment

`.github/workflows/ci.yml` has two boundaries:

- Every branch push and pull request installs dependencies, runs Express and
  Cloudflare tests, builds the Production Cloudflare frontend, verifies its
  indexing metadata, and runs a Wrangler deployment dry-run.
- Only a successful `main` push, or a manual dispatch on `main`, applies pending
  D1 schema migrations and deploys the Worker and Static Assets.

CI never imports article content, uploads R2 media, connects to the VPS, or
removes the VPS service. Production deployment requires these GitHub Actions
secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Neither value belongs in Git, Wrangler configuration, workflow logs, or local
tracked files.

## Validation

```bash
cd backend && npm test
cd ../cloudflare && npm test
npm run build:frontend:production
npx wrangler deploy --dry-run --env production \
  --outdir .wrangler/dry-run-production
```

Production uses Worker Routes for `ningaloha.com/*` and
`www.ningaloha.com/*`. The existing proxied DNS records continue pointing to the
VPS origin, which keeps rollback independent of DNS propagation. To roll back,
remove the two Production routes from `cloudflare/wrangler.jsonc` and redeploy;
requests then return to the unchanged VPS.

## License

Application source code and project documentation are available under the MIT
License. Original personal writing, article media, and the personal avatar are
not covered by that license; see [CONTENT_COPYRIGHT.md](./CONTENT_COPYRIGHT.md).

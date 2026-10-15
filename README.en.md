# Personal Blog

**Language: [简体中文](./README.md) | English**

Source code for NingAloha's personal website, built with Vue 3, Vite, Cloudflare Workers, and Workers Static Assets. Article content, metadata, and visit counters are stored in Cloudflare D1; article media is stored in R2.

**Website:** https://ningaloha.com

## Architecture

```text
Visitor or search crawler
  → Cloudflare Worker
      ├─ Workers Static Assets: Vue frontend
      ├─ Content and statistics APIs
      ├─ D1: articles, translations, metadata, and visit counters
      ├─ R2: article images and media
      └─ Dynamic article HTML metadata, robots.txt, and sitemap.xml
```

Articles have Chinese (`zh`) and English (`en`) variants sharing the same base slug and visit counter. English requests fall back to Chinese when the English variant is missing; Chinese requests use the Chinese variant.

The previous Express/Caddy/VPS application remains available as a potential rollback origin. It is not deployed by the current GitHub Actions workflow.

## Separation of application and content

**This repository owns application code, not day-to-day article publishing.**

Only source code, tests, D1 schema migrations, and deployment configuration belong in Git. Production Markdown, metadata, and images live in D1/R2 independently of Git commits and application deployments.

The ignored `content/` directory is an optional local input for migrating older articles. The import script is a one-time/repeatable migration utility, **not a CMS**. A web-based `/admin` editor has **not** been built. Content can currently be managed manually through Cloudflare; Markdown media paths and R2 keys must remain consistent.

```text
personal-blog/
├── frontend/            # Vue frontend
├── backend/             # Retained Express implementation and tests (VPS fallback)
├── cloudflare/          # Worker, D1 migrations, R2 import tools, tests
├── scripts/             # Legacy build and VPS fallback utilities
├── .github/workflows/   # Verification and application deployment
└── content/             # Optional ignored local migration source
```

## Local development

Requires Node.js 22 or later.

```bash
cd frontend && npm ci
cd ../backend && npm ci
cd ../cloudflare && npm ci

npm run db:migrate:local
# Set a disposable STATS_HASH_SECRET in ignored cloudflare/.dev.vars
npm run dev
```

The local Cloudflare application runs at http://127.0.0.1:8787.

To import content from an external directory, prepare the source and run:

```bash
cd cloudflare
node scripts/import-content.mjs --dry-run --content-root /absolute/path/to/content
node scripts/import-content.mjs --local --persist-to .wrangler/state \
  --content-root /absolute/path/to/content
```

Local import does not modify production D1/R2. Keep credentials, environment files, local Wrangler state, build artifacts, and content sources out of Git. The retained Express server is for fallback testing, not production deployment.

See [Cloudflare technical documentation](./cloudflare/README.md) for schema, media paths, and operations.

## Continuous integration and deployment

[GitHub Actions](./.github/workflows/ci.yml) separates application releases from content changes:

- Branch pushes and pull requests: install dependencies, run Express/Worker tests, build the production frontend, and perform a Wrangler deployment dry run.
- Pushes to `main` and manual workflow dispatches on `main`: deploy the production Worker and Static Assets after verification.
- **CI does not automatically run production D1 schema migrations, import articles, upload R2 media, or change the VPS.** Apply schema changes separately when actually needed; publishing content does not require an application deployment.

Production deployment uses `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` GitHub Actions secrets. Never commit secrets or log their values.

### Manual verification

```bash
cd backend && npm test
cd ../cloudflare && npm test
npm run build:frontend:production
npx wrangler deploy --dry-run --env production \
  --outdir .wrangler/dry-run-production
```

## Domains and fallback

Production configures `ningaloha.com` and `www.ningaloha.com` as **Worker Custom Domains** (`custom_domain: true` in `cloudflare/wrangler.jsonc`), not ordinary Worker Routes.

Restoring the VPS requires checking the current Cloudflare Custom Domain associations and DNS records, removing the relevant association, restoring the correct VPS-origin DNS records, and validating HTTPS for both hostnames. **Deleting domain declarations from Wrangler is not a verified automatic rollback.**

## License

Application source code and project documentation are under the [MIT License](./LICENSE). Original writing, article media, and the personal avatar are **not** included in that license; see [CONTENT_COPYRIGHT.md](./CONTENT_COPYRIGHT.md).

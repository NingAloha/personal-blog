# Personal Blog

**Language: [简体中文](./README.md) | English**

NingAloha's personal website, built with Vue 3, Vite, Cloudflare Workers, and Workers Static Assets. Article Markdown, metadata, and visit statistics live in Cloudflare D1; article media lives in Cloudflare R2.

**Website:** https://ningaloha.com

## Architecture

```text
Visitors / search crawlers
    ↓
Cloudflare Worker
    ├── Workers Static Assets: Vue frontend
    ├── APIs: content retrieval, statistics, media
    ├── D1: articles, translations, metadata, visit counters
    ├── R2: article images and media
    └── Dynamic page metadata, robots.txt, sitemap.xml
```

Content supports Chinese (`zh`) and English (`en`) variants. The two variants share the same base slug and article visit counter. English requests fall back to Chinese when no English variant is available.

## Code and content separation

**GitHub manages application code; D1/R2 hold published content.**

Application deployment does not import, overwrite, or delete articles. Publishing or editing an article does not require committing Markdown files or deploying the Worker.

A web-based `/admin` editor has not been developed yet. Content can currently be managed in the Cloudflare dashboard. Media references in Markdown (`/api/media/content/...`) must match the corresponding R2 object keys.

The root `content/` directory is ignored by Git and may be used as an optional local import source. The import utility is not an online CMS.

Key directories:

```text
personal-blog/
├── frontend/             # Vue frontend
├── cloudflare/           # Worker, D1 schema, R2 import utilities and tests
├── .github/workflows/    # CI/CD
└── content/              # Optional ignored local content source
```

## Local development

Requires Node.js 22 or later.

```bash
cd frontend && npm ci
cd ../cloudflare && npm ci

npm run db:migrate:local
# Set a disposable STATS_HASH_SECRET in ignored cloudflare/.dev.vars
npm run dev
```

Open http://127.0.0.1:8787 to view the local application. Import sample content first if needed (see below).

Keep local Wrangler state, environment files, credentials, build outputs, and content sources out of Git.

## Content import (optional)

The importer accepts Markdown and media from a directory outside the repository. Production content remains authoritative in D1/R2. Validate the source before importing:

```bash
cd cloudflare
node scripts/import-content.mjs --dry-run --content-root /absolute/path/to/content
```

Import into the local simulated D1/R2 environment:

```bash
node scripts/import-content.mjs --local --persist-to .wrangler/state \
  --content-root /absolute/path/to/content
```

Production imports require an explicit environment and bucket selection and are not part of automatic deployment. See [Cloudflare technical documentation](./cloudflare/README.md).

## Tests and deployment

[GitHub Actions](./.github/workflows/ci.yml) installs dependencies, runs tests, builds the production frontend, and validates a Wrangler deployment. After verification, pushes or manual dispatches on `main` deploy the production Worker and Static Assets.

**CI does not run production D1 schema migrations, write article data, or upload R2 media.** Run schema migrations separately only when a real change is needed.

Production deployment uses GitHub Actions secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Never commit or log credentials.

### Manual verification

```bash
cd backend && npm test
cd ../cloudflare && npm test
npm run build:frontend:production
npx wrangler deploy --dry-run --env production \
  --outdir .wrangler/dry-run-production
```

## Domains

`ningaloha.com` and `www.ningaloha.com` are configured as **Worker Custom Domains** (`custom_domain: true`) in [Wrangler configuration](./cloudflare/wrangler.jsonc). Manage and verify production domain associations and resource bindings in Cloudflare.

## License

Application source code and project documentation are under the [MIT License](./LICENSE). Original writing, article media, and the personal avatar are not included; see [CONTENT_COPYRIGHT.md](./CONTENT_COPYRIGHT.md).

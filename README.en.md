<a id="top"></a>

<div align="center">
  <h1>Personal Blog</h1>
  <p>A bilingual personal website running entirely on Cloudflare.</p>
  <p><a href="https://ningaloha.com">Visit the site</a> · <a href="#quick-start">Run locally</a> · <a href="#publishing-content">Publish content</a> · <a href="./README.md">简体中文</a></p>
</div>

> This repository contains application code only. Published articles, media, and counters live in Cloudflare D1 and R2.

## Contents

- [Overview](#overview)
- [Stack and architecture](#stack-and-architecture)
- [Quick start](#quick-start)
- [Publishing content](#publishing-content)
- [Tests and deployment](#tests-and-deployment)
- [Operational boundaries](#operational-boundaries)
- [License](#license)

## Overview

The site presents projects, essays, and technical posts in Chinese and English.

- Chinese uses `<slug>.md`; English uses a sibling `<slug>.en.md`.
- Language variants share a base slug and article-view counter. English falls back to Chinese when no translation exists.
- The browser reads content through same-origin `/api`; the Worker dynamically provides crawler-facing metadata, article summaries, `robots.txt`, and `sitemap.xml`.
- Deploying application code never writes, overwrites, or removes published content.

## Stack and architecture

| Layer | Responsibility |
| --- | --- |
| Vue 3 + Vite | Browser UI and interaction |
| Cloudflare Worker | APIs, dynamic SEO HTML, robots, sitemap, and request routing |
| Workers Static Assets | Built Vue client |
| Cloudflare D1 | Article identity, variants, metadata, and visit counters |
| Cloudflare R2 | Images and media referenced by Markdown |
| GitHub Actions | Tests, production build, and Worker deployment |

```text
Visitor / crawler
  → Cloudflare Worker
    ├─ /api/*        → D1 and R2
    ├─ pages / SEO   → D1 + Workers Static Assets
    └─ other assets  → Workers Static Assets
```

`ningaloha.com` and `www.ningaloha.com` are Worker Custom Domains. Cloudflare is the only production runtime; this repository has no Express, VPS, or separate-backend deployment path.

```text
personal-blog/
├── frontend/             # Vue client and Vite configuration
├── cloudflare/           # Worker, migrations, importer, and tests
├── shared/               # Content rules shared by Worker and importer
├── .github/workflows/    # GitHub Actions
└── [optional] content/   # Local import source; not tracked on the current branch
```

## Quick start

Node.js 22 or later is required.

```bash
cd frontend
npm ci

cd ../cloudflare
npm ci
npm run db:migrate:local
```

Put a local-only `STATS_HASH_SECRET` in `cloudflare/.dev.vars`, then start the complete application:

```bash
npm run dev
```

Open `http://127.0.0.1:8787`. This command first builds the preview client and then runs the Worker with Wrangler. There is no separate Express API or Vite development server.

## Publishing content

`content/` may be an ignored directory in this checkout or an external directory containing Markdown and media. The importer validates all three content types, rewrites local media references to `/api/media/content/...`, uploads media to R2, and writes article variants to D1.

Validate a source without changing data:

```bash
cd cloudflare
node scripts/import-content.mjs --dry-run --content-root /absolute/path/to/content
```

Import into the local D1/R2 simulation:

```bash
node scripts/import-content.mjs --local --persist-to .wrangler/state \
  --content-root /absolute/path/to/content
```

Production import is an explicit state-changing operation and requires both the target environment and R2 bucket:

```bash
node scripts/import-content.mjs --remote --confirm-remote \
  --env production --bucket personal-blog-content-production \
  --content-root /absolute/path/to/content
```

The importer creates and updates objects only; it does not delete stale D1 rows or R2 objects. Remove obsolete remote data separately after deleting or renaming source content.

## Tests and deployment

Every push, pull request, and manual dispatch runs the GitHub Actions verification job:

1. Install locked frontend and Cloudflare dependencies.
2. Run the Worker test suite.
3. Build the production Cloudflare frontend.
4. Run `wrangler deploy --dry-run --env production`.

Once verification succeeds, a push to `main` or manual dispatch uses `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to deploy the Worker and static assets.

Automated deployment does **not** run production D1 migrations, import articles, or upload R2 media. Those remain explicit operations.

Reproduce CI verification locally:

```bash
cd frontend && npm ci
cd ../cloudflare && npm ci
npm test
npm run build:frontend:production
npx wrangler deploy --dry-run --env production \
  --outdir .wrangler/dry-run-production
```

## Operational boundaries

- Configure `STATS_HASH_SECRET` with `wrangler secret put`; never place it in the repository, `wrangler.jsonc`, or build logs.
- Apply schema changes separately with `wrangler d1 migrations apply CONTENT_DB --remote --env production`, after verifying the target environment.
- `.wrangler/`, `.dev.vars*`, build outputs, dependency directories, and local content sources are regenerated or private and must stay untracked.
- A web `/admin` editor does not exist; the importer is the supported bulk-content workflow.

## License

Application source code and project documentation are available under the [MIT License](./LICENSE). Original writing, article media, and the personal avatar are excluded; see the [Content Copyright Notice](./CONTENT_COPYRIGHT.md).

<p align="right">(<a href="#top">back to top</a>)</p>

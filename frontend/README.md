# Frontend

Vue 3 and Vite client for the personal blog, deployed with Cloudflare Workers Static Assets.

## Production build

```bash
npm ci
npm run build:cloudflare:production
```

The production build uses same-origin `/api` requests and does not bundle article Markdown. The Cloudflare Worker produces article HTML, localized metadata, sitemap, and R2 media URLs from D1/R2 at request time.

## Local development

For the complete application, use Wrangler from the [Cloudflare directory](../cloudflare/README.md):

```bash
cd ../cloudflare
npm run dev
```

This serves the built frontend and Worker APIs at http://127.0.0.1:8787. For frontend-only Vite development, `npm run dev` remains available, but its `/api` proxy points to `http://localhost:3000` as currently configured in `vite.config.js`; use Wrangler to exercise the Cloudflare stack.

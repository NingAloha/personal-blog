# Frontend

Vue 3 and Vite client for the personal blog.

## Cloudflare builds

```bash
npm run build:cloudflare:preview
npm run build:cloudflare:production
```

Both builds use same-origin `/api` requests and exclude the ignored local
article source. Preview emits `test.ningaloha.com` metadata with `noindex`;
Production emits `ningaloha.com` metadata with normal indexing enabled.

Article HTML, localized metadata, sitemap, and media URLs are produced by the
Cloudflare Worker from D1 and R2 at request time.

## Legacy local/VPS build

```bash
npm run dev
npm run build
npm run preview
```

The legacy build and prerender scripts require an external root `content/`
directory. They remain available for the unchanged Express/Caddy/VPS rollback
origin but are not used by the current CI production deployment.

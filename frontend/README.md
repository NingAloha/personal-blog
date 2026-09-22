# Frontend (personal_blog)

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Build behavior

- `npm run build` 会先生成 `robots.txt` 与站点地图，再进行 Vite 构建和预渲染。
- `generate:robots` 根据 `src/config/site.js` 生成：
  - `public/robots.txt`
- `generate:sitemap` 会读取仓库根目录下 `backend/content/**/*.md` 并生成：
  - `public/sitemap.xml`

## SEO files

- `src/utils/seo.js`：统一管理页面 `title`、`description`、`canonical`、Open Graph、Twitter Card 和 JSON-LD。
- `public/robots.txt`：构建时根据 `src/config/site.js` 生成抓取规则与站点地图地址。

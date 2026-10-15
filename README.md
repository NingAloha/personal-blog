<a id="top"></a>

<div align="center">
  <h1>Personal Blog</h1>
  <p>运行在 Cloudflare 上的双语个人网站。</p>
  <p><a href="https://ningaloha.com">访问网站</a> · <a href="#快速开始">本地运行</a> · <a href="#内容发布">发布内容</a> · <a href="./README.en.md">English</a></p>
</div>

> 本仓库只管理应用代码；已发布的文章、媒体和统计分别存储在 Cloudflare D1 与 R2。

## 目录

- [项目概览](#项目概览)
- [技术与架构](#技术与架构)
- [快速开始](#快速开始)
- [内容发布](#内容发布)
- [测试与部署](#测试与部署)
- [运行边界](#运行边界)
- [许可](#许可)

## 项目概览

网站包含项目、随笔和技术博客三类内容，并提供中文与英文版本。

- 中文为 `<slug>.md`，英文为同目录的 `<slug>.en.md`。
- 两种语言共享基础 slug 和阅读计数；英文不存在时回退到中文。
- 浏览器通过同源 `/api` 读取内容；Worker 为爬虫动态生成页面元信息、`robots.txt` 和 `sitemap.xml`。
- 部署代码不会写入、覆盖或删除线上内容。

## 技术与架构

| 层级 | 职责 |
| --- | --- |
| Vue 3 + Vite | 浏览器端界面与交互 |
| Cloudflare Worker | API、动态 SEO HTML、robots、sitemap 与路由分发 |
| Workers Static Assets | Vue 构建产物 |
| Cloudflare D1 | 文章身份、语言版本、元数据和访问统计 |
| Cloudflare R2 | Markdown 引用的图片与媒体 |
| GitHub Actions | 测试、生产构建与 Worker 发布 |

```text
访客 / 搜索引擎
  → Cloudflare Worker
    ├─ /api/*        → D1 与 R2
    ├─ 页面 / SEO     → D1 + Workers Static Assets
    └─ 其余静态资源   → Workers Static Assets
```

`ningaloha.com` 和 `www.ningaloha.com` 均为 Worker Custom Domains。生产运行时只有 Cloudflare；仓库不包含 Express、VPS 或独立后端部署路径。

```text
personal-blog/
├── frontend/             # Vue 客户端与 Vite 配置
├── cloudflare/           # Worker、迁移、导入器与测试
├── shared/               # Worker 与导入器共用的内容规则
├── .github/workflows/    # GitHub Actions
└── [可选] content/        # 本地导入源；当前分支不跟踪
```

## 快速开始

需要 Node.js 22 或更高版本。

```bash
cd frontend
npm ci

cd ../cloudflare
npm ci
npm run db:migrate:local
```

在 `cloudflare/.dev.vars` 中设置一个仅供本地使用的 `STATS_HASH_SECRET` 后启动：

```bash
npm run dev
```

完整应用位于 `http://127.0.0.1:8787`。该命令先构建 preview 前端，再由 Wrangler 运行 Worker；没有单独的 Express API 或 Vite 开发服务器。

## 内容发布

`content/` 可以是仓库内的忽略目录，也可以是仓库外的 Markdown 与媒体目录。导入器会验证三种内容类型，重写本地媒体引用为 `/api/media/content/...`，并将媒体上传 R2、将文章变体写入 D1。

先只验证输入：

```bash
cd cloudflare
node scripts/import-content.mjs --dry-run --content-root /absolute/path/to/content
```

导入本地 D1/R2 模拟环境：

```bash
node scripts/import-content.mjs --local --persist-to .wrangler/state \
  --content-root /absolute/path/to/content
```

生产导入是显式的有状态操作，必须确认环境与 R2 bucket：

```bash
node scripts/import-content.mjs --remote --confirm-remote \
  --env production --bucket personal-blog-content-production \
  --content-root /absolute/path/to/content
```

导入器只新增或更新对象，不会根据本地源自动删除 D1 记录或 R2 媒体。删除或改名文章时，需要单独清理不再使用的远端数据。

## 测试与部署

每次 Push、Pull Request 和手动触发都会运行 GitHub Actions 验证：

1. 安装 frontend 与 cloudflare 的锁定依赖；
2. 运行 Worker 测试；
3. 构建 Cloudflare production 前端；
4. 执行 `wrangler deploy --dry-run --env production`。

验证成功后，`main` 分支 Push 或手动触发会使用 `CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID` 发布 Worker 和静态资源。

自动部署**不会**执行生产 D1 migration、导入文章或上传 R2 媒体；它们都是独立操作。

本地复现 CI 验证：

```bash
cd frontend && npm ci
cd ../cloudflare && npm ci
npm test
npm run build:frontend:production
npx wrangler deploy --dry-run --env production \
  --outdir .wrangler/dry-run-production
```

## 运行边界

- `STATS_HASH_SECRET` 必须通过 `wrangler secret put` 配置，不能写入仓库、`wrangler.jsonc` 或构建日志。
- D1 schema 变更需单独执行 `wrangler d1 migrations apply CONTENT_DB --remote --env production`，并在执行前核对目标环境。
- `.wrangler/`、`.dev.vars*`、构建产物、依赖目录和本地内容源均为可再生或私有文件，不应提交。
- `/admin` 内容后台尚未实现；当前受支持的批量内容入口是导入器。

## 许可

程序源码与项目文档采用 [MIT License](./LICENSE)。原创文章、文章媒体和个人头像不在该许可范围内；参见[内容版权说明](./CONTENT_COPYRIGHT.zh.md)与 [Content Copyright Notice](./CONTENT_COPYRIGHT.md)。

<p align="right">(<a href="#top">回到顶部</a>)</p>

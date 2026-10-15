# Personal Blog

**语言 / Language：简体中文 | [English](./README.en.md)**

NingAloha 的个人网站，基于 Vue 3、Vite、Cloudflare Workers 和 Workers Static Assets 构建。文章正文、元数据和访问统计存储在 Cloudflare D1，文章图片及媒体存储在 Cloudflare R2。

**网站：** https://ningaloha.com

## 架构

```text
访客 / 搜索引擎
    ↓
Cloudflare Worker
    ├── Workers Static Assets：Vue 前端
    ├── API：文章读取、访问统计、媒体访问
    ├── D1：文章、语言版本、元数据、访问统计
    ├── R2：文章图片与媒体
    └── 动态生成页面元信息、robots.txt、sitemap.xml
```

内容支持中文（`zh`）和英文（`en`）版本。两个语言版本使用相同的基础 slug 和文章访问计数；英文内容不存在时，英文请求会回退到中文版本。

## 代码与内容分离

**GitHub 仓库管理应用代码；Cloudflare D1/R2 管理线上文章内容。**

网站部署不会自动导入、覆盖或删除文章。新文章和内容修改不需要向这个仓库提交 Markdown，也不需要重新部署 Worker。

`/admin` 在线编辑后台尚未开发。目前可以在 Cloudflare 控制台管理 D1 数据和 R2 对象；修改媒体时，应确保 Markdown 中的 `/api/media/content/...` 路径与 R2 对象 Key 一致。

仓库根目录的 `content/` 不纳入 Git，仅作为按需使用的本地内容导入来源。导入工具不属于在线 CMS。

主要目录：

```text
personal-blog/
├── frontend/             # Vue 前端
├── cloudflare/           # Worker、D1 Schema、R2 导入工具与测试
├── .github/workflows/    # CI/CD
└── content/              # 可选的本地内容来源（Git 忽略）
```

## 本地开发

需要 Node.js 22 或更新版本。

```bash
cd frontend && npm ci
cd ../cloudflare && npm ci

npm run db:migrate:local
# 在被 Git 忽略的 cloudflare/.dev.vars 中设置本地专用 STATS_HASH_SECRET
npm run dev
```

打开 http://127.0.0.1:8787 查看本地运行的完整应用。首次启动前可按需导入测试内容（见下文）。

本地 Wrangler 状态、环境变量、凭据、构建产物及文章内容来源均不应提交到 Git。

## 内容导入（按需）

导入脚本可读取仓库外的 Markdown 与媒体目录；线上内容仍以 D1/R2 为准。导入前先验证输入：

```bash
cd cloudflare
node scripts/import-content.mjs --dry-run --content-root /absolute/path/to/content
```

导入本地 D1/R2 模拟环境：

```bash
node scripts/import-content.mjs --local --persist-to .wrangler/state \
  --content-root /absolute/path/to/content
```

生产导入必须显式指定环境与存储桶，不属于自动部署步骤。相关细节见 [Cloudflare 技术文档](./cloudflare/README.md)。

## 自动化测试与部署

[GitHub Actions](./.github/workflows/ci.yml) 执行依赖安装、测试、生产前端构建和 Wrangler 部署检查。验证成功后，`main` 分支的 Push 或手动触发会部署生产 Worker 和静态资源。

**自动部署不会执行生产 D1 Schema Migration，也不会写入文章或上传 R2 媒体。** 只有数据库结构确实需要调整时，才单独执行迁移。

生产部署使用 GitHub Actions Secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

不要将凭据提交到仓库或打印到日志。

### 手动验证

```bash
cd backend && npm test
cd ../cloudflare && npm test
npm run build:frontend:production
npx wrangler deploy --dry-run --env production \
  --outdir .wrangler/dry-run-production
```

## 域名

`ningaloha.com` 与 `www.ningaloha.com` 在 [Wrangler 配置](./cloudflare/wrangler.jsonc) 中作为 **Worker Custom Domains** 配置（`custom_domain: true`）。生产站点的域名和资源绑定应在 Cloudflare 中管理和核对。

## 许可

程序源码和项目文档采用 [MIT License](./LICENSE)。原创文章、文章媒体及个人头像不在该许可证范围内；详见 [CONTENT_COPYRIGHT.md](./CONTENT_COPYRIGHT.md)。

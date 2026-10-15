# Personal Blog

**语言 / Language：简体中文 | [English](./README.en.md)**

NingAloha 的个人网站源码，基于 Vue 3、Vite、Cloudflare Workers 和 Workers Static Assets。文章正文、元数据与访问统计存储在 Cloudflare D1，文章图片及媒体存储在 R2。

**网站：** https://ningaloha.com

## 架构

```text
访客或搜索引擎
  → Cloudflare Worker
      ├─ Workers Static Assets：Vue 前端
      ├─ 内容与访问统计 API
      ├─ D1：文章、语言版本、元数据、访问统计
      ├─ R2：文章图片与其他媒体
      └─ 动态生成文章 HTML 元信息、robots.txt 和 sitemap.xml
```

文章支持中文（`zh`）和英文（`en`）：两个语言版本共用文章标识与访问统计。请求英文版本时，如果没有英文内容会回退到中文；中文请求只返回中文版本。

原来的 Express/Caddy/VPS 站点暂时保留作为回退来源，但已不属于当前 GitHub Actions 的部署目标。

## 代码与内容分离

**这个仓库负责网站程序，不负责日常文章发布。**

仓库保存源码、测试、D1 Schema Migration 和部署配置；正式环境中的文章 Markdown、元数据和图片由 D1/R2 保存，不随 Git 提交或网站部署而更新。

仓库根目录的 `content/` 已加入 Git 忽略规则，仅可作为旧文章迁移时的本地输入目录。导入脚本用于迁移，不是在线内容管理系统（CMS）。**`/admin` 后台尚未开发**；目前如需调整文章，可手动操作 Cloudflare 中的数据与对象，注意同步 Markdown 内的媒体链接和 R2 对象 Key。

```text
personal-blog/
├── frontend/            # Vue 站点
├── backend/             # 保留的 Express 实现及测试（VPS 回退）
├── cloudflare/          # Worker、D1 Migration、R2 导入工具及测试
├── scripts/             # 旧版构建及 VPS 回退脚本
├── .github/workflows/   # 测试和 Cloudflare 自动部署
└── content/             # 可选的本地迁移来源；不纳入 Git
```

## 本地开发

需要 Node.js 22 或更新版本。

```bash
cd frontend && npm ci
cd ../backend && npm ci
cd ../cloudflare && npm ci

npm run db:migrate:local
# 在被 Git 忽略的 cloudflare/.dev.vars 中设置仅用于开发的 STATS_HASH_SECRET
npm run dev
```

在 http://127.0.0.1:8787 访问完整的本地 Cloudflare 站点。

如果需要导入本地文章数据，先准备仓库外的内容目录，再按需执行：

```bash
cd cloudflare
node scripts/import-content.mjs --dry-run --content-root /absolute/path/to/content
node scripts/import-content.mjs --local --persist-to .wrangler/state \
  --content-root /absolute/path/to/content
```

上述本地导入不操作生产 D1/R2。环境变量、凭据、本地 Wrangler 状态、构建产物及内容目录均不应提交至 Git。旧 Express 后端可供回退测试，但不再承担生产部署。

更多数据库模型、媒体路径与操作说明见 [Cloudflare 技术文档](./cloudflare/README.md)。

## 持续集成与部署

[GitHub Actions](./.github/workflows/ci.yml) 将应用代码与文章内容的生命周期分开：

- 分支 Push 和 Pull Request：安装依赖、运行 Express/Worker 测试、构建生产前端并检查 Wrangler 部署配置。
- `main` 分支 Push 或该分支的手动触发：验证通过后部署生产 Worker 和静态资源。
- **不会自动迁移 D1 Schema、导入文章、上传 R2 媒体或修改 VPS。** 数据库结构变更需要按需单独执行，文章更新也不需要重新部署应用。

生产部署使用 GitHub Actions Secrets：`CLOUDFLARE_API_TOKEN` 与 `CLOUDFLARE_ACCOUNT_ID`。切勿将凭据写入仓库或日志。

### 手动验证

```bash
cd backend && npm test
cd ../cloudflare && npm test
npm run build:frontend:production
npx wrangler deploy --dry-run --env production \
  --outdir .wrangler/dry-run-production
```

## 域名与回退

生产站点的 `ningaloha.com` 与 `www.ningaloha.com` 在 `cloudflare/wrangler.jsonc` 中配置为 **Worker Custom Domains**（`custom_domain: true`），不是普通 Worker Routes。

如果需要恢复 VPS，必须先核对 Cloudflare 当前的 Custom Domain 关联与 DNS 记录，再解除相应关联、恢复正确的 VPS 源站记录，并验证两个域名的 HTTPS 访问。**单纯删除 Wrangler 中的域名声明，不保证请求自动回到 VPS。**

## 许可

程序源码与项目文档采用 [MIT License](./LICENSE)。原创文章、文章媒体和个人头像**不包含**在 MIT 许可范围内；详见 [CONTENT_COPYRIGHT.md](./CONTENT_COPYRIGHT.md)。

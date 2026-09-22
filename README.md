# Personal Blog Template

一个采用 Wikipedia 排版风格的个人网站与博客模板，基于 Vue 3、Vite 和
Express 构建。内容以 Markdown 维护，支持 SEO、预渲染和双语内容。

本仓库既是我正在实际使用的个人站源码，也可以作为模板供你搭建自己的博客。

## 在线示例

https://ningaloha.com

## 使用此模板

点击 GitHub 的 `Use this template` 创建自己的仓库（或复制本仓库），按照下面的快速
开始步骤在本地运行，然后再将其替换为你自己的站点。

## 快速开始

```bash
# 1) 启动后端（默认端口：3000）
cd backend
npm install
npm run dev

# 2) 新开终端，启动前端（默认端口：5173；/api 代理到后端）
cd frontend
npm install
npm run dev
```

浏览器访问 `http://localhost:5173`。

常见报错：
- Vite `proxy ECONNREFUSED /api/...`：后端没启动或端口不对（默认 `3000`）。
- `npm install ENOTEMPTY ... node_modules/...`：通常是依赖目录残留/占用导致，停掉相关进程后重试；必要时在对应目录执行 `rm -rf node_modules package-lock.json && npm install`。

## 自定义内容

发布自己的站点前，请替换或更新：

- `backend/content/**` 下的原作者文章与项目内容。
- `frontend/public/avatar.jpg` 中的个人头像。
- `frontend/src/config/site.js` 中的主要站点信息：域名、站点标题、作者名、GitHub
  地址与 description。

原作者的文字与媒体内容不包含在 MIT License 的授权范围内；详见
[CONTENT_COPYRIGHT.md](./CONTENT_COPYRIGHT.md)。

## 统计数据（访问量 / 阅读量）

访问量/阅读量属于**运行时状态**，不要依赖 Git 仓库文件持久化。

默认行为（本地开发）：
- 未设置 `DATA_DIR` 时，统计写入 `backend/data/stats.json`（不存在会自动创建；该文件已在 `.gitignore` 中忽略）。

推荐行为（服务器部署）：
- 通过环境变量把统计写到独立持久化目录（例如 `/var/lib/personal_blog`），使其与 immutable release 完全分离。

---

## 目录结构

```
personal_blog/
├── frontend/          # Vue 3 前端项目
│   ├── src/
│   └── public/        # 静态资源（如 avatar.jpg 放这里）
├── backend/           # Express API 服务
│   ├── server.js
│   └── content/
│       ├── projects/  # 项目 Markdown 文件
│       ├── essays/    # 随笔 Markdown 文件
│       └── tech-blogs/# 技术博客 Markdown 文件
├── scripts/
│   ├── generate-sitemap.mjs  # 根据 Markdown 内容自动生成 sitemap.xml
│   └── prerender-static.mjs  # 构建后预渲染静态路由
├── .github/workflows/ci.yml  # 构建、打包与生产发布工作流
├── scripts/deploy-release.sh # 服务器端原子切换与回滚脚本
└── README.md
```

---

## 当前能力（简述）

- 内容：`backend/content/**.md`（front matter + 正文）
- 主题：浅色/黑夜切换（本地持久化）
- 语言：UI 结构支持中/英切换（浏览器默认 + 本地持久化）
- 技术博客：支持内容级中英文切换；中文读取 `.md`，英文优先读取同名 `.en.md`，缺失时自动回退中文
- 技术博客聚合：`slug.md` 与 `slug.en.md` 视为同一篇文章，列表、详情路由与阅读统计按基础 slug 去重
- SEO：title/description/canonical/OG/Twitter Card + JSON-LD（Article/BlogPosting）
- 构建：自动生成 `frontend/public/sitemap.xml` + 预渲染静态路由到 `frontend/dist/`
- 统计：站点访问量 + 文章阅读量（可选；通过 `DATA_DIR` 做持久化）

## 内容维护（写作/更新）

新增/修改内容只需要编辑 `backend/content/` 下的 Markdown；后端按请求实时读取，一般不需要重启。

技术博客如果需要补英文内容，可在同目录新增同名 `.en.md` 文件，例如 `my-tech-post.md` 对应 `my-tech-post.en.md`；两者会被视为同一篇文章。

---

## 生产部署示例（GitHub Actions）

以下是作者当前实际使用的参考部署方案，并非使用本模板的必需步骤。

生产环境使用 Cloudflare、Caddy、systemd 与 GitHub Actions：GitHub runner 在 Ubuntu 22.04 / Node 22 中构建完整 release，服务器只接收、校验和切换 release，不执行 Git 或 npm 操作。

```text
git push main
  -> GitHub Actions: npm ci, frontend build, backend production dependencies
  -> immutable release artifact
  -> fingerprint-verified SSH/SCP
  -> staging validation
  -> /srv/personal-blog/releases/<full-sha>
  -> atomic current symlink switch
  -> backend restart and health checks
```

每个 release 同时包含 `frontend/dist`、后端运行时文件、`backend/content` 与后端生产 `node_modules`。内容目录既是预渲染输入，也是 API 的运行时来源，因此它们始终来自同一个 commit。

服务器目录：

```text
/srv/personal-blog/
├── releases/<full-sha>/
├── current -> releases/<full-sha>
└── .incoming/

/var/lib/personal_blog/
└── stats.json
```

`/var/lib/personal_blog` 是独立业务数据目录，不会被发布流程复制、覆盖或删除。Caddy 从 `current/frontend/dist` 提供静态页面，并将 `/api/*` 反向代理到由 `personal-blog-backend.service` 管理的 Node 服务。

### 触发方式

- 推送到 `main`：自动完整构建并发布到生产。
- GitHub Actions 的 `workflow_dispatch`：可在 `main` 上手动重新发布。
- 连续 push 时，新的提交可以取消仍在构建的旧提交；已进入生产发布的任务不会被取消，并由 production concurrency 串行执行。

### 发布安全措施

- SSH 与 SCP 都使用仓库 Variables 中的服务器 host fingerprint 验证。
- release 先在 `.incoming` staging 目录解压、校验，再原子提升为 immutable release。
- `current.new` 经 rename 原子替换 `current`，不会留下入口不存在的窗口。
- 发布后依次检查 systemd、`127.0.0.1:3000/api/projects`、站点首页和公网 API。
- 任一发布后检查失败会自动切回上一版 release，重启后端并再次执行健康检查。
- 成功发布后才清理该次上传的 incoming 文件；历史 release 暂不自动删除。

### GitHub Actions 配置

仓库需要以下既有配置，具体值不应写入仓库：

- Secrets：`SERVER_HOST`、`SERVER_USER`、`SSH_PRIVATE_KEY`
- Variables：`SERVER_SSH_FINGERPRINT`、`SITE_URL`（生产健康检查使用的公开站点 URL）

普通内容或代码更新无需登录服务器，也不需要手动执行 `git pull`、`npm ci`、`npm run build` 或重启服务。

---

## 内容格式参考

### 新增项目（projects）

在 `backend/content/projects/` 下新建一个 `.md` 文件，例如 `my-project.md`：

```markdown
---
title: 项目名称
summary: 一句话描述
tech: [Vue, Node.js]
startDate: "2025-01"
status: 进行中
link: https://github.com/yourname/your-project
featured: false
---

## 项目背景

正文 Markdown 内容...
```

### 新增随笔（essays）

在 `backend/content/essays/` 下新建一个 `.md` 文件，例如 `my-essay.md`：

```markdown
---
title: 随笔标题
summary: 一句话摘要
tags: [随想, 生活]
date: "2025-04-01"
featured: false
---

正文 Markdown 内容...
```

> 文件名即 URL slug，例如 `my-essay.md` 对应 `/essays/my-essay`。  
> `featured: true` 的条目会显示在主页精选区域（每类取第一个）。

### 新增技术博客（tech-blogs）

在 `backend/content/tech-blogs/` 下新建一个 `.md` 文件，例如 `my-tech-post.md`：

```markdown
---
title: 文章标题
summary: 一句话摘要
tags: [Vue, Node.js]
date: "2026-05-03"
featured: false
---

正文 Markdown 内容...
```

> 文件名即 URL slug，例如 `my-tech-post.md` 对应 `/tech-blogs/my-tech-post`。

## SEO 与收录

- 前端路由切换时会动态更新页面 `title`、`description`、`canonical`、Open Graph、Twitter Card。
- 详情页会注入结构化数据（JSON-LD，`Article/BlogPosting`）。
- 构建时会根据 `frontend/src/config/site.js` 生成 `frontend/public/robots.txt`，声明站点可抓取并指向站点地图。
- 站点地图由 `scripts/generate-sitemap.mjs` 自动生成，不建议手改 `frontend/public/sitemap.xml`。
- 构建时会生成 `llms.txt` 与空的 ARD manifest；它们仅描述公开站点文档，不声明 MCP、agent 或其他可调用资源。

## 更新上线流程

无论是 Markdown 内容、前端还是后端修改，提交并推送到 `main` 即可：

```bash
git add -A
git commit -m "描述你的改动"
git push origin main
```

GitHub Actions 会构建并发布同一 SHA 的完整 release。需要重新发布既有 `main` commit 时，在 Actions 页面使用 `workflow_dispatch`；不需要登录服务器执行手工部署命令。

---

## 头像

将头像图片命名为 `avatar.jpg` 放入 `frontend/public/` 目录，提交并推送到 `main` 即可：

```bash
cp your-avatar.jpg frontend/public/avatar.jpg
git add frontend/public/avatar.jpg
git commit -m "chore: update avatar"
git push origin main
```

建议头像使用正方形并压缩到较小体积（建议 `100~200KB`）。  
头像更新后，如果站点接入了 Cloudflare，请执行 `Custom Purge` 清理：
- `https://your-domain.example/avatar.jpg`

---

## 性能维护基线

### Lighthouse 目标

- 手机端（Mobile）性能分：`>= 85`
- 桌面端（Desktop）性能分：`>= 85`

### 已落地优化

- 首页头像补齐了明确尺寸属性（避免布局抖动）
- 首页 infobox 图片容器固定为 `1:1`，并使用 `object-fit: cover`
- 头像资源已压缩，降低首屏图片传输体积
- 首页首屏卡片加入占位渲染，减少异步数据回填造成的首屏波动
- `robots.txt` 与 `sitemap.xml` 已标准化，SEO 审核稳定通过
- 文章详情页已优化 Markdown 渲染流程（渲染缓存 + 低优先级统计请求）

### 最新验证快照

- 2026-09-22 对首页 `https://ningaloha.com/` 的 PageSpeed Insights 实验室测试：
  - 移动端（Mobile）性能分：`97`（FCP `1.5s`、LCP `2.3s`、TBT `0ms`、CLS `0`）
  - 桌面端（Desktop）性能分：`99`（FCP `0.4s`、LCP `0.5s`、TBT `0ms`、CLS `0.012`）
- 该报告暂无真实用户数据；首页与文章详情页的性能分可能不同，建议按关键页面分别评估。

### 发布后检查清单（推荐）

```bash
# 1) 头像是否为新资源（示例目标值会随文件更新而变化）
curl -I https://your-domain.example/avatar.jpg

# 2) robots 与 sitemap 是否可访问
curl https://your-domain.example/robots.txt
curl -I https://your-domain.example/sitemap.xml
```

若上线后分数异常回退，优先检查：
- Cloudflare 是否仍命中旧缓存（`cf-cache-status: HIT` + 旧 `content-length`）
- GitHub Actions 的 build 或 deploy 是否失败，导致新 sitemap/静态资源未发布
- 是否引入了未压缩的大图资源进入首页首屏

---

## 许可证

本仓库的 MIT License 适用于源代码和项目文档，但
[CONTENT_COPYRIGHT.md](./CONTENT_COPYRIGHT.md) 中列出的原创个人文字和媒体除外。

`backend/content/**` 下的原创个人文字和其他内容不受 MIT License 授权，保留全部
权利（All Rights Reserved）。作者的个人头像
`frontend/public/avatar.jpg` 同样保留全部权利。

若将本仓库作为个人博客模板使用，请删除或替换 `backend/content/**` 下的原作者内容。

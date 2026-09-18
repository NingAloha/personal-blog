---
title: 个人主页
summary: 你正在浏览的这个站点。基于前后端分离与 Markdown 内容目录，实现 Wikipedia 风格个人站；补齐主题/语言切换、技术博客中英文内容回退、SEO、sitemap、静态预渲染与完整 release 自动发布，并持续优化 Lighthouse 性能（移动端 99，桌面端文章页约 77）。
tech: ["Vue 3", "Vite", "Vue Router", "Node.js", "Express", "markdown-it", "gray-matter", "Caddy", "systemd", "GitHub Actions", "Theme System", "i18n", "SEO Meta", "JSON-LD", "Sitemap", "Prerender", "Cloudflare"]
startDate: "2026-04"
status: 进行中
link: https://github.com/NingAloha/personal_blog
featured: false
---

## 项目简介

这是一个以内容为中心的个人站：前端负责展示与路由，后端负责读取 Markdown 并提供 API。  
目标不是做复杂 CMS，而是在低维护成本下保持长期可写、可迭代、可部署。

## 项目结构

当前仓库采用前后端分离结构：

- `frontend/`：Vue 3 + Vite 前端应用，负责页面渲染与交互
- `backend/`：Express API 服务，按请求读取 `backend/content/` 中的 Markdown
- `backend/content/projects/`：项目内容
- `backend/content/essays/`：随笔内容
- `backend/content/tech-blogs/`：技术文章内容

这套结构的核心价值是“内容与渲染解耦”：改内容主要改 Markdown，改体验主要改前端。

## 技术栈

- **Vue 3 + Vue Router**：页面结构与客户端路由
- **Vite**：前端开发与构建
- **Node.js + Express**：后端 API 服务
- **markdown-it**：前端 Markdown 渲染
- **gray-matter**：解析 Markdown Front-matter 元数据
- **Caddy**：静态资源托管、HTTPS 与 `/api` 反向代理
- **systemd**：后端进程托管与重启管理
- **GitHub Actions**：Node 22 构建完整 release，并自动、原子地发布到生产环境

## 设计理念

- **内容优先**：减少后台系统复杂度，直接以 Markdown 作为内容源。
- **可维护优先**：常见变更（新增文章、改摘要、改标签）不依赖数据库迁移。
- **部署边界清晰**：前端产物、后端代码、内容与生产依赖作为同一 immutable release 发布；Caddy 负责统一入口。
- **阅读体验一致**：支持浅色/黑夜主题切换，并保留 Wikipedia 风格的克制排版。

这套取舍背后其实对应了两篇随笔的思路：  
- 《[开始](/essays/on-beginning)》：先让东西存在、先跑起来，再持续迭代。  
- 《[简单的事](/essays/on-simplicity)》：主动克制复杂度，只保留真正必要的结构与能力。

## 当前状态同步

- 前端已支持主题切换（浅色/黑夜）与语言切换（中/英），并进行本地持久化
- 内容继续采用 Markdown 目录维护，后端按请求实时读取
- 技术博客已支持内容级中英文切换：中文直接读取 `.md`，英文优先读取 `.en.md`，缺失时自动回退中文版本
- 技术博客中英文同名稿件按同一篇文章聚合，列表展示、详情页路由与阅读统计不再重复计算
- 仓库对外开源，但文章内容采用独立版权声明，见仓库根目录 `CONTENT_COPYRIGHT.md`
- 已接入动态 SEO 元信息（title / description / canonical / Open Graph / Twitter Card）
- 详情页已接入结构化数据（JSON-LD，Article/BlogPosting）
- 已提供标准 `robots.txt`、自动生成 `sitemap.xml` 与静态预渲染产物
- 最近一次性能基线：Lighthouse 移动端 99、桌面端（文章详情页）约 77
- 统计数据属于运行时状态：部署时不依赖 Git 目录；线上通过 `DATA_DIR` 指向独立持久化路径
- `main` 分支的推送会在 GitHub Actions 中完成前后端构建、打包完整 release 并自动部署；服务器不再承担 Git 拉取或 npm 构建
- 发布采用 staging 校验、`current` 原子切换、服务与公网健康检查；失败时自动回滚到上一版 release

## SEO 与性能优化记录

这轮优化的目标是“保证可收录 + 提升首屏性能 + 稳定发布流程”，主要动作如下：

- 新增 `scripts/generate-sitemap.mjs`，构建时自动根据 `backend/content/**/*.md` 生成站点地图
- 统一前端 SEO 注入逻辑（路由级基础 SEO + 详情页内容级 SEO）
- 修复 `robots.txt` 被 CDN 托管规则干扰导致的工具误判
- 首页头像补齐尺寸、固定 `1:1` 容器、降低图片体积，并优化首屏渲染占位策略
- 发布后将“代码更新 + CDN 缓存刷新 + 指标复测”纳入常规流程

## 开发过程

早期曾考虑做更完整的后台管理能力，后来回收范围，保留最关键链路：
- 内容文件组织
- 内容 API 输出
- 前端页面渲染与导航

这样能把精力集中在写作和呈现，而不是维护一套高复杂度的后台系统。

## 项目地址

项目源码托管在 GitHub：  
[https://github.com/NingAloha/personal_blog](https://github.com/NingAloha/personal_blog)

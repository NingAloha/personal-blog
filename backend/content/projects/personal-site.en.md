---
title: Personal Site
summary: The site you are viewing now. A Wikipedia-inspired personal site built around a separated frontend and backend plus Markdown content, with theme and language switching, bilingual technical posts, SEO, sitemaps, static prerendering, and automated immutable-release deployments. Recent Lighthouse baselines are 99 on mobile and about 77 for desktop article pages.
tech: ["Vue 3", "Vite", "Vue Router", "Node.js", "Express", "markdown-it", "gray-matter", "Caddy", "systemd", "GitHub Actions", "Theme System", "i18n", "SEO Meta", "JSON-LD", "Sitemap", "Prerender", "Cloudflare"]
startDate: "2026-04"
status: In progress
link: https://github.com/NingAloha/personal_blog
featured: false
---

## Overview

This is a content-first personal site: the frontend handles presentation and routing, while the backend reads Markdown and exposes an API. The goal is not to build an elaborate CMS, but to keep writing, iteration, and deployment sustainable with little operational overhead.

## Project Structure

The repository keeps frontend and backend responsibilities separate:

- `frontend/`: a Vue 3 and Vite application for rendering pages and interaction
- `backend/`: an Express API that reads Markdown from `backend/content/`
- `backend/content/projects/`: project entries
- `backend/content/essays/`: essays
- `backend/content/tech-blogs/`: technical posts

The central benefit is a separation between content and rendering: Markdown changes primarily affect content, while frontend work primarily affects the reading experience.

## Technology Stack

- **Vue 3 + Vue Router**: page structure and client-side routing
- **Vite**: frontend development and production builds
- **Node.js + Express**: backend API service
- **markdown-it**: Markdown rendering in the frontend
- **gray-matter**: parsing Markdown front matter
- **Caddy**: static delivery, HTTPS, and `/api` reverse proxying
- **systemd**: backend process supervision and restarts
- **GitHub Actions**: builds complete releases with Node 22 and deploys them atomically to production

## Design Principles

- **Content first**: use Markdown directly instead of adding an unnecessary administration system.
- **Maintainability first**: routine changes such as adding posts, editing summaries, or updating tags require no database migration.
- **Clear deployment boundaries**: frontend output, backend code, content, and production dependencies ship together as one immutable release; Caddy remains the unified entry point.
- **A consistent reading experience**: a restrained Wikipedia-inspired layout with light and dark themes.

These choices echo two essays on the site:

- [Beginning](/essays/on-beginning): make the thing exist and run first, then keep refining it.
- [Simple Things](/essays/on-simplicity): deliberately keep only the structure and capabilities that matter.

## Current State

- The frontend supports persistent light/dark themes and Chinese/English switching.
- Content remains organized as Markdown and is read by the backend on demand.
- Technical posts support content-level Chinese/English switching: English uses a sibling `.en.md` file when present and falls back to Chinese otherwise.
- Chinese and English versions of the same technical post share a base slug, so listings, routes, and read statistics do not count them twice.
- The repository is open source, while writing in `backend/content/` remains under a separate copyright notice in `CONTENT_COPYRIGHT.md`.
- Dynamic SEO metadata is available for titles, descriptions, canonical URLs, Open Graph, and Twitter Cards.
- Detail pages include Article or BlogPosting JSON-LD.
- The site provides `robots.txt`, generated `sitemap.xml`, and static prerendered output.
- Recent performance baselines are Lighthouse Mobile 99 and roughly 77 for desktop article pages.
- Statistics are runtime state rather than Git-tracked files; production uses a separate persistent path through `DATA_DIR`.
- Pushes to `main` build frontend and backend artifacts in GitHub Actions, package one complete release, and deploy it automatically. The production server no longer performs Git pulls or npm builds.
- Releases are validated in staging, switched through an atomic `current` symlink, then checked through service and public health checks; failures automatically roll back to the previous release.

## SEO and Performance Work

The latest round of work focused on discoverability, first-render performance, and reliable releases:

- Added `scripts/generate-sitemap.mjs` to generate the sitemap from `backend/content/**/*.md` during builds.
- Unified frontend SEO injection through route-level defaults and content-level detail-page metadata.
- Fixed a CDN-hosting-rule interaction that caused `robots.txt` to be misdiagnosed by external tools.
- Added explicit avatar dimensions, a fixed `1:1` container, a smaller image, and a steadier first-render placeholder.
- Made code updates, CDN cache refreshes, and metric checks part of the normal release workflow.

## Development Process

The project initially considered a fuller administration system, then deliberately reduced scope to the essential path:

- organizing content files
- exposing a content API
- rendering and navigating pages in the frontend

That leaves more energy for writing and presentation instead of maintaining an unnecessarily complex backend.

## Project Link

Source code is available on GitHub:  
[https://github.com/NingAloha/personal_blog](https://github.com/NingAloha/personal_blog)

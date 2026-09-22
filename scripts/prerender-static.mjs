import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, resolve, basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { renderMarkdown } from '../frontend/src/utils/markdown.js'
import { siteConfig } from '../frontend/src/config/site.js'
import { buildAbsoluteUrl, buildAssetUrl, normalizeSitePath } from '../frontend/src/utils/url.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const CONTENT_ROOT = join(ROOT, 'backend', 'content')
const DIST_ROOT = join(ROOT, 'frontend', 'dist')
const TEMPLATE_PATH = join(DIST_ROOT, 'index.html')

function truncate(text, max = 160) {
  if (!text) return siteConfig.description
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function parseValue(raw) {
  const text = raw.trim()
  if (text.startsWith('[') && text.endsWith(']')) {
    const inner = text.slice(1, -1).trim()
    if (!inner) return []
    return inner.split(',').map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
  }
  return text.replace(/^['"]|['"]$/g, '')
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return { data: {}, content: raw }
  const end = raw.indexOf('\n---', 3)
  if (end < 0) return { data: {}, content: raw }
  const block = raw.slice(3, end).trim()
  const content = raw.slice(end + 4).trim()
  const data = {}
  for (const line of block.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!match) continue
    data[match[1]] = parseValue(match[2] || '')
  }
  return { data, content }
}

function readContentType(dir, basePath) {
  const files = readdirSync(join(CONTENT_ROOT, dir))
    .filter((file) => file.endsWith('.md'))
    .filter((file) => !file.endsWith('.en.md'))
    .sort()
  return files.map((file) => {
    const slug = basename(file, '.md')
    const raw = readFileSync(join(CONTENT_ROOT, dir, file), 'utf-8')
    const { data, content } = parseFrontmatter(raw)
    return { slug, path: `${basePath}/${slug}`, ...data, content }
  })
}

function sortForLists(items) {
  return [...items].sort((a, b) => {
    if (a.featured === 'true' && b.featured !== 'true') return -1
    if (a.featured !== 'true' && b.featured === 'true') return 1
    const left = a.date || a.startDate || ''
    const right = b.date || b.startDate || ''
    return right.localeCompare(left)
  })
}

function injectHeadAndBody(template, { title, description, path, bodyHtml }) {
  const fullTitle = title ? `${title} | ${siteConfig.siteName}` : siteConfig.siteName
  const canonical = buildAbsoluteUrl(path)
  const desc = truncate(description)
  const ogImage = buildAssetUrl(siteConfig.avatarPath)

  let html = template
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${fullTitle}</title>`)
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`)
  html = html.replace(/<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${desc}" />`)
  html = html.replace('</head>', [
    `  <meta property="og:site_name" content="${siteConfig.siteName}">`,
    `  <meta property="og:title" content="${fullTitle}">`,
    `  <meta property="og:description" content="${desc}">`,
    `  <meta property="og:type" content="website">`,
    `  <meta property="og:url" content="${canonical}">`,
    `  <meta property="og:image" content="${ogImage}">`,
    `  <meta name="twitter:card" content="summary_large_image">`,
    `  <meta name="twitter:title" content="${fullTitle}">`,
    `  <meta name="twitter:description" content="${desc}">`,
    `  <meta name="twitter:image" content="${ogImage}">`,
    '</head>',
  ].join('\n'))
  html = html.replace('<div id="app"></div>', `<div id="app">${bodyHtml}</div>`)
  return html
}

function writeRouteHtml(routePath, html) {
  if (routePath === '/') {
    writeFileSync(TEMPLATE_PATH, html, 'utf-8')
    return
  }
  const dirPath = join(DIST_ROOT, routePath.slice(1))
  mkdirSync(dirPath, { recursive: true })
  writeFileSync(join(dirPath, 'index.html'), html, 'utf-8')
}

function renderHome(projects, essays, techBlogs) {
  const featuredProject = projects[0]
  const featuredEssay = essays[0]
  const featuredTechBlog = techBlogs[0]
  return `
<article class="home-article">
  <h1 class="wiki-title">关于我</h1>
  <p>你好，这里是我的个人主页。我喜欢写点代码，也喜欢写文章。</p>
  <h2 class="wiki-section">正在做的项目</h2>
  ${featuredProject ? `<p><a href="${normalizeSitePath(`/projects/${featuredProject.slug}`)}">${featuredProject.title}</a>：${featuredProject.summary || ''}</p>` : '<p>暂无项目。</p>'}
  <h2 class="wiki-section">文学随笔</h2>
  ${featuredEssay ? `<p><a href="${normalizeSitePath(`/essays/${featuredEssay.slug}`)}">${featuredEssay.title}</a>：${featuredEssay.summary || ''}</p>` : '<p>暂无随笔。</p>'}
  <h2 class="wiki-section">技术博客</h2>
  ${featuredTechBlog ? `<p><a href="${normalizeSitePath(`/tech-blogs/${featuredTechBlog.slug}`)}">${featuredTechBlog.title}</a>：${featuredTechBlog.summary || ''}</p>` : '<p>暂无技术博客。</p>'}
</article>`.trim()
}

function renderList(title, intro, basePath, items, dateKey) {
  const rows = items.map((item) => `<tr>
  <td class="list-title-cell"><a href="${normalizeSitePath(`${basePath}/${item.slug}`)}">${item.title || item.slug}</a></td>
  <td class="list-summary-cell">${item.summary || ''}</td>
  <td class="list-date-cell">${item[dateKey] || ''}</td>
</tr>`).join('\n')

  return `
<article>
  <h1 class="wiki-title">${title}</h1>
  <p class="page-lead">${intro}</p>
  <table class="wiki-list-table">
    <thead><tr><th>标题</th><th>摘要</th><th>日期</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</article>`.trim()
}

function renderDetail(item, sectionTitle, basePath) {
  return `
<article>
  <p class="breadcrumb"><a href="${normalizeSitePath(basePath)}">${sectionTitle}</a> › <span>${item.title || item.slug}</span></p>
  <h1 class="wiki-title">${item.title || item.slug}</h1>
  <div class="wiki-body">${renderMarkdown(item.content || '')}</div>
</article>`.trim()
}

const template = readFileSync(TEMPLATE_PATH, 'utf-8')
const projects = sortForLists(readContentType('projects', '/projects'))
const essays = sortForLists(readContentType('essays', '/essays'))
const techBlogs = sortForLists(readContentType('tech-blogs', '/tech-blogs'))

const pages = [
  {
    path: '/',
    title: '首页',
    description: siteConfig.description,
    bodyHtml: renderHome(projects, essays, techBlogs),
  },
  {
    path: '/projects',
    title: '项目',
    description: '项目列表：正在做和做过的工程项目。',
    bodyHtml: renderList('项目', '这里是我做过和正在做的项目，点击标题查看详情。', '/projects', projects, 'startDate'),
  },
  {
    path: '/essays',
    title: '文学随笔',
    description: '文学随笔与生活思考。',
    bodyHtml: renderList('文学随笔', '一些零散的文字，不成体系，但都是真实的。', '/essays', essays, 'date'),
  },
  {
    path: '/tech-blogs',
    title: '技术博客',
    description: '开发实践、技术思考与踩坑复盘。',
    bodyHtml: renderList('技术博客', '记录开发实践、技术思考与踩坑总结。', '/tech-blogs', techBlogs, 'date'),
  },
  ...projects.map((item) => ({
    path: item.path,
    title: item.title || item.slug,
    description: item.summary || siteConfig.description,
    bodyHtml: renderDetail(item, '项目', '/projects'),
  })),
  ...essays.map((item) => ({
    path: item.path,
    title: item.title || item.slug,
    description: item.summary || siteConfig.description,
    bodyHtml: renderDetail(item, '文学随笔', '/essays'),
  })),
  ...techBlogs.map((item) => ({
    path: item.path,
    title: item.title || item.slug,
    description: item.summary || siteConfig.description,
    bodyHtml: renderDetail(item, '技术博客', '/tech-blogs'),
  })),
]

for (const page of pages) {
  const html = injectHeadAndBody(template, page)
  writeRouteHtml(page.path, html)
}

console.log(`Prerendered ${pages.length} routes into ${DIST_ROOT}`)

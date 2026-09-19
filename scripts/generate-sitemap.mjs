import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join, resolve, basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getContentRoutes } from './content-routes.mjs'
import { buildAbsoluteUrl, normalizeSitePath } from '../frontend/src/utils/url.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const CONTENT_ROOT = join(ROOT, 'backend', 'content')
const OUTPUT = join(ROOT, 'frontend', 'public', 'sitemap.xml')

const staticRoutes = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/projects/', changefreq: 'weekly', priority: '0.8' },
  { path: '/essays/', changefreq: 'weekly', priority: '0.8' },
  { path: '/tech-blogs/', changefreq: 'weekly', priority: '0.9' },
]

const contentConfigs = [
  { dir: 'projects', basePath: '/projects', dateKeys: ['date', 'startDate'], priority: '0.7' },
  { dir: 'essays', basePath: '/essays', dateKeys: ['date'], priority: '0.7' },
  { dir: 'tech-blogs', basePath: '/tech-blogs', dateKeys: ['date'], priority: '0.9' },
]

const lastmodOverrides = new Map([
  ['/tech-blogs/fedora-44-wifi-disappeared-after-installing-nvidia-driver/', '2026-07-02'],
  ['/tech-blogs/fedora-44-wifi-disappeared-after-installing-nvidia-driver.en/', '2026-07-02'],
])

function escapeXml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return {}
  const end = raw.indexOf('\n---', 3)
  if (end < 0) return {}
  const block = raw.slice(3, end).trim()
  const obj = {}
  for (const line of block.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!m) continue
    const [, key, val] = m
    obj[key] = val.replace(/^['\"]|['\"]$/g, '').trim()
  }
  return obj
}

function toIsoDate(value) {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`
  return null
}

function buildDynamicEntries() {
  const entries = []
  const routeSet = new Set(getContentRoutes().map((route) => normalizeSitePath(route)))

  for (const cfg of contentConfigs) {
    const dirPath = join(CONTENT_ROOT, cfg.dir)
    const files = readdirSync(dirPath)
      .filter((file) => file.endsWith('.md'))
      .filter((file) => !file.endsWith('.en.md'))
      .sort()

    for (const file of files) {
      const slug = basename(file, '.md')
      const path = normalizeSitePath(`${cfg.basePath}/${slug}`)
      if (!routeSet.has(path)) continue

      const filePath = join(dirPath, file)
      const raw = readFileSync(filePath, 'utf-8')
      const data = parseFrontmatter(raw)

      let lastmod = null
      for (const k of cfg.dateKeys) {
        lastmod = toIsoDate(data[k])
        if (lastmod) break
      }
      if (!lastmod) {
        lastmod = statSync(filePath).mtime.toISOString().slice(0, 10)
      }

      entries.push({
        path,
        lastmod: lastmodOverrides.get(path) || lastmod,
        changefreq: 'monthly',
        priority: cfg.priority,
      })
    }
  }
  return entries
}

function renderXml(entries) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
  const seenUrls = new Set()

  for (const e of entries) {
    const loc = escapeXml(buildAbsoluteUrl(e.path))
    if (seenUrls.has(loc)) continue
    seenUrls.add(loc)
    lines.push('  <url>')
    lines.push(`    <loc>${loc}</loc>`)
    if (e.lastmod) lines.push(`    <lastmod>${e.lastmod}</lastmod>`)
    lines.push(`    <changefreq>${e.changefreq}</changefreq>`)
    lines.push(`    <priority>${e.priority}</priority>`)
    lines.push('  </url>')
  }

  lines.push('</urlset>')
  return `${lines.join('\n')}\n`
}

const entries = [...staticRoutes, ...buildDynamicEntries()]
writeFileSync(OUTPUT, renderXml(entries), 'utf-8')
console.log(`Generated sitemap: ${OUTPUT} (${entries.length} urls)`)

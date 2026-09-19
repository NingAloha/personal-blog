import express from 'express'
import cors from 'cors'
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, basename } from 'path'
import matter from 'gray-matter'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = join(__dirname, 'content')
const DATA_DIR = process.env.DATA_DIR || join(__dirname, 'data')
const STATS_FILE = join(DATA_DIR, 'stats.json')
const VISIT_DEDUPE_WINDOW_MS = 10 * 60 * 1000

const app = express()
app.use(cors())
app.use(express.json())

function ensureStatsStore() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
  if (!existsSync(STATS_FILE)) {
    writeFileSync(
      STATS_FILE,
      JSON.stringify({ siteVisits: 0, articleViews: {} }, null, 2),
      'utf-8'
    )
  }
}

function readStats() {
  ensureStatsStore()
  return JSON.parse(readFileSync(STATS_FILE, 'utf-8'))
}

function writeStats(stats) {
  ensureStatsStore()
  writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8')
}

function visitorKey(req, scope) {
  const cfIp = req.headers['cf-connecting-ip']
  const forwardedIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
  const ip = cfIp || forwardedIp || req.socket.remoteAddress || 'unknown'
  const ua = req.headers['user-agent'] || 'unknown'
  return `${scope}:${ip}:${ua}`
}

const visitDedupeCache = new Map()

function shouldCountVisit(req, scope) {
  const key = visitorKey(req, scope)
  const now = Date.now()
  const lastSeen = visitDedupeCache.get(key)
  visitDedupeCache.set(key, now)
  return !lastSeen || now - lastSeen > VISIT_DEDUPE_WINDOW_MS
}

function normalizeLocale(value) {
  if (typeof value !== 'string') return 'zh'
  const lower = value.toLowerCase()
  return lower.startsWith('en') ? 'en' : 'zh'
}

function splitLocalizedMarkdownName(file) {
  const stem = basename(file, '.md')
  if (stem.endsWith('.en')) {
    return { slug: stem.slice(0, -3), locale: 'en' }
  }
  return { slug: stem, locale: 'zh' }
}

function sortItems(a, b) {
  if (a.featured && !b.featured) return -1
  if (!a.featured && b.featured) return 1
  const da = a.date || a.startDate || ''
  const db = b.date || b.startDate || ''
  return db.localeCompare(da)
}

const CONTENT_TYPES = new Set(['projects', 'essays', 'tech-blogs'])

function contentDir(type) {
  if (!CONTENT_TYPES.has(type)) {
    throw new Error('Unknown content type')
  }
  return join(CONTENT_DIR, type)
}

function readLocalizedVariants(type) {
  const dir = contentDir(type)
  const groups = new Map()

  for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const { slug, locale: fileLocale } = splitLocalizedMarkdownName(file)
    const variants = groups.get(slug) || {}
    variants[fileLocale] = join(dir, file)
    groups.set(slug, variants)
  }

  return groups
}

function chooseLocalizedFile(variants, locale) {
  return locale === 'en' ? (variants.en || variants.zh) : variants.zh
}

function readMarkdownItem(slug, file, includeContent = false) {
  const raw = readFileSync(file, 'utf-8')
  const { data, content } = matter(raw)
  return includeContent ? { slug, ...data, content } : { slug, ...data }
}

// All content types use the same base slug. English files are optional and
// fall back to their Chinese counterpart when no .en.md variant exists.
function readLocalizedItems(type, locale = 'zh') {
  const groups = readLocalizedVariants(type)
  return Array.from(groups.entries())
    .map(([slug, variants]) => {
      const file = chooseLocalizedFile(variants, locale)
      return file ? readMarkdownItem(slug, file) : null
    })
    .filter(Boolean)
    .sort(sortItems)
}

function readLocalizedItem(type, slug, locale = 'zh') {
  const normalizedSlug = splitLocalizedMarkdownName(`${slug}.md`).slug
  const variants = readLocalizedVariants(type).get(normalizedSlug)
  const file = variants && chooseLocalizedFile(variants, locale)
  if (!file) {
    throw new Error('Not found')
  }
  return readMarkdownItem(normalizedSlug, file, true)
}

app.get('/api/projects', (req, res) => {
  try {
    res.json(readLocalizedItems('projects', normalizeLocale(req.query.lang)))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/projects/:slug', (req, res) => {
  try {
    res.json(readLocalizedItem('projects', req.params.slug, normalizeLocale(req.query.lang)))
  } catch {
    res.status(404).json({ error: 'Not found' })
  }
})

// ── 随笔 ──
app.get('/api/essays', (req, res) => {
  try {
    res.json(readLocalizedItems('essays', normalizeLocale(req.query.lang)))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/essays/:slug', (req, res) => {
  try {
    res.json(readLocalizedItem('essays', req.params.slug, normalizeLocale(req.query.lang)))
  } catch {
    res.status(404).json({ error: 'Not found' })
  }
})

// ── 技术博客 ──
app.get('/api/tech-blogs', (req, res) => {
  try {
    res.json(readLocalizedItems('tech-blogs', normalizeLocale(req.query.lang)))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tech-blogs/:slug', (req, res) => {
  try {
    res.json(readLocalizedItem('tech-blogs', req.params.slug, normalizeLocale(req.query.lang)))
  } catch {
    res.status(404).json({ error: 'Not found' })
  }
})

app.get('/api/stats/site', (_req, res) => {
  try {
    const stats = readStats()
    res.set('Cache-Control', 'no-store')
    res.json({ siteVisits: stats.siteVisits || 0 })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/stats/site/visit', (req, res) => {
  try {
    const stats = readStats()
    let counted = false
    if (shouldCountVisit(req, 'site')) {
      stats.siteVisits = (stats.siteVisits || 0) + 1
      writeStats(stats)
      counted = true
    }
    res.json({ ok: true, counted, siteVisits: stats.siteVisits || 0 })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/stats/article/:slug', (req, res) => {
  try {
    const stats = readStats()
    const slug = splitLocalizedMarkdownName(`${req.params.slug}.md`).slug
    res.set('Cache-Control', 'no-store')
    res.json({ slug, views: stats.articleViews?.[slug] || 0 })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/stats/article/:slug/visit', (req, res) => {
  try {
    const stats = readStats()
    const slug = splitLocalizedMarkdownName(`${req.params.slug}.md`).slug
    let counted = false
    if (shouldCountVisit(req, `article:${slug}`)) {
      stats.articleViews = stats.articleViews || {}
      stats.articleViews[slug] = (stats.articleViews[slug] || 0) + 1
      writeStats(stats)
      counted = true
    }
    res.json({ ok: true, counted, slug, views: stats.articleViews?.[slug] || 0 })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`)
  console.log(`Stats data dir: ${DATA_DIR}`)
  console.log(`Stats file: ${STATS_FILE}`)
})

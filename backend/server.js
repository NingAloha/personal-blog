import express from 'express'
import cors from 'cors'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { contentRepository, normalizeContentSlug } from './lib/content-repository.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
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

app.get('/api/projects', (req, res) => {
  try {
    res.json(contentRepository.list('projects', req.query.lang))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/projects/:slug', (req, res) => {
  try {
    res.json(contentRepository.get('projects', req.params.slug, req.query.lang))
  } catch {
    res.status(404).json({ error: 'Not found' })
  }
})

// ── 随笔 ──
app.get('/api/essays', (req, res) => {
  try {
    res.json(contentRepository.list('essays', req.query.lang))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/essays/:slug', (req, res) => {
  try {
    res.json(contentRepository.get('essays', req.params.slug, req.query.lang))
  } catch {
    res.status(404).json({ error: 'Not found' })
  }
})

// ── 技术博客 ──
app.get('/api/tech-blogs', (req, res) => {
  try {
    res.json(contentRepository.list('tech-blogs', req.query.lang))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/tech-blogs/:slug', (req, res) => {
  try {
    res.json(contentRepository.get('tech-blogs', req.params.slug, req.query.lang))
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
    const slug = normalizeContentSlug(req.params.slug)
    res.set('Cache-Control', 'no-store')
    res.json({ slug, views: stats.articleViews?.[slug] || 0 })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/stats/article/:slug/visit', (req, res) => {
  try {
    const stats = readStats()
    const slug = normalizeContentSlug(req.params.slug)
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

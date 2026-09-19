const BASE = '/api'

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function post(path) {
  const res = await fetch(`${BASE}${path}`, { method: 'POST' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function withLang(path, lang) {
  if (!lang) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}lang=${encodeURIComponent(lang)}`
}

function getContentList(type, lang) {
  return get(withLang(`/${type}`, lang))
}

function getContentItem(type, slug, lang) {
  return get(withLang(`/${type}/${slug}`, lang))
}

export const api = {
  getProjects: (lang) => getContentList('projects', lang),
  getProject: (slug, lang) => getContentItem('projects', slug, lang),
  getEssays: (lang) => getContentList('essays', lang),
  getEssay: (slug, lang) => getContentItem('essays', slug, lang),
  getTechBlogs: (lang) => getContentList('tech-blogs', lang),
  getTechBlog: (slug, lang) => getContentItem('tech-blogs', slug, lang),
  getSiteStats: () => get('/stats/site'),
  trackSiteVisit: () => post('/stats/site/visit'),
  getArticleStats: (slug) => get(`/stats/article/${slug}`),
  trackArticleVisit: (slug) => post(`/stats/article/${slug}/visit`),
}

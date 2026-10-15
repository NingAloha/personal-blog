const APP_API_BASE = '/api'
const CONTENT_API_BASE = (import.meta.env.VITE_CONTENT_API_BASE_URL || APP_API_BASE)
  .replace(/\/+$/, '')

async function get(base, path) {
  const res = await fetch(`${base}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const contentLanguage = res.headers.get('Content-Language')
  if (contentLanguage && data && !Array.isArray(data) && typeof data === 'object') {
    Object.defineProperty(data, 'contentLanguage', { value: contentLanguage })
  }
  return data
}

async function post(path) {
  const res = await fetch(`${APP_API_BASE}${path}`, { method: 'POST' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function withLang(path, lang) {
  if (!lang) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}lang=${encodeURIComponent(lang)}`
}

function getContentList(type, lang) {
  return get(CONTENT_API_BASE, withLang(`/${type}`, lang))
}

function getContentItem(type, slug, lang) {
  return get(CONTENT_API_BASE, withLang(`/${type}/${slug}`, lang))
}

export const api = {
  getProjects: (lang) => getContentList('projects', lang),
  getProject: (slug, lang) => getContentItem('projects', slug, lang),
  getEssays: (lang) => getContentList('essays', lang),
  getEssay: (slug, lang) => getContentItem('essays', slug, lang),
  getTechBlogs: (lang) => getContentList('tech-blogs', lang),
  getTechBlog: (slug, lang) => getContentItem('tech-blogs', slug, lang),
  getSiteStats: () => get(APP_API_BASE, '/stats/site'),
  trackSiteVisit: () => post('/stats/site/visit'),
  getArticleStats: (slug) => get(APP_API_BASE, `/stats/article/${slug}`),
  trackArticleVisit: (slug) => post(`/stats/article/${slug}/visit`),
}

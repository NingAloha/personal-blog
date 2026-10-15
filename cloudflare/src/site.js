import MarkdownIt from 'markdown-it'
import { normalizeLocale } from '../../shared/content-model.mjs'
import { siteConfig } from '../../frontend/src/config/site.js'
import { materializeMediaUrls } from './media.js'

const markdown = new MarkdownIt({ html: false, linkify: true, typographer: true })
const LIST_ROUTES = new Map([
  ['/projects', 'projects'],
  ['/essays', 'essays'],
  ['/tech-blogs', 'tech-blogs'],
])
const DETAIL_ROUTE = /^\/(projects|essays|tech-blogs)\/([^/]+)\/?$/

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeXml(value) {
  return escapeHtml(value)
}

function siteUrl(env, requestUrl) {
  return String(env.PUBLIC_SITE_URL || requestUrl.origin).replace(/\/+$/, '')
}

function canonicalUrl(base, pathname, locale) {
  return `${base}${pathname}${locale === 'en' ? '?lang=en' : ''}`
}

function sitemapDate(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return value
  if (/^\d{4}-\d{2}$/.test(value || '')) return `${value}-01`
  return null
}

function pageMetadata({ title, description, canonical, locale, alternates = [], jsonLd }) {
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    '<meta property="og:type" content="article">',
    `<meta property="og:locale" content="${locale === 'en' ? 'en_US' : 'zh_CN'}">`,
    '<meta name="twitter:card" content="summary">',
    ...alternates.map(({ locale: lang, url }) =>
      `<link rel="alternate" hreflang="${lang === 'zh' ? 'zh-CN' : 'en'}" href="${escapeHtml(url)}">`),
  ]
  if (alternates.length) {
    const fallback = alternates.find((entry) => entry.locale === 'zh') || alternates[0]
    tags.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(fallback.url)}">`)
  }
  if (jsonLd) tags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</script>`)
  return tags.join('\n    ')
}

function injectHtml(template, { locale, metadata, body }) {
  return template
    .replace(/<html\s+lang="[^"]*"/, `<html lang="${locale === 'en' ? 'en' : 'zh-CN'}"`)
    .replace(/<title>[\s\S]*?<\/title>/, metadata)
    .replace(/\s*<meta name="description"[^>]*>/, '')
    .replace(/\s*<link rel="canonical"[^>]*>/, '')
    .replace('<div id="app"></div>', `<div id="app">${body}</div>`)
}

async function indexTemplate(request, env) {
  const assetUrl = new URL('/', request.url)
  const response = await env.ASSETS.fetch(new Request(assetUrl, request))
  if (!response.ok) throw new Error('Frontend index asset is unavailable')
  return response.text()
}

function decodeSlug(value) {
  try {
    const slug = decodeURIComponent(value)
    if (!slug || slug.includes('/') || slug.includes('\\') || slug.includes('\0')) throw new Error()
    return slug
  } catch {
    throw new Error('Not found')
  }
}

function listTitle(type, locale) {
  const titles = {
    projects: ['项目', 'Projects'],
    essays: ['随笔', 'Essays'],
    'tech-blogs': ['技术博客', 'Tech Blogs'],
  }
  return titles[type][locale === 'en' ? 1 : 0]
}

export async function renderSitePage(request, env, repository) {
  const url = new URL(request.url)
  const requestedLocale = normalizeLocale(url.searchParams.get('lang'))
  const base = siteUrl(env, url)
  let locale = requestedLocale
  let title
  let description
  let body
  let canonical
  let alternates = []
  let jsonLd

  if (url.pathname === '/') {
    title = locale === 'en' ? siteConfig.siteNameEn : siteConfig.siteName
    description = locale === 'en' ? siteConfig.descriptionEn : siteConfig.description
    canonical = canonicalUrl(base, '/', locale)
    body = `<main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></main>`
  } else if (LIST_ROUTES.has(url.pathname.replace(/\/$/, ''))) {
    const pathname = url.pathname.replace(/\/$/, '')
    const type = LIST_ROUTES.get(pathname)
    const items = await repository.list(type, locale)
    title = `${listTitle(type, locale)} | ${locale === 'en' ? siteConfig.siteNameEn : siteConfig.siteName}`
    description = locale === 'en' ? siteConfig.descriptionEn : siteConfig.description
    canonical = canonicalUrl(base, pathname, locale)
    body = `<main><h1>${escapeHtml(listTitle(type, locale))}</h1><ul>${items.map((item) =>
      `<li><a href="/${type}/${encodeURIComponent(item.slug)}${locale === 'en' ? '?lang=en' : ''}">${escapeHtml(item.title)}</a><p>${escapeHtml(item.summary || '')}</p></li>`).join('')}</ul></main>`
  } else {
    const match = url.pathname.match(DETAIL_ROUTE)
    if (!match) return null
    const [, type, encodedSlug] = match
    let variants
    try {
      variants = await repository.getVariants(type, decodeSlug(encodedSlug))
    } catch {
      return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    }
    const item = requestedLocale === 'en' ? (variants.en || variants.zh) : variants.zh
    if (!item) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    locale = requestedLocale === 'en' && variants.en ? 'en' : 'zh'
    const pathname = `/${type}/${encodeURIComponent(item.slug)}`
    canonical = canonicalUrl(base, pathname, locale)
    alternates = Object.keys(variants).map((lang) => ({ locale: lang, url: canonicalUrl(base, pathname, lang) }))
    title = `${item.title} | ${locale === 'en' ? siteConfig.siteNameEn : siteConfig.siteName}`
    description = item.summary || (locale === 'en' ? siteConfig.descriptionEn : siteConfig.description)
    const rendered = markdown.render(materializeMediaUrls(item.content, base))
    body = `<main><article><h1>${escapeHtml(item.title)}</h1><p>${escapeHtml(item.summary || '')}</p>${rendered}</article></main>`
    jsonLd = {
      '@context': 'https://schema.org',
      '@type': type === 'projects' ? 'CreativeWork' : 'Article',
      headline: item.title,
      description,
      inLanguage: locale === 'en' ? 'en' : 'zh-CN',
      url: canonical,
      author: { '@type': 'Person', name: siteConfig.authorName },
      ...(item.date ? { datePublished: item.date } : {}),
    }
  }

  const template = await indexTemplate(request, env)
  const html = injectHtml(template, {
    locale,
    metadata: pageMetadata({ title, description, canonical, locale, alternates, jsonLd }),
    body,
  })
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  })
}

export async function renderSitemap(request, env, repository) {
  const url = new URL(request.url)
  const base = siteUrl(env, url)
  const variants = await repository.listAllVariants()
  const grouped = new Map()
  for (const item of variants) {
    const key = `${item.type}/${item.slug}`
    const group = grouped.get(key) || []
    group.push(item)
    grouped.set(key, group)
  }
  const urls = ['/', '/projects', '/essays', '/tech-blogs'].map((pathname) =>
    `<url><loc>${escapeXml(`${base}${pathname}`)}</loc></url>`)
  for (const items of grouped.values()) {
    for (const item of items) {
      const pathname = `/${item.type}/${encodeURIComponent(item.slug)}`
      const location = canonicalUrl(base, pathname, item.locale)
      const alternates = items.map((variant) =>
        `<xhtml:link rel="alternate" hreflang="${variant.locale === 'zh' ? 'zh-CN' : 'en'}" href="${escapeXml(canonicalUrl(base, pathname, variant.locale))}" />`).join('')
      const lastmod = sitemapDate(item.date || item.startDate)
      urls.push(`<url><loc>${escapeXml(location)}</loc>${alternates}${lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : ''}</url>`)
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>`
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=60' } })
}

export function renderRobots(env) {
  const preview = env.PREVIEW_MODE === 'true'
  const body = preview
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nSitemap: ${String(env.PUBLIC_SITE_URL).replace(/\/+$/, '')}/sitemap.xml\n`
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}

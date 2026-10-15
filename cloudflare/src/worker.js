import { CONTENT_TYPES } from '../../backend/lib/content-model.mjs'
import { CONTENT_LOCALE, createD1ContentRepository } from './content-repository.js'
import { materializeMediaUrls, serveMedia } from './media.js'
import { renderRobots, renderSitePage, renderSitemap } from './site.js'
import { handleStatisticsRequest } from './statistics.js'

const CONTENT_ROUTE = /^\/api\/(projects|essays|tech-blogs)(?:\/([^/]+))?\/?$/
const MEDIA_ROUTE = '/api/media/'
const STATISTICS_ROUTE = '/api/stats/'

function decorate(response, env, { cors = false } = {}) {
  const headers = new Headers(response.headers)
  if (env.PREVIEW_MODE === 'true') headers.set('X-Robots-Tag', 'noindex, nofollow')
  if (cors) {
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Content-Type')
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

function json(body, status = 200, headers = {}) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'public, max-age=60', ...headers },
  })
}

function decodeSlug(value) {
  let slug
  try {
    slug = decodeURIComponent(value)
  } catch {
    throw new Error('Not found')
  }
  if (!slug || slug.includes('/') || slug.includes('\\') || slug.includes('\0')) throw new Error('Not found')
  return slug
}

async function handleContentApi(request, env, url) {
  const match = url.pathname.match(CONTENT_ROUTE)
  if (!match || !CONTENT_TYPES.includes(match[1])) return json({ error: 'Not found' }, 404)
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const [, type, encodedSlug] = match
  const repository = createD1ContentRepository(env.CONTENT_DB)
  if (!encodedSlug) {
    try {
      return json(await repository.list(type, url.searchParams.get('lang')))
    } catch (error) {
      return json({ error: error.message }, 500)
    }
  }

  try {
    const item = await repository.get(type, decodeSlug(encodedSlug), url.searchParams.get('lang'))
    item.content = materializeMediaUrls(item.content, url.origin)
    return json(item, 200, { 'Content-Language': item[CONTENT_LOCALE] })
  } catch {
    return json({ error: 'Not found' }, 404)
  }
}

export async function handleRequest(request, env) {
  const url = new URL(request.url)
  const apiRequest = url.pathname.startsWith('/api/')
  if (request.method === 'OPTIONS' && apiRequest) {
    return decorate(new Response(null, { status: 204 }), env, { cors: true })
  }

  if (url.pathname.startsWith(MEDIA_ROUTE)) {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return decorate(json({ error: 'Method not allowed' }, 405), env, { cors: true })
    }
    return decorate(await serveMedia(request, env.CONTENT_MEDIA, url.pathname.slice(MEDIA_ROUTE.length)), env, { cors: true })
  }

  if (url.pathname.startsWith(STATISTICS_ROUTE)) {
    try {
      return decorate(await handleStatisticsRequest(request, env, url), env, { cors: true })
    } catch (error) {
      console.error('Statistics request failed', error)
      return decorate(json({ error: 'Internal server error' }, 500), env, { cors: true })
    }
  }

  if (url.pathname.startsWith('/api/')) {
    return decorate(await handleContentApi(request, env, url), env, { cors: true })
  }

  if (!['GET', 'HEAD'].includes(request.method)) {
    return decorate(new Response('Method not allowed', { status: 405 }), env)
  }

  const repository = createD1ContentRepository(env.CONTENT_DB)
  if (url.pathname === '/robots.txt') return decorate(renderRobots(env), env)
  if (url.pathname === '/sitemap.xml') return decorate(await renderSitemap(request, env, repository), env)

  const page = await renderSitePage(request, env, repository)
  if (page) return decorate(page, env)
  return decorate(await env.ASSETS.fetch(request), env)
}

export default {
  fetch(request, env) {
    return handleRequest(request, env)
  },
}

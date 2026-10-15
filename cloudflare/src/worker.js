import { CONTENT_TYPES } from '../../backend/lib/content-model.mjs'
import { createD1ContentRepository } from './content-repository.js'
import { materializeMediaUrls, serveMedia } from './media.js'

const API_ROUTE = /^\/api\/(projects|essays|tech-blogs)(?:\/([^/]+))?\/?$/
const MEDIA_ROUTE = '/api/media/'

function withCors(response) {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'public, max-age=60' },
  })
}

function decodeSlug(value) {
  let slug
  try {
    slug = decodeURIComponent(value)
  } catch {
    throw new Error('Not found')
  }
  if (!slug || slug.includes('/') || slug.includes('\\') || slug.includes('\0')) {
    throw new Error('Not found')
  }
  return slug
}

export async function handleRequest(request, env) {
  if (request.method === 'OPTIONS') return withCors(new Response(null, { status: 204 }))
  if (!['GET', 'HEAD'].includes(request.method)) {
    return withCors(json({ error: 'Method not allowed' }, 405))
  }

  const url = new URL(request.url)
  if (url.pathname.startsWith(MEDIA_ROUTE)) {
    const response = await serveMedia(
      request,
      env.CONTENT_MEDIA,
      url.pathname.slice(MEDIA_ROUTE.length),
    )
    return withCors(response)
  }

  if (request.method !== 'GET') return withCors(json({ error: 'Not found' }, 404))
  const match = url.pathname.match(API_ROUTE)
  if (!match || !CONTENT_TYPES.includes(match[1])) {
    return withCors(json({ error: 'Not found' }, 404))
  }

  const [, type, encodedSlug] = match
  const repository = createD1ContentRepository(env.CONTENT_DB)
  if (!encodedSlug) {
    try {
      return withCors(json(await repository.list(type, url.searchParams.get('lang'))))
    } catch (error) {
      return withCors(json({ error: error.message }, 500))
    }
  }

  try {
    const item = await repository.get(type, decodeSlug(encodedSlug), url.searchParams.get('lang'))
    item.content = materializeMediaUrls(item.content, url.origin)
    return withCors(json(item))
  } catch {
    return withCors(json({ error: 'Not found' }, 404))
  }
}

export default {
  fetch(request, env) {
    return handleRequest(request, env)
  },
}

import { normalizeContentSlug } from '../../backend/lib/content-model.mjs'

export const VISIT_DEDUPE_WINDOW_MS = 10 * 60 * 1000

const encoder = new TextEncoder()
const importedKeys = new Map()

async function hmacKey(secret) {
  let key = importedKeys.get(secret)
  if (!key) {
    key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    importedKeys.set(secret, key)
  }
  return key
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashVisitor(request, scope, secret) {
  if (!secret) throw new Error('STATS_HASH_SECRET is required')
  const ip = request.headers.get('CF-Connecting-IP')
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown'
  const userAgent = request.headers.get('User-Agent') || 'unknown'
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret),
    encoder.encode(`${scope}\0${ip}\0${userAgent}`),
  )
  return toHex(signature)
}

export function createStatisticsRepository(database, { now = () => Date.now() } = {}) {
  if (!database) throw new Error('CONTENT_DB binding is required')

  async function get(scope) {
    const row = await database
      .prepare('SELECT value FROM stats_counters WHERE scope = ? LIMIT 1')
      .bind(scope)
      .first()
    return Number(row?.value || 0)
  }

  async function record(scope, visitorHash) {
    const timestamp = now()
    const dedupe = await database.prepare(`
      INSERT INTO stats_visit_dedupe (scope, visitor_hash, last_seen_at)
      VALUES (?, ?, ?)
      ON CONFLICT(scope, visitor_hash) DO UPDATE SET
        last_seen_at = excluded.last_seen_at
      WHERE stats_visit_dedupe.last_seen_at < ?
    `).bind(
      scope,
      visitorHash,
      timestamp,
      timestamp - VISIT_DEDUPE_WINDOW_MS,
    ).run()

    const counted = Number(dedupe?.meta?.changes || 0) > 0
    if (counted) {
      await database.prepare(`
        INSERT INTO stats_counters (scope, value, updated_at)
        VALUES (?, 1, ?)
        ON CONFLICT(scope) DO UPDATE SET
          value = stats_counters.value + 1,
          updated_at = excluded.updated_at
      `).bind(scope, timestamp).run()
    }

    return { counted, value: await get(scope) }
  }

  return Object.freeze({ get, record })
}

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function decodeSlug(value) {
  let decoded
  try {
    decoded = decodeURIComponent(value)
  } catch {
    throw new Error('Invalid slug')
  }
  if (!decoded || decoded.includes('/') || decoded.includes('\\') || decoded.includes('\0')) {
    throw new Error('Invalid slug')
  }
  return normalizeContentSlug(decoded)
}

export async function handleStatisticsRequest(request, env, url = new URL(request.url)) {
  const repository = createStatisticsRepository(env.CONTENT_DB)

  if (url.pathname === '/api/stats/site') {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
    return json({ siteVisits: await repository.get('site') })
  }

  if (url.pathname === '/api/stats/site/visit') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const result = await repository.record(
      'site',
      await hashVisitor(request, 'site', env.STATS_HASH_SECRET),
    )
    return json({ ok: true, counted: result.counted, siteVisits: result.value })
  }

  const match = url.pathname.match(/^\/api\/stats\/article\/([^/]+?)(\/visit)?\/?$/)
  if (!match) return json({ error: 'Not found' }, 404)

  let slug
  try {
    slug = decodeSlug(match[1])
  } catch {
    return json({ error: 'Not found' }, 404)
  }
  const scope = `article:${slug}`

  if (match[2]) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const result = await repository.record(
      scope,
      await hashVisitor(request, scope, env.STATS_HASH_SECRET),
    )
    return json({ ok: true, counted: result.counted, slug, views: result.value })
  }

  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
  return json({ slug, views: await repository.get(scope) })
}

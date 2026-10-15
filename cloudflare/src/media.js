const MEDIA_PREFIX = 'content/'

export function parseMediaObjectKey(encodedPath) {
  let decoded
  try {
    decoded = decodeURIComponent(encodedPath)
  } catch {
    throw new Error('Invalid media path encoding')
  }

  if (!decoded || decoded.includes('\\') || decoded.includes('\0')) {
    throw new Error('Invalid media path')
  }

  const segments = decoded.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error('Invalid media path')
  }

  const key = segments.join('/')
  if (!key.startsWith(MEDIA_PREFIX)) {
    throw new Error('Invalid media namespace')
  }
  return key
}

export function materializeMediaUrls(markdown, requestOrigin) {
  if (!markdown || !requestOrigin) return markdown
  return markdown.replaceAll('/api/media/', `${requestOrigin}/api/media/`)
}

export async function serveMedia(request, bucket, encodedPath) {
  if (!bucket) throw new Error('CONTENT_MEDIA binding is required')

  let key
  try {
    key = parseMediaObjectKey(encodedPath)
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  const object = request.method === 'HEAD'
    ? await bucket.head(key)
    : await bucket.get(key)
  if (!object) return Response.json({ error: 'Not found' }, { status: 404 })

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  if (object.httpEtag) headers.set('ETag', object.httpEtag)
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'public, max-age=3600')
  }
  headers.set('X-Content-Type-Options', 'nosniff')
  return new Response(request.method === 'HEAD' ? null : object.body, { headers })
}

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { handleRequest } from '../src/worker.js'

const rows = [
  {
    type: 'tech-blogs', slug: 'demo', locale: 'zh',
    metadata_json: JSON.stringify({ title: '中文标题', date: '2026-01-01', featured: true }),
    markdown_body: '![图](/api/media/content/tech-blogs/demo/assets/image.png)',
  },
  {
    type: 'tech-blogs', slug: 'demo', locale: 'en',
    metadata_json: JSON.stringify({ title: 'English title', date: '2026-01-01', featured: true }),
    markdown_body: '![image](/api/media/content/tech-blogs/demo/assets/image.png)',
  },
]

function createEnvironment() {
  return {
    CONTENT_DB: {
      prepare() {
        return {
          bind(type, slug) {
            return {
              async all() {
                return {
                  results: rows
                    .filter((row) => row.type === type && (!slug || row.slug === slug))
                    .map(({ type: _type, ...row }) => row),
                }
              },
            }
          },
        }
      },
    },
    CONTENT_MEDIA: {
      async get(key) {
        if (key !== 'content/tech-blogs/demo/assets/image.png') return null
        return {
          body: new Uint8Array([137, 80, 78, 71]),
          httpEtag: '"demo"',
          writeHttpMetadata(headers) {
            headers.set('Content-Type', 'image/png')
          },
        }
      },
      async head(key) {
        return this.get(key)
      },
    },
  }
}

test('Worker exposes compatible list and detail responses', async () => {
  const env = createEnvironment()
  const listResponse = await handleRequest(
    new Request('https://content.example/api/tech-blogs?lang=en'),
    env,
  )
  const list = await listResponse.json()
  assert.equal(listResponse.status, 200)
  assert.deepEqual(list, [{ slug: 'demo', title: 'English title', date: '2026-01-01', featured: true }])
  assert.equal(listResponse.headers.get('access-control-allow-origin'), '*')

  const detailResponse = await handleRequest(
    new Request('https://content.example/api/tech-blogs/demo.en?lang=en'),
    env,
  )
  const detail = await detailResponse.json()
  assert.equal(detailResponse.status, 200)
  assert.equal(detail.slug, 'demo')
  assert.match(detail.content, /https:\/\/content\.example\/api\/media\//)
})

test('Worker preserves missing article and method behavior', async () => {
  const env = createEnvironment()
  const missing = await handleRequest(
    new Request('https://content.example/api/essays/missing'),
    env,
  )
  assert.equal(missing.status, 404)
  assert.deepEqual(await missing.json(), { error: 'Not found' })

  const mutation = await handleRequest(
    new Request('https://content.example/api/projects', { method: 'POST' }),
    env,
  )
  assert.equal(mutation.status, 405)
})

test('Worker serves R2 media with MIME metadata and blocks traversal', async () => {
  const env = createEnvironment()
  const image = await handleRequest(
    new Request('https://content.example/api/media/content/tech-blogs/demo/assets/image.png'),
    env,
  )
  assert.equal(image.status, 200)
  assert.equal(image.headers.get('content-type'), 'image/png')
  assert.equal(image.headers.get('x-content-type-options'), 'nosniff')

  const unsafe = await handleRequest(
    new Request('https://content.example/api/media/content/%2E%2E/private.txt'),
    env,
  )
  assert.equal(unsafe.status, 400)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  VISIT_DEDUPE_WINDOW_MS,
  createStatisticsRepository,
  handleStatisticsRequest,
} from '../src/statistics.js'

function createDatabase() {
  const counters = new Map()
  const visitors = new Map()
  const boundValues = []
  return {
    counters,
    visitors,
    boundValues,
    prepare(sql) {
      return {
        bind(...values) {
          boundValues.push(...values)
          return {
            async first() {
              return { value: counters.get(values[0]) || 0 }
            },
            async run() {
              if (sql.includes('stats_visit_dedupe')) {
                const [scope, hash, timestamp, cutoff] = values
                const key = `${scope}:${hash}`
                const previous = visitors.get(key)
                if (previous === undefined || previous < cutoff) {
                  visitors.set(key, timestamp)
                  return { meta: { changes: 1 } }
                }
                return { meta: { changes: 0 } }
              }
              if (sql.includes('stats_counters')) {
                counters.set(values[0], (counters.get(values[0]) || 0) + 1)
                return { meta: { changes: 1 } }
              }
              throw new Error(`Unexpected SQL: ${sql}`)
            },
          }
        },
      }
    },
  }
}

test('statistics preserve ten-minute deduplication and article base slugs', async () => {
  const database = createDatabase()
  let now = 1_000_000
  const repository = createStatisticsRepository(database, { now: () => now })

  assert.deepEqual(await repository.record('article:demo', 'visitor-hash'), { counted: true, value: 1 })
  assert.deepEqual(await repository.record('article:demo', 'visitor-hash'), { counted: false, value: 1 })
  now += VISIT_DEDUPE_WINDOW_MS + 1
  assert.deepEqual(await repository.record('article:demo', 'visitor-hash'), { counted: true, value: 2 })

  const response = await handleStatisticsRequest(
    new Request('https://test.example/api/stats/article/demo.en'),
    { CONTENT_DB: database, STATS_HASH_SECRET: 'test-secret' },
  )
  assert.deepEqual(await response.json(), { slug: 'demo', views: 2 })
})

test('statistics API stores only keyed visitor hashes, never raw addresses', async () => {
  const database = createDatabase()
  const request = new Request('https://test.example/api/stats/site/visit', {
    method: 'POST',
    headers: { 'CF-Connecting-IP': '203.0.113.42', 'User-Agent': 'test-agent' },
  })
  const response = await handleStatisticsRequest(request, {
    CONTENT_DB: database,
    STATS_HASH_SECRET: 'test-secret',
  })

  assert.deepEqual(await response.json(), { ok: true, counted: true, siteVisits: 1 })
  assert.equal(database.boundValues.includes('203.0.113.42'), false)
  const storedHash = [...database.visitors.keys()][0].split(':').at(-1)
  assert.match(storedHash, /^[a-f0-9]{64}$/)
})

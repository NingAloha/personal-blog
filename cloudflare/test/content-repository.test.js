import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createD1ContentRepository } from '../src/content-repository.js'

const rows = [
  {
    type: 'essays', slug: 'featured', locale: 'zh',
    metadata_json: JSON.stringify({ title: '精选', date: '2024-01-01', featured: true }),
    markdown_body: '精选正文',
  },
  {
    type: 'essays', slug: 'recent', locale: 'zh',
    metadata_json: JSON.stringify({ title: '最近', date: '2026-01-01', featured: false }),
    markdown_body: '中文正文',
  },
  {
    type: 'essays', slug: 'recent', locale: 'en',
    metadata_json: JSON.stringify({ title: 'Recent', date: '2026-01-01', featured: false }),
    markdown_body: 'English body',
  },
  {
    type: 'essays', slug: 'english-only', locale: 'en',
    metadata_json: JSON.stringify({ title: 'English only', date: '2027-01-01', featured: false }),
    markdown_body: 'English-only body',
  },
]

function createFakeDatabase(fixtures = rows) {
  return {
    prepare() {
      return {
        bind(type, slug) {
          return {
            async all() {
              return {
                results: fixtures
                  .filter((row) => row.type === type && (!slug || row.slug === slug))
                  .map(({ type: _type, ...row }) => row),
              }
            },
          }
        },
      }
    },
  }
}

test('D1 repository preserves localization, fallback, unique slugs, and sorting', async () => {
  const repository = createD1ContentRepository(createFakeDatabase())
  const items = await repository.list('essays', 'en-US')

  assert.deepEqual(items.map(({ slug }) => slug), ['featured', 'english-only', 'recent'])
  assert.equal(items.find(({ slug }) => slug === 'recent').title, 'Recent')
  assert.equal(items.find(({ slug }) => slug === 'featured').title, '精选')
  assert.equal('content' in items[0], false)
})

test('D1 repository keeps Chinese one-way fallback behavior', async () => {
  const repository = createD1ContentRepository(createFakeDatabase())
  const items = await repository.list('essays', 'zh-CN')

  assert.equal(items.some(({ slug }) => slug === 'english-only'), false)
  assert.equal(items.find(({ slug }) => slug === 'recent').title, '最近')
})

test('D1 repository normalizes localized slugs and returns Markdown bodies', async () => {
  const repository = createD1ContentRepository(createFakeDatabase())
  const item = await repository.get('essays', 'recent.en', 'en')

  assert.equal(item.slug, 'recent')
  assert.equal(item.title, 'Recent')
  assert.equal(item.content, 'English body')
  await assert.rejects(() => repository.get('essays', 'missing', 'en'), /Not found/)
})

test('D1 repository rejects unknown content types', async () => {
  const repository = createD1ContentRepository(createFakeDatabase())
  await assert.rejects(() => repository.list('unknown'), /Unknown content type/)
})

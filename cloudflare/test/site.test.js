import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderRobots, renderSitePage, renderSitemap } from '../src/site.js'

const variants = {
  zh: { slug: 'demo', title: '中文标题', summary: '中文摘要', date: '2026-01-01', content: '## 正文\n\n![图](/api/media/content/demo.png)' },
  en: { slug: 'demo', title: 'English title', summary: 'English summary', date: '2026-01-01', content: '## Body' },
}

function environment() {
  return {
    PUBLIC_SITE_URL: 'https://test.ningaloha.com',
    PREVIEW_MODE: 'true',
    ASSETS: {
      async fetch() {
        return new Response('<!doctype html><html lang="en"><head><meta name="description" content="old"><link rel="canonical" href="old"><title>old</title></head><body><div id="app"></div><script src="/assets/app.js"></script></body></html>')
      },
    },
  }
}

const repository = {
  async getVariants() { return variants },
  async list() { return [variants.zh] },
  async listAllVariants() {
    return [
      { type: 'tech-blogs', locale: 'zh', ...variants.zh },
      { type: 'tech-blogs', locale: 'en', ...variants.en },
    ]
  },
}

test('article HTML contains D1-derived content, localized metadata, and media URLs', async () => {
  const response = await renderSitePage(
    new Request('https://test.ningaloha.com/tech-blogs/demo?lang=en'),
    environment(),
    repository,
  )
  const html = await response.text()
  assert.match(html, /<html lang="en"/)
  assert.match(html, /English title/)
  assert.match(html, /English summary/)
  assert.match(html, /rel="canonical" href="https:\/\/test\.ningaloha\.com\/tech-blogs\/demo\?lang=en"/)
  assert.match(html, /<h2>Body<\/h2>/)
  assert.match(html, /hreflang="zh-CN"/)
})

test('English requests fall back to Chinese HTML when no translation exists', async () => {
  const zhOnlyRepository = { ...repository, async getVariants() { return { zh: variants.zh } } }
  const response = await renderSitePage(
    new Request('https://test.ningaloha.com/tech-blogs/demo?lang=en'),
    environment(),
    zhOnlyRepository,
  )
  const html = await response.text()
  assert.match(html, /<html lang="zh-CN"/)
  assert.match(html, /中文标题/)
  assert.match(html, /https:\/\/test\.ningaloha\.com\/api\/media\/content\/demo\.png/)
  assert.doesNotMatch(html, /canonical[^>]+\?lang=en/)
})

test('sitemap is generated from active variants and preview robots block indexing', async () => {
  const sitemap = await renderSitemap(
    new Request('https://test.ningaloha.com/sitemap.xml'),
    environment(),
    repository,
  )
  const xml = await sitemap.text()
  assert.match(xml, /tech-blogs\/demo/)
  assert.match(xml, /tech-blogs\/demo\?lang=en/)
  assert.match(xml, /hreflang="en"/)

  assert.equal(await renderRobots(environment()).text(), 'User-agent: *\nDisallow: /\n')
})

import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, test } from 'node:test'
import {
  createFileSystemContentRepository,
  normalizeContentSlug,
} from '../lib/content-repository.js'

let contentRoot
let repository

before(() => {
  contentRoot = mkdtempSync(join(tmpdir(), 'personal-blog-content-'))
  for (const type of ['projects', 'essays', 'tech-blogs']) {
    mkdirSync(join(contentRoot, type))
  }

  writeFileSync(join(contentRoot, 'essays', 'featured.md'), `---
title: 精选文章
date: "2024-01-01"
featured: true
---

精选正文
`)
  writeFileSync(join(contentRoot, 'essays', 'recent.md'), `---
title: 最近文章
date: "2026-01-01"
featured: false
---

中文正文
`)
  writeFileSync(join(contentRoot, 'essays', 'recent.en.md'), `---
title: Recent Post
date: "2026-01-01"
featured: false
---

English content
`)
  writeFileSync(join(contentRoot, 'essays', 'older.md'), `---
title: 较早文章
date: "2025-01-01"
featured: false
---

较早正文
`)
  writeFileSync(join(contentRoot, 'essays', 'english-only.en.md'), `---
title: English Only
date: "2027-01-01"
featured: false
---

English only content
`)
  writeFileSync(join(contentRoot, 'projects', 'javascript-frontmatter.md'), `---js
({ title: 'JavaScript front matter' })
---

This content must not be evaluated.
`)

  repository = createFileSystemContentRepository({ contentRoot })
})

after(() => {
  rmSync(contentRoot, { recursive: true, force: true })
})

test('lists one item per base slug with localization, fallback, and existing sorting', () => {
  const items = repository.list('essays', 'en-US')

  assert.deepEqual(items.map(({ slug }) => slug), [
    'featured',
    'english-only',
    'recent',
    'older',
  ])
  assert.equal(items.find(({ slug }) => slug === 'recent').title, 'Recent Post')
  assert.equal(items.find(({ slug }) => slug === 'older').title, '较早文章')
  assert.equal('content' in items[0], false)
})

test('Chinese listings omit slugs that have no Chinese variant', () => {
  const items = repository.list('essays', 'zh-CN')

  assert.equal(items.some(({ slug }) => slug === 'english-only'), false)
  assert.equal(items.find(({ slug }) => slug === 'recent').title, '最近文章')
})

test('gets localized content and normalizes localized slugs', () => {
  const item = repository.get('essays', 'recent.en', 'en')

  assert.equal(item.slug, 'recent')
  assert.equal(item.title, 'Recent Post')
  assert.match(item.content, /English content/)
  assert.equal(normalizeContentSlug('recent.en'), 'recent')
})

test('preserves existing errors for unknown types and missing content', () => {
  assert.throws(() => repository.list('unknown'), /Unknown content type/)
  assert.throws(() => repository.get('essays', 'missing'), /Not found/)
})

test('rejects executable JavaScript front matter', () => {
  assert.throws(
    () => repository.get('projects', 'javascript-frontmatter'),
    /Parsing JavaScript in front matter is no longer supported/,
  )
})

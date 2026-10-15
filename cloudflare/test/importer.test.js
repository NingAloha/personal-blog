import assert from 'node:assert/strict'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, test } from 'node:test'
import {
  buildImportSql,
  ContentImportError,
  scanContent,
} from '../scripts/content-importer.mjs'

const temporaryRoots = []

function createContentRoot() {
  const root = mkdtempSync(join(tmpdir(), 'personal-blog-import-test-'))
  temporaryRoots.push(root)
  for (const type of ['projects', 'essays', 'tech-blogs']) {
    mkdirSync(join(root, type))
  }
  return root
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

test('scanner preserves variants, rewrites media, and generates deterministic upserts', () => {
  const root = createContentRoot()
  const articleDir = join(root, 'tech-blogs')
  mkdirSync(join(articleDir, 'demo', 'assets'), { recursive: true })
  writeFileSync(join(articleDir, 'demo', 'assets', 'image.png'), Buffer.from([137, 80, 78, 71]))
  writeFileSync(join(articleDir, 'demo.md'), `---
title: 中文
date: "2026-01-02"
featured: true
---
![示例](demo/assets/image.png)
`)
  writeFileSync(join(articleDir, 'demo.en.md'), `---
title: English
date: "2026-01-02"
featured: true
---
![Example](/content/tech-blogs/demo/assets/image.png)
`)

  const first = scanContent({ contentRoot: root })
  const second = scanContent({ contentRoot: root })

  assert.equal(first.articles.length, 1)
  assert.deepEqual(Object.keys(first.articles[0].variants), ['en', 'zh'])
  assert.equal(first.media.length, 1)
  assert.equal(first.media[0].contentType, 'image/png')
  assert.match(first.articles[0].variants.zh.body, /\/api\/media\/content\/tech-blogs\/demo\/assets\/image\.png/)
  assert.equal(buildImportSql(first), buildImportSql(second))
  assert.match(buildImportSql(first), /ON CONFLICT\(article_id, locale\) DO UPDATE/)
  assert.doesNotMatch(buildImportSql(first), /\b(?:BEGIN|COMMIT)\b/)
})

test('scanner reports missing media without modifying Markdown sources', () => {
  const root = createContentRoot()
  const file = join(root, 'essays', 'missing.md')
  const original = `---\ntitle: Missing\n---\n![missing](assets/nope.png)\n`
  writeFileSync(file, original)

  assert.throws(
    () => scanContent({ contentRoot: root }),
    (error) => error instanceof ContentImportError && /missing media file/.test(error.issues[0].message),
  )
  assert.equal(readFileSync(file, 'utf8'), original)
})

test('scanner rejects media traversal outside the content root', () => {
  const root = createContentRoot()
  writeFileSync(join(root, 'projects', 'unsafe.md'), `---
title: Unsafe
---
![unsafe](../../../outside.png)
`)

  assert.throws(
    () => scanContent({ contentRoot: root }),
    (error) => error instanceof ContentImportError && /escapes content root/.test(error.issues[0].message),
  )
})

test('scanner rejects executable JavaScript front matter', () => {
  const root = createContentRoot()
  writeFileSync(join(root, 'projects', 'javascript.md'), `---js
({ title: 'must not execute' })
---
Body
`)

  assert.throws(
    () => scanContent({ contentRoot: root }),
    (error) => error instanceof ContentImportError && /Parsing JavaScript/.test(error.issues[0].message),
  )
})

test('scanner rejects media symlinks that escape the content root', () => {
  const root = createContentRoot()
  const outside = mkdtempSync(join(tmpdir(), 'personal-blog-import-outside-'))
  temporaryRoots.push(outside)
  const secret = join(outside, 'secret.png')
  writeFileSync(secret, Buffer.from([137, 80, 78, 71]))
  symlinkSync(secret, join(root, 'projects', 'linked.png'))
  writeFileSync(join(root, 'projects', 'linked.md'), `---
title: Linked
---
![linked](linked.png)
`)

  assert.throws(
    () => scanContent({ contentRoot: root }),
    (error) => error instanceof ContentImportError && /symlink escapes/.test(error.issues[0].message),
  )
})

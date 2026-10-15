import { createHash } from 'node:crypto'
import {
  existsSync,
  readFileSync,
  realpathSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import matter from '@11ty/gray-matter'
import {
  CONTENT_TYPES,
  splitLocalizedMarkdownName,
} from '../../shared/content-model.mjs'

const MARKDOWN_IMAGE = /(!\[[^\]]*\]\()([^)\s]+)([^)]*\))/g

const MIME_TYPES = new Map([
  ['.avif', 'image/avif'],
  ['.gif', 'image/gif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.mp3', 'audio/mpeg'],
  ['.ogg', 'audio/ogg'],
  ['.wav', 'audio/wav'],
  ['.mp4', 'video/mp4'],
  ['.webm', 'video/webm'],
  ['.pdf', 'application/pdf'],
])

export class ContentImportError extends Error {
  constructor(issues) {
    super(`Content validation failed with ${issues.length} issue(s)`)
    this.name = 'ContentImportError'
    this.issues = issues
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function isWithin(root, candidate) {
  const rel = relative(root, candidate)
  return rel === '' || (!rel.startsWith(`..${sep}`) && rel !== '..' && !isAbsolute(rel))
}

function decodeMediaPath(rawUrl) {
  const unwrapped = rawUrl.startsWith('<') && rawUrl.endsWith('>')
    ? rawUrl.slice(1, -1)
    : rawUrl
  const pathOnly = unwrapped.split(/[?#]/, 1)[0]
  try {
    return decodeURIComponent(pathOnly)
  } catch {
    throw new Error(`invalid URL encoding: ${rawUrl}`)
  }
}

function encodeObjectKey(key) {
  return key.split('/').map(encodeURIComponent).join('/')
}

function resolveLocalMedia(rawUrl, markdownPath, contentRoot) {
  if (
    rawUrl.startsWith('#') ||
    rawUrl.startsWith('//') ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(rawUrl)
  ) {
    return null
  }

  const decoded = decodeMediaPath(rawUrl)
  if (!decoded || decoded.includes('\\') || decoded.includes('\0')) {
    throw new Error(`unsafe media path: ${rawUrl}`)
  }

  let absolutePath
  if (decoded.startsWith('/content/')) {
    absolutePath = resolve(contentRoot, decoded.slice('/content/'.length))
  } else if (decoded.startsWith('/')) {
    return null
  } else {
    absolutePath = resolve(dirname(markdownPath), decoded)
  }

  if (!isWithin(contentRoot, absolutePath)) {
    throw new Error(`media path escapes content root: ${rawUrl}`)
  }
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new Error(`missing media file: ${rawUrl}`)
  }
  const realContentRoot = realpathSync(contentRoot)
  const realSourcePath = realpathSync(absolutePath)
  if (!isWithin(realContentRoot, realSourcePath)) {
    throw new Error(`media symlink escapes content root: ${rawUrl}`)
  }

  const relativePath = relative(contentRoot, absolutePath).split(sep).join('/')
  const segments = relativePath.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`unsafe media object key: ${rawUrl}`)
  }

  const key = `content/${relativePath}`
  return {
    key,
    publicPath: `/api/media/${encodeObjectKey(key)}`,
    sourcePath: realSourcePath,
    contentType: MIME_TYPES.get(extname(absolutePath).toLowerCase()) || 'application/octet-stream',
  }
}

function rewriteMarkdownMedia(markdown, markdownPath, contentRoot, media) {
  return markdown.replace(MARKDOWN_IMAGE, (match, prefix, rawUrl, suffix) => {
    const resolved = resolveLocalMedia(rawUrl, markdownPath, contentRoot)
    if (!resolved) return match

    const bytes = readFileSync(resolved.sourcePath)
    const existing = media.get(resolved.key)
    const descriptor = {
      ...resolved,
      byteLength: bytes.byteLength,
      sourceHash: sha256(bytes),
    }
    if (existing && existing.sourceHash !== descriptor.sourceHash) {
      throw new Error(`media key collision: ${resolved.key}`)
    }
    media.set(resolved.key, descriptor)
    return `${prefix}${resolved.publicPath}${suffix}`
  })
}

function normalizeMetadata(data) {
  return JSON.parse(JSON.stringify(data || {}))
}

export function scanContent({ contentRoot }) {
  const absoluteContentRoot = resolve(contentRoot)
  const articles = new Map()
  const media = new Map()
  const issues = []

  for (const type of CONTENT_TYPES) {
    const typeDir = join(absoluteContentRoot, type)
    if (!existsSync(typeDir)) {
      issues.push({ file: typeDir, message: 'content type directory is missing' })
      continue
    }

    const files = readdirSync(typeDir)
      .filter((file) => file.endsWith('.md'))
      .sort()
    for (const file of files) {
      const sourcePath = join(typeDir, file)
      try {
        const { slug, locale } = splitLocalizedMarkdownName(file)
        if (!slug || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug)) {
          throw new Error(`unsupported slug: ${slug}`)
        }

        const raw = readFileSync(sourcePath, 'utf8')
        const parsed = matter(raw)
        const metadata = normalizeMetadata(parsed.data)
        const body = rewriteMarkdownMedia(
          parsed.content,
          sourcePath,
          absoluteContentRoot,
          media,
        )
        const articleId = `${type}:${slug}`
        const article = articles.get(articleId) || { id: articleId, type, slug, variants: {} }
        if (article.variants[locale]) {
          throw new Error(`duplicate ${locale} variant for ${articleId}`)
        }

        const metadataJson = JSON.stringify(metadata)
        article.variants[locale] = {
          locale,
          metadata,
          metadataJson,
          body,
          featured: metadata.featured ? 1 : 0,
          sortDate: String(metadata.date || metadata.startDate || ''),
          sourceHash: sha256(`${metadataJson}\0${body}`),
          sourcePath,
        }
        articles.set(articleId, article)
      } catch (error) {
        issues.push({ file: sourcePath, message: error.message })
      }
    }
  }

  if (issues.length) throw new ContentImportError(issues)

  return {
    articles: Array.from(articles.values()).sort((a, b) => a.id.localeCompare(b.id)),
    media: Array.from(media.values()).sort((a, b) => a.key.localeCompare(b.key)),
  }
}

function sqlString(value) {
  if (String(value).includes('\0')) throw new Error('SQL values cannot contain NUL bytes')
  return `'${String(value).replaceAll("'", "''")}'`
}

export function buildImportSql(manifest) {
  const statements = ['PRAGMA foreign_keys = ON;']
  for (const article of manifest.articles) {
    statements.push(`
INSERT INTO articles (id, type, slug)
VALUES (${sqlString(article.id)}, ${sqlString(article.type)}, ${sqlString(article.slug)})
ON CONFLICT(id) DO UPDATE SET
  type = excluded.type,
  slug = excluded.slug,
  updated_at = CURRENT_TIMESTAMP
WHERE articles.type <> excluded.type OR articles.slug <> excluded.slug;`.trim())

    for (const locale of ['zh', 'en']) {
      const variant = article.variants[locale]
      if (!variant) continue
      statements.push(`
INSERT INTO article_variants (
  article_id, locale, metadata_json, markdown_body,
  featured, sort_date, source_hash
)
VALUES (
  ${sqlString(article.id)}, ${sqlString(locale)}, ${sqlString(variant.metadataJson)},
  ${sqlString(variant.body)}, ${variant.featured}, ${sqlString(variant.sortDate)},
  ${sqlString(variant.sourceHash)}
)
ON CONFLICT(article_id, locale) DO UPDATE SET
  metadata_json = excluded.metadata_json,
  markdown_body = excluded.markdown_body,
  featured = excluded.featured,
  sort_date = excluded.sort_date,
  source_hash = excluded.source_hash,
  updated_at = CURRENT_TIMESTAMP
WHERE article_variants.source_hash <> excluded.source_hash
   OR article_variants.metadata_json <> excluded.metadata_json
   OR article_variants.markdown_body <> excluded.markdown_body
   OR article_variants.featured <> excluded.featured
   OR article_variants.sort_date <> excluded.sort_date;`.trim())
    }
  }
  return `${statements.join('\n\n')}\n`
}

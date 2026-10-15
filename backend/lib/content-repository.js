import { readFileSync, readdirSync } from 'fs'
import { basename, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import matter from '@11ty/gray-matter'

const MODULE_DIR = dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONTENT_ROOT = join(MODULE_DIR, '..', '..', 'content')
const CONTENT_TYPES = new Set(['projects', 'essays', 'tech-blogs'])

function normalizeLocale(value) {
  if (typeof value !== 'string') return 'zh'
  return value.toLowerCase().startsWith('en') ? 'en' : 'zh'
}

function splitLocalizedMarkdownName(file) {
  const stem = basename(file, '.md')
  if (stem.endsWith('.en')) {
    return { slug: stem.slice(0, -3), locale: 'en' }
  }
  return { slug: stem, locale: 'zh' }
}

export function normalizeContentSlug(slug) {
  return splitLocalizedMarkdownName(`${slug}.md`).slug
}

function sortItems(a, b) {
  if (a.featured && !b.featured) return -1
  if (!a.featured && b.featured) return 1
  const leftDate = a.date || a.startDate || ''
  const rightDate = b.date || b.startDate || ''
  return rightDate.localeCompare(leftDate)
}

export function createFileSystemContentRepository({ contentRoot = DEFAULT_CONTENT_ROOT } = {}) {
  function contentDir(type) {
    if (!CONTENT_TYPES.has(type)) {
      throw new Error('Unknown content type')
    }
    return join(contentRoot, type)
  }

  function readLocalizedVariants(type) {
    const dir = contentDir(type)
    const groups = new Map()

    for (const file of readdirSync(dir).filter((entry) => entry.endsWith('.md'))) {
      const { slug, locale } = splitLocalizedMarkdownName(file)
      const variants = groups.get(slug) || {}
      variants[locale] = join(dir, file)
      groups.set(slug, variants)
    }

    return groups
  }

  function chooseLocalizedFile(variants, locale) {
    return normalizeLocale(locale) === 'en' ? (variants.en || variants.zh) : variants.zh
  }

  function readMarkdownItem(slug, file, includeContent = false) {
    const raw = readFileSync(file, 'utf-8')
    const { data, content } = matter(raw)
    return includeContent ? { slug, ...data, content } : { slug, ...data }
  }

  return Object.freeze({
    list(type, locale = 'zh') {
      return Array.from(readLocalizedVariants(type).entries())
        .map(([slug, variants]) => {
          const file = chooseLocalizedFile(variants, locale)
          return file ? readMarkdownItem(slug, file) : null
        })
        .filter(Boolean)
        .sort(sortItems)
    },

    get(type, slug, locale = 'zh') {
      const normalizedSlug = normalizeContentSlug(slug)
      const variants = readLocalizedVariants(type).get(normalizedSlug)
      const file = variants && chooseLocalizedFile(variants, locale)
      if (!file) {
        throw new Error('Not found')
      }
      return readMarkdownItem(normalizedSlug, file, true)
    },
  })
}

export const contentRepository = createFileSystemContentRepository()

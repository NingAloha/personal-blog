import { readFileSync, readdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import matter from '@11ty/gray-matter'
import {
  CONTENT_TYPES,
  chooseLocalizedVariant,
  compareContentItems,
  normalizeContentSlug,
  splitLocalizedMarkdownName,
} from './content-model.mjs'

const MODULE_DIR = dirname(fileURLToPath(import.meta.url))
const DEFAULT_CONTENT_ROOT = join(MODULE_DIR, '..', '..', 'content')

export { normalizeContentSlug }

export function createFileSystemContentRepository({ contentRoot = DEFAULT_CONTENT_ROOT } = {}) {
  function contentDir(type) {
    if (!CONTENT_TYPES.includes(type)) {
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

  function readMarkdownItem(slug, file, includeContent = false) {
    const raw = readFileSync(file, 'utf-8')
    const { data, content } = matter(raw)
    return includeContent ? { slug, ...data, content } : { slug, ...data }
  }

  return Object.freeze({
    list(type, locale = 'zh') {
      return Array.from(readLocalizedVariants(type).entries())
        .map(([slug, variants]) => {
          const file = chooseLocalizedVariant(variants, locale)
          return file ? readMarkdownItem(slug, file) : null
        })
        .filter(Boolean)
        .sort(compareContentItems)
    },

    get(type, slug, locale = 'zh') {
      const normalizedSlug = normalizeContentSlug(slug)
      const variants = readLocalizedVariants(type).get(normalizedSlug)
      const file = variants && chooseLocalizedVariant(variants, locale)
      if (!file) {
        throw new Error('Not found')
      }
      return readMarkdownItem(normalizedSlug, file, true)
    },
  })
}

export const contentRepository = createFileSystemContentRepository()

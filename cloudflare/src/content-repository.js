import {
  CONTENT_TYPES,
  chooseLocalizedVariant,
  compareContentItems,
  normalizeContentSlug,
} from '../../backend/lib/content-model.mjs'

export const CONTENT_LOCALE = Symbol('contentLocale')

const LIST_VARIANTS_SQL = `
  SELECT a.slug, v.locale, v.metadata_json
  FROM articles AS a
  JOIN article_variants AS v ON v.article_id = a.id
  WHERE a.type = ?
  ORDER BY a.slug ASC, v.locale ASC
`

const GET_VARIANTS_SQL = `
  SELECT a.slug, v.locale, v.metadata_json, v.markdown_body
  FROM articles AS a
  JOIN article_variants AS v ON v.article_id = a.id
  WHERE a.type = ? AND a.slug = ?
  ORDER BY v.locale ASC
`

const LIST_ALL_VARIANTS_SQL = `
  SELECT a.type, a.slug, v.locale, v.metadata_json
  FROM articles AS a
  JOIN article_variants AS v ON v.article_id = a.id
  ORDER BY a.type ASC, a.slug ASC, v.locale ASC
`

function assertContentType(type) {
  if (!CONTENT_TYPES.includes(type)) {
    throw new Error('Unknown content type')
  }
}

function parseMetadata(value) {
  const metadata = JSON.parse(value)
  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') {
    throw new Error('Invalid content metadata')
  }
  return metadata
}

function groupVariants(rows, includeContent) {
  const groups = new Map()
  for (const row of rows) {
    const variants = groups.get(row.slug) || {}
    const item = { slug: row.slug, ...parseMetadata(row.metadata_json) }
    Object.defineProperty(item, CONTENT_LOCALE, { value: row.locale })
    if (includeContent) item.content = row.markdown_body
    variants[row.locale] = item
    groups.set(row.slug, variants)
  }
  return groups
}

export function createD1ContentRepository(database) {
  if (!database) throw new Error('CONTENT_DB binding is required')

  return Object.freeze({
    async list(type, locale = 'zh') {
      assertContentType(type)
      const result = await database.prepare(LIST_VARIANTS_SQL).bind(type).all()
      return Array.from(groupVariants(result.results || [], false).values())
        .map((variants) => chooseLocalizedVariant(variants, locale))
        .filter(Boolean)
        .sort(compareContentItems)
    },

    async get(type, slug, locale = 'zh') {
      assertContentType(type)
      const normalizedSlug = normalizeContentSlug(slug)
      const result = await database
        .prepare(GET_VARIANTS_SQL)
        .bind(type, normalizedSlug)
        .all()
      const variants = groupVariants(result.results || [], true).get(normalizedSlug)
      const item = variants && chooseLocalizedVariant(variants, locale)
      if (!item) throw new Error('Not found')
      return item
    },

    async getVariants(type, slug) {
      assertContentType(type)
      const normalizedSlug = normalizeContentSlug(slug)
      const result = await database.prepare(GET_VARIANTS_SQL).bind(type, normalizedSlug).all()
      const variants = groupVariants(result.results || [], true).get(normalizedSlug)
      if (!variants) throw new Error('Not found')
      return variants
    },

    async listAllVariants() {
      const result = await database.prepare(LIST_ALL_VARIANTS_SQL).all()
      return (result.results || []).map((row) => ({
        type: row.type,
        locale: row.locale,
        slug: row.slug,
        ...parseMetadata(row.metadata_json),
      }))
    },
  })
}

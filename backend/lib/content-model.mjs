export const CONTENT_TYPES = Object.freeze(['projects', 'essays', 'tech-blogs'])

export function normalizeLocale(value) {
  if (typeof value !== 'string') return 'zh'
  return value.toLowerCase().startsWith('en') ? 'en' : 'zh'
}

export function splitLocalizedMarkdownName(file) {
  const name = String(file).split(/[\\/]/).pop()
  const stem = name.endsWith('.md') ? name.slice(0, -3) : name
  if (stem.endsWith('.en')) {
    return { slug: stem.slice(0, -3), locale: 'en' }
  }
  return { slug: stem, locale: 'zh' }
}

export function normalizeContentSlug(slug) {
  return splitLocalizedMarkdownName(`${slug}.md`).slug
}

export function chooseLocalizedVariant(variants, locale) {
  return normalizeLocale(locale) === 'en' ? (variants.en || variants.zh) : variants.zh
}

export function compareContentItems(a, b) {
  if (a.featured && !b.featured) return -1
  if (!a.featured && b.featured) return 1
  const leftDate = a.date || a.startDate || ''
  const rightDate = b.date || b.startDate || ''
  return rightDate.localeCompare(leftDate)
}

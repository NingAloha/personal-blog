import { normalizeSiteUrl, siteConfig } from '../config/site.js'

export function normalizeSitePath(path = '/') {
  if (!path || path === '/') return '/'
  const rawPath = String(path)
  const [pathAndQuery, hash = ''] = rawPath.split('#')
  const [basePath, search = ''] = pathAndQuery.split('?')
  const normalizedPath = basePath.endsWith('/') ? basePath : `${basePath}/`
  const query = search ? `?${search}` : ''
  const fragment = hash ? `#${hash}` : ''
  return `${normalizedPath}${query}${fragment}`
}

export function buildAbsoluteUrl(path = '/') {
  return new URL(normalizeSitePath(path), normalizeSiteUrl(siteConfig.siteUrl)).toString()
}

export function buildAssetUrl(path = siteConfig.avatarPath) {
  return new URL(path, normalizeSiteUrl(siteConfig.siteUrl)).toString()
}

import { writeFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { normalizeSiteUrl, siteConfig } from '../frontend/src/config/site.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const OUTPUT = join(ROOT, 'frontend', 'public', 'robots.txt')
const sitemapUrl = new URL('/sitemap.xml', normalizeSiteUrl(siteConfig.siteUrl)).toString()

const robots = [
  '# Generated during the build from frontend/src/config/site.js.',
  'User-agent: *',
  'Allow: /',
  '',
  `Sitemap: ${sitemapUrl}`,
  '',
].join('\n')

writeFileSync(OUTPUT, robots, 'utf-8')
console.log(`Generated robots.txt: ${OUTPUT}`)

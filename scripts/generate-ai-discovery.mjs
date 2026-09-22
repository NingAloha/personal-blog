import { mkdirSync, writeFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { normalizeSiteUrl, siteConfig } from '../frontend/src/config/site.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const PUBLIC_ROOT = join(ROOT, 'frontend', 'public')
const WELL_KNOWN_ROOT = join(PUBLIC_ROOT, '.well-known')
const siteUrl = normalizeSiteUrl(siteConfig.siteUrl)

function sitePage(path) {
  return new URL(path, siteUrl).toString()
}

const llms = [
  `# ${siteConfig.siteName}`,
  '',
  `> ${siteConfig.description}`,
  '',
  '## Site pages',
  '',
  `- [Home](${sitePage('/')}): Overview of the site.`,
  `- [Projects](${sitePage('/projects/')}): Project portfolio.`,
  `- [Essays](${sitePage('/essays/')}): Personal essays and reflections.`,
  `- [Tech Blog](${sitePage('/tech-blogs/')}): Technical writing and engineering notes.`,
  '',
  '## Usage',
  '',
  'Discovery metadata does not grant permission to reproduce, redistribute, or use protected personal content for model training.',
  '',
].join('\n')

const legacyManifest = {
  specVersion: '1.0',
  host: {
    displayName: siteConfig.siteName,
    documentationUrl: sitePage('/llms.txt'),
  },
  entries: [],
}
const legacyManifestJson = `${JSON.stringify(legacyManifest, null, 2)}\n`
const ardManifestJson = `${JSON.stringify({ entries: [] }, null, 2)}\n`

mkdirSync(WELL_KNOWN_ROOT, { recursive: true })
writeFileSync(join(PUBLIC_ROOT, 'llms.txt'), llms, 'utf-8')
writeFileSync(join(WELL_KNOWN_ROOT, 'ai-catalog.json'), legacyManifestJson, 'utf-8')
writeFileSync(join(WELL_KNOWN_ROOT, 'ard.json'), ardManifestJson, 'utf-8')
console.log(`Generated AI discovery files in ${PUBLIC_ROOT}`)

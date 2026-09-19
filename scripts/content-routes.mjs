import { readdirSync } from 'fs'
import { join, resolve, basename, dirname } from 'path'
import { fileURLToPath } from 'url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(SCRIPT_DIR, '..')
const CONTENT_ROOT = join(ROOT, 'backend', 'content')

const CONTENT_CONFIGS = [
  { dir: 'projects', basePath: '/projects' },
  { dir: 'essays', basePath: '/essays' },
  { dir: 'tech-blogs', basePath: '/tech-blogs' },
]

export const STATIC_ROUTES = ['/', '/projects', '/essays', '/tech-blogs']

export function getContentRoutes() {
  const routes = []
  for (const cfg of CONTENT_CONFIGS) {
    const dirPath = join(CONTENT_ROOT, cfg.dir)
    const files = readdirSync(dirPath)
      .filter((file) => file.endsWith('.md'))
      .filter((file) => !file.endsWith('.en.md'))
      .sort()
    for (const file of files) {
      routes.push(`${cfg.basePath}/${basename(file, '.md')}`)
    }
  }
  return routes
}

export function getAllPrerenderRoutes() {
  return [...STATIC_ROUTES, ...getContentRoutes()]
}

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const SOURCE_ROOT = join(ROOT, 'content')
const TARGET_ROOT = join(ROOT, 'frontend', 'public', 'content')

function syncAssets(dir, relative = '') {
  const sourceDir = join(dir, relative)
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const next = join(relative, entry.name)
    if (entry.isDirectory()) {
      syncAssets(dir, next)
      continue
    }
    if (!entry.name.startsWith('.') && !entry.name.endsWith('.md')) {
      const source = join(dir, next)
      const target = join(TARGET_ROOT, next)
      mkdirSync(dirname(target), { recursive: true })
      cpSync(source, target, { recursive: true, force: true })
    }
  }
}

if (existsSync(TARGET_ROOT)) rmSync(TARGET_ROOT, { recursive: true, force: true })
syncAssets(SOURCE_ROOT)
console.log(`Synced content assets to ${TARGET_ROOT}`)

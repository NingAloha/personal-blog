#!/usr/bin/env node

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  buildImportSql,
  ContentImportError,
  scanContent,
} from './content-importer.mjs'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const CLOUDFLARE_ROOT = resolve(SCRIPT_DIR, '..')
const REPOSITORY_ROOT = resolve(CLOUDFLARE_ROOT, '..')

function usage() {
  return `Usage:
  node scripts/import-content.mjs --dry-run [--content-root PATH]
  node scripts/import-content.mjs --local [--persist-to PATH] [--content-root PATH]
  node scripts/import-content.mjs --remote --confirm-remote --env ENV --bucket BUCKET [--content-root PATH]
`
}

function readOption(args, name) {
  const index = args.indexOf(name)
  if (index < 0) return null
  const value = args[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`)
  return value
}

function parseArguments(args) {
  if (args.includes('--help')) return { help: true }
  const dryRun = args.includes('--dry-run')
  const local = args.includes('--local')
  const remote = args.includes('--remote')
  if ([dryRun, local, remote].filter(Boolean).length !== 1) {
    throw new Error('choose exactly one target: --dry-run, --local, or --remote')
  }
  if (remote && !args.includes('--confirm-remote')) {
    throw new Error('--remote requires --confirm-remote')
  }

  const env = readOption(args, '--env')
  const bucket = readOption(args, '--bucket') || (local ? 'personal-blog-content-local' : null)
  if (remote && (!env || !bucket)) {
    throw new Error('--remote requires both --env and --bucket')
  }

  return {
    dryRun,
    local,
    remote,
    env,
    bucket,
    contentRoot: resolve(readOption(args, '--content-root') || join(REPOSITORY_ROOT, 'content')),
    persistTo: resolve(readOption(args, '--persist-to') || join(CLOUDFLARE_ROOT, '.wrangler', 'state')),
  }
}

function wranglerExecutable() {
  return join(
    CLOUDFLARE_ROOT,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler',
  )
}

function runWrangler(args) {
  const result = spawnSync(wranglerExecutable(), args, {
    cwd: CLOUDFLARE_ROOT,
    encoding: 'utf8',
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`wrangler exited with status ${result.status}`)
  }
}

function targetArguments(options) {
  const args = [options.local ? '--local' : '--remote']
  if (options.local) args.push('--persist-to', options.persistTo)
  if (options.env) args.push('--env', options.env)
  return args
}

function printManifest(manifest, label) {
  const variants = manifest.articles.reduce(
    (count, article) => count + Object.keys(article.variants).length,
    0,
  )
  console.log(`${label}: ${manifest.articles.length} articles, ${variants} variants, ${manifest.media.length} media objects`)
}

function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }

  const manifest = scanContent({ contentRoot: options.contentRoot })
  printManifest(manifest, 'Validated content')
  if (options.dryRun) {
    for (const object of manifest.media) {
      console.log(`  media ${object.key} (${object.contentType}, ${object.byteLength} bytes)`)
    }
    console.log('Dry run completed; D1 and R2 were not modified.')
    return
  }

  const target = targetArguments(options)
  for (const object of manifest.media) {
    try {
      runWrangler([
        'r2', 'object', 'put', `${options.bucket}/${object.key}`,
        ...target,
        '--file', object.sourcePath,
        '--content-type', object.contentType,
        '--cache-control', 'public, max-age=3600',
        '--force',
      ])
    } catch (error) {
      throw new Error(`failed to upload ${object.key}: ${error.message}`)
    }
  }

  const temporaryDir = mkdtempSync(join(tmpdir(), 'personal-blog-d1-import-'))
  try {
    const sqlPath = join(temporaryDir, 'content.sql')
    writeFileSync(sqlPath, buildImportSql(manifest), 'utf8')
    try {
      runWrangler([
        'd1', 'execute', 'CONTENT_DB',
        ...target,
        '--file', sqlPath,
        '--yes',
      ])
    } catch (error) {
      throw new Error(`failed to import D1 content: ${error.message}`)
    }
  } finally {
    rmSync(temporaryDir, { recursive: true, force: true })
  }

  printManifest(manifest, 'Imported content')
}

try {
  main()
} catch (error) {
  if (error instanceof ContentImportError) {
    console.error(error.message)
    for (const issue of error.issues) {
      console.error(`  ${issue.file}: ${issue.message}`)
    }
  } else {
    console.error(error.message)
  }
  console.error(usage())
  process.exitCode = 1
}

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeSiteUrl, siteConfig } from './src/config/site.js'

const rootDir = dirname(fileURLToPath(import.meta.url))

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function siteMetadataPlugin({ siteUrl = siteConfig.siteUrl, robots = 'index,follow,max-image-preview:large', cloudflare = false } = {}) {
  const replacements = {
    '%SITE_URL%': escapeHtml(normalizeSiteUrl(siteUrl)),
    '%SITE_NAME%': escapeHtml(siteConfig.siteName),
    '%SITE_DESCRIPTION%': escapeHtml(siteConfig.description),
    '%ROBOTS%': escapeHtml(robots),
  }

  return {
    name: 'site-metadata',
    transformIndexHtml(html) {
      const result = Object.entries(replacements).reduce(
        (result, [placeholder, value]) => result.replaceAll(placeholder, value),
        html,
      )
      return cloudflare
        ? result.replace(/\s*<link rel="(?:ard|describedby)"[^>]*>/g, '')
        : result
    },
  }
}

function cloudflarePublicAssetsPlugin() {
  const files = ['avatar.jpg', 'favicon.ico', 'icons.svg']
  return {
    name: 'cloudflare-public-assets',
    generateBundle() {
      for (const file of files) {
        this.emitFile({ type: 'asset', fileName: file, source: readFileSync(resolve(rootDir, 'public', file)) })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const cloudflarePreview = mode === 'cloudflare-preview'
  return {
    define: cloudflarePreview ? {
      'import.meta.env.VITE_SITE_URL': JSON.stringify('https://test.ningaloha.com'),
    } : undefined,
    publicDir: cloudflarePreview ? false : 'public',
    plugins: [
      vue(),
      siteMetadataPlugin(cloudflarePreview ? {
        siteUrl: 'https://test.ningaloha.com',
        robots: 'noindex,nofollow',
        cloudflare: true,
      } : undefined),
      ...(cloudflarePreview ? [cloudflarePublicAssetsPlugin()] : []),
    ],
    server: {
      proxy: {
        // 开发时代理 /api 到后端服务
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    preview: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})

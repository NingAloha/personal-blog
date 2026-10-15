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

function siteMetadataPlugin({ siteUrl, robots }) {
  const replacements = {
    '%SITE_URL%': escapeHtml(normalizeSiteUrl(siteUrl)),
    '%SITE_NAME%': escapeHtml(siteConfig.siteName),
    '%SITE_DESCRIPTION%': escapeHtml(siteConfig.description),
    '%ROBOTS%': escapeHtml(robots),
  }

  return {
    name: 'site-metadata',
    transformIndexHtml(html) {
      return Object.entries(replacements).reduce(
        (result, [placeholder, value]) => result.replaceAll(placeholder, value),
        html,
      )
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
  const cloudflareProduction = mode === 'cloudflare-production'
  if (!cloudflarePreview && !cloudflareProduction) {
    throw new Error('Use a Cloudflare build mode: cloudflare-preview or cloudflare-production.')
  }
  const cloudflareSiteUrl = cloudflarePreview ? 'https://test.ningaloha.com' : siteConfig.siteUrl
  return {
    define: {
      'import.meta.env.VITE_SITE_URL': JSON.stringify(cloudflareSiteUrl),
    },
    publicDir: false,
    plugins: [
      vue(),
      siteMetadataPlugin({
        siteUrl: cloudflareSiteUrl,
        robots: cloudflarePreview ? 'noindex,nofollow' : 'index,follow,max-image-preview:large',
      }),
      cloudflarePublicAssetsPlugin(),
    ],
  }
})

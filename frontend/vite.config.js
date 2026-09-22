import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { normalizeSiteUrl, siteConfig } from './src/config/site.js'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function siteMetadataPlugin() {
  const replacements = {
    '%SITE_URL%': escapeHtml(normalizeSiteUrl(siteConfig.siteUrl)),
    '%SITE_NAME%': escapeHtml(siteConfig.siteName),
    '%SITE_DESCRIPTION%': escapeHtml(siteConfig.description),
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), siteMetadataPlugin()],
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
})

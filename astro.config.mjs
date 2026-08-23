// @ts-check
import node from '@astrojs/node'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// static is the default and baseline; server is an optional runtime (ADR-003).
const runtimeMode = process.env.RUNTIME_MODE === 'server' ? 'server' : 'static'

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://example.com',
  output: runtimeMode,
  // Overridable so the dual-mode e2e comparison can build both modes side by side.
  outDir: process.env.ASTRO_OUT_DIR ?? 'dist',
  adapter: runtimeMode === 'server' ? node({ mode: 'standalone' }) : undefined,
  integrations: [
    react(),
    // Build-time sitemap for the static baseline; server mode gets a
    // per-request endpoint in P2-8.
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', zh: 'zh-CN' },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
})

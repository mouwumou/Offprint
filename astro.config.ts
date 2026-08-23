import { existsSync, readFileSync } from 'node:fs'
import node from '@astrojs/node'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import YAML from 'yaml'
import { offprint } from './src/core/integration'
import { redirectsSchema } from './src/core/schema/redirects'

// static is the default and baseline; server is an optional runtime (ADR-003).
const runtimeMode = process.env.RUNTIME_MODE === 'server' ? 'server' : 'static'

// redirects.yaml → Astro redirects: meta-refresh pages on static hosts,
// platform-native rules under Vercel/Netlify/CF adapters, real 30x responses
// under the node adapter (P1-10).
const redirects = existsSync('redirects.yaml')
  ? redirectsSchema.parse(YAML.parse(readFileSync('redirects.yaml', 'utf8')) ?? {})
  : {}

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://example.com',
  output: runtimeMode,
  // Overridable so the dual-mode e2e comparison can build both modes side by side.
  outDir: process.env.ASTRO_OUT_DIR ?? 'dist',
  adapter: runtimeMode === 'server' ? node({ mode: 'standalone' }) : undefined,
  // The write endpoints authenticate via a shared-secret header and no
  // cookie sessions exist, so origin-based CSRF checks only break webhook
  // and CLI callers (they send no Origin header).
  security: { checkOrigin: false },
  redirects,
  integrations: [
    react(),
    // Injects the server-only /api routes when RUNTIME_MODE=server (P2-3);
    // a static build never bundles them (constraint 2).
    offprint(),
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

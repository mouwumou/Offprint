import node from '@astrojs/node'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { FontaineTransform } from 'fontaine'
import { defineConfig } from 'astro/config'
import siteConfig from './src/core/config/current'
import { offprint } from './src/core/integration'

// static is the default and baseline; server is an optional runtime (ADR-003).
const runtimeMode = process.env.RUNTIME_MODE === 'server' ? 'server' : 'static'

// site.yaml `redirects` → Astro redirects (ADR-021): meta-refresh pages on
// static hosts, platform-native rules under Vercel/Netlify/CF adapters, real
// 30x responses under the node adapter (P1-10).
const redirects = siteConfig.redirects

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
  build: {
    // Inline all CSS: removes the render-blocking stylesheet request, which
    // is what keeps mobile-lab LCP under the ≥0.95 Lighthouse bar (P3-9).
    inlineStylesheets: 'always',
  },
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
    plugins: [
      tailwindcss(),
      // Metric-matched local fallback faces (size/ascent/descent overrides):
      // webfont swap stops shifting layout without preloading 200KB of fonts.
      FontaineTransform.vite({
        fallbacks: ['Georgia', 'Times New Roman', 'Arial', 'Segoe UI', 'Helvetica Neue'],
        resolvePath: (id) => new URL(`./node_modules/${id}`, import.meta.url),
      }),
    ],
  },
})

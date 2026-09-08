import node from '@astrojs/node'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { FontaineTransform } from 'fontaine'
import { defineConfig } from 'astro/config'
import { basePathFromSiteUrl } from './src/core/config/base'
import siteConfig from './src/core/config/current'
import { offprint } from './src/core/integration'

// static is the default and baseline; server is an optional runtime (ADR-003).
const runtimeMode = process.env.RUNTIME_MODE === 'server' ? 'server' : 'static'

// ADR-023: SITE_URL is the single source for both the origin (`site`) and
// the deployment sub-path (`base`, e.g. https://user.github.io/repo → /repo).
const siteUrl = process.env.SITE_URL ?? 'https://example.com'
const base = basePathFromSiteUrl(siteUrl)

// site.yaml `redirects` → Astro redirects (ADR-021): meta-refresh pages on
// static hosts, real 30x responses under the node adapter (P1-10). Astro
// prefixes the SOURCES with base but not the destinations, so internal
// targets get it here.
const withBase = (target: string): string => (target.startsWith('/') ? `${base}${target}` : target)
const redirects = Object.fromEntries(
  Object.entries(siteConfig.redirects).map(([from, to]) => [
    from,
    typeof to === 'string' ? withBase(to) : { ...to, destination: withBase(to.destination) },
  ]),
)

export default defineConfig({
  site: new URL(siteUrl).origin,
  ...(base !== '' ? { base } : {}),
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
      // i18n.noindex locales never enter the sitemap (server mode: site-urls.ts).
      filter: (page) => {
        const pathname = new URL(page).pathname
        return !siteConfig.i18n.noindex.some(
          (locale) => pathname === `${base}/${locale}` || pathname.startsWith(`${base}/${locale}/`),
        )
      },
    }),
  ],
  vite: {
    // The runtime mode is a BUILD-time fact: the server bundle must not depend
    // on RUNTIME_MODE being exported again when the process starts (forgetting
    // it silently disabled asset serving, cold start and the content watch —
    // caught by the sub-path e2e). Static builds see the literal 'static', so
    // the server-only branches are dead code there (constraint 2).
    define: { 'import.meta.env.RUNTIME_MODE': JSON.stringify(runtimeMode) },
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

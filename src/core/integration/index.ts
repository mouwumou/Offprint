import { cp, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import type { AstroIntegration } from 'astro'
import siteConfig from '../config/current'
import { contentAssetResponse } from '../server/assets'
import { resolveTheme } from '../theme/resolve'

/**
 * The Offprint Astro integration. Phase 2 scope: inject the server-only API
 * routes when (and only when) building the server runtime — a static build
 * never sees this code (constraint 2). Module-driven route injection for
 * regular pages migrates here in phase 4.
 */
export function offprint(): AstroIntegration {
  // Captured in config:setup for the dev middleware mount (ADR-023).
  let base = ''
  return {
    name: 'offprint',
    hooks: {
      // Static builds ship content/assets as /assets/* (server mode streams
      // them from the content volume via middleware instead).
      'astro:build:done': async ({ dir }) => {
        if ((process.env.RUNTIME_MODE ?? 'static') === 'server') return
        const source = resolve(process.env.CONTENT_DIR ?? 'content', 'assets')
        try {
          await stat(source)
        } catch {
          return
        }
        await cp(source, join(fileURLToPath(dir), 'assets'), { recursive: true })
      },
      // Dev-only /assets serving: static builds copy content/assets in
      // build:done and server mode streams them in middleware — neither path
      // exists under `astro dev`, so cover images 404'd there. This hook
      // never runs in a build, so nothing extra reaches either output.
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(`${base}/assets`, (req, res, next) => {
          const path = (req.url ?? '/').split('?')[0] ?? '/'
          void contentAssetResponse(`/assets${path}`).then(async (asset) => {
            if (asset === null || asset.status !== 200) return next()
            asset.headers.forEach((value, key) => res.setHeader(key, value))
            res.end(Buffer.from(await asset.arrayBuffer()))
          })
        })
      },
      'astro:config:setup': ({ injectRoute, injectScript, config }) => {
        base = config.base.replace(/\/+$/, '')
        // ADR-018: the resolved theme's stylesheet (font loading, theme-
        // specific styles) joins every page; tokens are injected separately
        // by BaseLayout from the manifest. Resolution failures abort the
        // build here, before any page renders.
        const theme = resolveTheme(siteConfig.theme.name)
        if (theme.cssPath !== null) {
          injectScript('page-ssr', `import ${JSON.stringify(theme.cssPath)};`)
        }

        if ((process.env.RUNTIME_MODE ?? 'static') !== 'server') return
        injectRoute({
          pattern: '/api/health',
          entrypoint: './src/core/server/routes/health.ts',
        })
        injectRoute({
          pattern: '/api/revalidate',
          entrypoint: './src/core/server/routes/revalidate.ts',
        })
        injectRoute({
          pattern: '/api/sync',
          entrypoint: './src/core/server/routes/sync.ts',
        })
        injectRoute({
          pattern: '/api/search',
          entrypoint: './src/core/server/routes/search.ts',
        })
        // P2-8: request-time sitemap under the same URLs the static build emits.
        injectRoute({
          pattern: '/sitemap-index.xml',
          entrypoint: './src/core/server/routes/sitemap-index.ts',
        })
        injectRoute({
          pattern: '/sitemap-0.xml',
          entrypoint: './src/core/server/routes/sitemap.ts',
        })
      },
    },
  }
}

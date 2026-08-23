import type { AstroIntegration } from 'astro'

/**
 * The Offprint Astro integration. Phase 2 scope: inject the server-only API
 * routes when (and only when) building the server runtime — a static build
 * never sees this code (constraint 2). Module-driven route injection for
 * regular pages migrates here in phase 4.
 */
export function offprint(): AstroIntegration {
  return {
    name: 'offprint',
    hooks: {
      'astro:config:setup': ({ injectRoute }) => {
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
      },
    },
  }
}

import { defineMiddleware } from 'astro:middleware'
import { ensureContentWatch } from './core/server/watch'

// Server runtime bootstrap: the first request arms the manifest watch.
// In static builds this middleware runs only during prerender, where
// ensureContentWatch is a guarded no-op — nothing server-only reaches dist/.
export const onRequest = defineMiddleware((_context, next) => {
  ensureContentWatch()
  return next()
})

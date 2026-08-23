import { defineMiddleware } from 'astro:middleware'
import { contentAssetResponse } from './core/server/assets'
import { coldStartResponse } from './core/server/coldstart'
import { ensureContentWatch } from './core/server/watch'

// Server runtime bootstrap: the first request arms the manifest watch, and
// until the very first manifest exists HTML routes get the §5 cold-start
// page. In static builds this middleware runs only during prerender, where
// both branches are guarded no-ops — nothing server-only reaches dist/.
export const onRequest = defineMiddleware(async (context, next) => {
  if ((process.env['RUNTIME_MODE'] ?? 'static') === 'server') {
    ensureContentWatch()
    const asset = await contentAssetResponse(context.url.pathname)
    if (asset) return asset
    const syncing = await coldStartResponse(context.url.pathname)
    if (syncing) return syncing
  }
  return next()
})

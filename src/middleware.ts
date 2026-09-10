import { defineMiddleware } from 'astro:middleware'
import { contentAssetResponse } from './core/server/assets'
import { coldStartResponse } from './core/server/coldstart'
import { ensureContentWatch } from './core/server/watch'

// Server runtime bootstrap: the first request arms the manifest watch, and
// until the very first manifest exists HTML routes get the cold-start
// page. RUNTIME_MODE is inlined at build time (astro.config `define`): in a
// static build this branch is the literal `false` and nothing server-only
// reaches dist/; in a server build it needs no environment at start-up.
export const onRequest = defineMiddleware(async (context, next) => {
  if (import.meta.env.RUNTIME_MODE === 'server') {
    ensureContentWatch()
    const asset = await contentAssetResponse(context.url.pathname)
    if (asset) return asset
    const syncing = await coldStartResponse(context.url.pathname)
    if (syncing) return syncing
  }
  return next()
})

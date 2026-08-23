import type { APIRoute } from 'astro'
import { versionedResponse } from '../../seo/etag'

/** GET /sitemap-index.xml (server mode) — same URL the static build emits. */
export const GET: APIRoute = (context) =>
  versionedResponse(context, 'application/xml; charset=utf-8', async () => {
    const site = context.site ?? new URL('https://example.com')
    const loc = new URL('/sitemap-0.xml', site).toString()
    return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${loc}</loc></sitemap></sitemapindex>`
  })

import type { APIRoute } from 'astro'
import { versionedResponse } from '../../seo/etag'
import { listSiteUrls, sitemapXml } from '../../seo/site-urls'

/** GET /sitemap-0.xml (server mode) — same URL the static build emits. */
export const GET: APIRoute = (context) =>
  versionedResponse(context, 'application/xml; charset=utf-8', async () =>
    sitemapXml(await listSiteUrls(), context.site ?? new URL('https://example.com')),
  )

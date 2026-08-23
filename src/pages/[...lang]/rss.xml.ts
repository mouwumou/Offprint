import type { APIRoute } from 'astro'
import siteConfig from '../../core/config/current'
import { versionedResponse } from '../../core/seo/etag'
import { feedData } from '../../core/seo/feed-data'
import { buildRss } from '../../core/seo/feeds'

export function getStaticPaths() {
  if (!siteConfig.modules.blog) return []
  return siteConfig.i18n.locales.map((locale) => ({
    params: { lang: locale === siteConfig.i18n.default ? undefined : locale },
  }))
}

export const GET: APIRoute = (context) =>
  versionedResponse(context, 'application/rss+xml; charset=utf-8', async () => {
    const data = await feedData(context, 'rss.xml')
    if (data === null || !siteConfig.modules.blog) return null
    return buildRss(data.meta, data.items)
  })

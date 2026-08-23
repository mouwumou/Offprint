import type { APIRoute } from 'astro'
import siteConfig from '../../core/config/current'
import { feedData } from '../../core/seo/feed-data'
import { buildRss } from '../../core/seo/feeds'

export function getStaticPaths() {
  if (!siteConfig.modules.blog) return []
  return siteConfig.i18n.locales.map((locale) => ({
    params: { lang: locale === siteConfig.i18n.default ? undefined : locale },
  }))
}

export const GET: APIRoute = async (context) => {
  const data = await feedData(context, 'rss.xml')
  if (data === null || !siteConfig.modules.blog) {
    return new Response(null, { status: 404 })
  }
  return new Response(buildRss(data.meta, data.items), {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}

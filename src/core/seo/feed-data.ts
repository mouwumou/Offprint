import type { APIContext } from 'astro'
import siteConfig from '../config/current'
import { homePath, langPrefix } from '../config/nav'
import { getProvider } from '../content'
import { resolveLocalized } from '../schema'
import type { FeedItem, FeedMeta } from './feeds'

/** Shared per-language feed assembly for the rss/atom/json endpoints. */
export async function feedData(
  context: APIContext,
  filename: string,
): Promise<{ meta: FeedMeta; items: FeedItem[] } | null> {
  const langParam = context.params['lang']
  const lang = langParam ?? siteConfig.i18n.default
  if (!siteConfig.i18n.locales.includes(lang) || langParam === siteConfig.i18n.default) {
    return null
  }
  const site = context.site ?? new URL('https://example.com')
  const prefix = langPrefix(siteConfig, lang)
  const posts = await getProvider().listPosts({ lang })
  const profile = await getProvider().getProfile()
  const name = resolveLocalized(profile.name, lang, siteConfig.i18n.default) ?? ''
  const tagline = resolveLocalized(profile.tagline, lang, siteConfig.i18n.default) ?? ''
  return {
    meta: {
      title: name,
      description: tagline,
      siteUrl: new URL(homePath(siteConfig, lang), site).toString(),
      feedUrl: new URL(`${prefix}/${filename}`, site).toString(),
      lang,
    },
    items: posts.map((post) => ({
      title: post.title,
      url: new URL(`${prefix}/blog/${post.urlname}/`, site).toString(),
      date: post.date,
      updated: post.updated,
      description: post.description,
      categories: post.tags,
    })),
  }
}

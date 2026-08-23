import siteConfig from '../config/current'
import { langPrefix } from '../config/nav'
import { getProvider } from '../content'
import { filterSlug } from '../content/filter-slug'
import { collectCategories } from '../content/posts-view'
import { uniformAlternates, type Alternate } from './alternates'

export interface SiteUrl {
  path: string
  alternates: Alternate[]
}

/**
 * Every routable page with its hreflang alternates — the server-mode sitemap
 * source (P2-8), mirroring what the routes' getStaticPaths produce in a
 * static build.
 */
export async function listSiteUrls(): Promise<SiteUrl[]> {
  const provider = getProvider()
  const urls: SiteUrl[] = []

  const uniform = (path: string): void => {
    const alternates = uniformAlternates(siteConfig, path)
    for (const alternate of alternates) {
      urls.push({ path: alternate.path, alternates })
    }
  }

  uniform('/')
  if (siteConfig.modules.projects) uniform('/projects')
  if (siteConfig.modules.cv) uniform('/cv')
  if (siteConfig.modules.publications) {
    uniform('/publications')
    for (const pub of await provider.listPublications()) {
      uniform(`/publications/${pub.key}`)
    }
  }

  if (siteConfig.modules.blog) {
    uniform('/blog')
    const posts = await provider.listPosts()
    for (const { tag } of await provider.listTags()) {
      uniform(`/blog/tag/${filterSlug(tag)}`)
    }
    for (const category of collectCategories(posts)) {
      uniform(`/blog/category/${filterSlug(category)}`)
    }
    const byUrlname = new Map<string, { lang: string }[]>()
    for (const post of posts) {
      byUrlname.set(post.urlname, [...(byUrlname.get(post.urlname) ?? []), { lang: post.lang }])
    }
    for (const [urlname, translations] of byUrlname) {
      const alternates = translations.map(({ lang }) => ({
        lang,
        path: `${langPrefix(siteConfig, lang)}/blog/${urlname}/`,
      }))
      for (const alternate of alternates) {
        urls.push({ path: alternate.path, alternates })
      }
    }
  }

  if (siteConfig.modules.pages) {
    const pages = await provider.listPages()
    const bySlug = new Map<string, { lang: string }[]>()
    for (const page of pages) {
      bySlug.set(page.slug, [...(bySlug.get(page.slug) ?? []), { lang: page.lang }])
    }
    for (const [slug, translations] of bySlug) {
      const alternates = translations.map(({ lang }) => ({
        lang,
        path: `${langPrefix(siteConfig, lang)}/${slug}`,
      }))
      for (const alternate of alternates) {
        urls.push({ path: alternate.path, alternates })
      }
    }
  }

  return urls
}

function escapeXml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

/** urlset XML with xhtml:link alternates, matching the static integration's shape. */
export function sitemapXml(urls: SiteUrl[], site: URL): string {
  const body = urls
    .map((url) => {
      const loc = escapeXml(new URL(url.path, site).toString())
      const links =
        url.alternates.length > 1
          ? url.alternates
              .map(
                (alternate) =>
                  `<xhtml:link rel="alternate" hreflang="${alternate.lang === 'zh' ? 'zh-CN' : alternate.lang}" href="${escapeXml(new URL(alternate.path, site).toString())}"/>`,
              )
              .join('')
          : ''
      return `<url><loc>${loc}</loc>${links}</url>`
    })
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}</urlset>`
}

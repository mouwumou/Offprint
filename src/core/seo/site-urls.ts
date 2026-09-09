import siteConfig from '../config/current'
import { langPrefix } from '../config/nav'
import { getProvider } from '../content'
import { filterSlug } from '../content/filter-slug'
import { categoriesForLanguage, tagsForLanguage } from '../content/posts-view'
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

  // The static build emits directory URLs, so its sitemap ends every loc in
  // a slash — mirror that exactly (dual-mode parity for sitemaps).
  const slash = (path: string): string => (path.endsWith('/') ? path : `${path}/`)
  // i18n.noindex locales are neither listed nor advertised as alternates.
  const hidden = siteConfig.i18n.noindex
  const isHidden = (path: string): boolean =>
    hidden.some((locale) => {
      const prefix = langPrefix(siteConfig, locale)
      return path === prefix || path === `${prefix}/` || path.startsWith(`${prefix}/`)
    })
  const push = (path: string, alternates: Alternate[]): void => {
    if (isHidden(path)) return
    urls.push({
      path: slash(path),
      alternates: alternates
        .filter((alternate) => !hidden.includes(alternate.lang))
        .map((alternate) => ({ ...alternate, path: slash(alternate.path) })),
    })
  }
  const uniform = (path: string): void => {
    const alternates = uniformAlternates(siteConfig, path)
    for (const alternate of alternates) {
      push(alternate.path, alternates)
    }
  }

  uniform('/')
  if (siteConfig.modules.projects.enabled) uniform('/projects')
  const cv = siteConfig.modules.cv
  if (cv.enabled && cv.pdf === undefined && cv.indexable !== false) uniform('/cv')
  if (siteConfig.modules.publications.enabled) {
    uniform('/publications')
    for (const pub of await provider.listPublications()) {
      uniform(`/publications/${pub.key}`)
    }
  }

  if (siteConfig.modules.blog.enabled) {
    uniform('/blog')
    if (siteConfig.modules.blog.search !== false) uniform('/search')
    const posts = await provider.listPosts()
    // Tags/categories exist per language (ADR-007 list rule); alternates
    // interlink only the languages that actually carry the term.
    const perLanguage = (kind: 'tag' | 'category'): void => {
      const langsByTerm = new Map<string, string[]>()
      for (const locale of siteConfig.i18n.locales) {
        const terms =
          kind === 'tag'
            ? tagsForLanguage(posts, locale).map(({ tag }) => tag)
            : categoriesForLanguage(posts, locale)
        for (const term of terms) {
          langsByTerm.set(term, [...(langsByTerm.get(term) ?? []), locale])
        }
      }
      for (const [term, langs] of langsByTerm) {
        const alternates = langs.map((locale) => ({
          lang: locale,
          path: `${langPrefix(siteConfig, locale)}/blog/${kind}/${filterSlug(term)}`,
        }))
        for (const alternate of alternates) {
          push(alternate.path, alternates)
        }
      }
    }
    perLanguage('tag')
    perLanguage('category')
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
        push(alternate.path, alternates)
      }
    }
  }

  if (siteConfig.modules.pages.enabled) {
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
        push(alternate.path, alternates)
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

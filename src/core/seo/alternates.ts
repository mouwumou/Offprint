import { homePath, langPrefix } from '../config/nav'
import type { SiteConfig } from '../config/schema'
import { filterSlug } from '../content/filter-slug'
import { categoriesForLanguage, tagsForLanguage } from '../content/posts-view'

export interface Alternate {
  lang: string
  /** Root-relative path including the language prefix. */
  path: string
}

/**
 * hreflang alternates for a page that exists in every locale (home, lists,
 * CV…): one entry per locale for the same unprefixed path.
 */
export function uniformAlternates(config: SiteConfig, path: string): Alternate[] {
  const clean = path === '/' ? '' : path
  return config.i18n.locales.map((locale) => ({
    lang: locale,
    path: clean === '' ? homePath(config, locale) : `${langPrefix(config, locale)}${clean}`,
  }))
}

type Posts = Parameters<typeof tagsForLanguage>[0]

/**
 * hreflang alternates for a tag/category page: only the languages whose own
 * display list carries the term (per-language list rule) — a uniform set linked
 * every language to pages that do not exist for single-language terms.
 */
export function termAlternates(
  config: SiteConfig,
  posts: Posts,
  kind: 'tag' | 'category',
  term: string,
): Alternate[] {
  return config.i18n.locales
    .filter((locale) =>
      kind === 'tag'
        ? tagsForLanguage(posts, locale).some(({ tag }) => tag === term)
        : categoriesForLanguage(posts, locale).includes(term),
    )
    .map((locale) => ({
      lang: locale,
      path: `${langPrefix(config, locale)}/blog/${kind}/${filterSlug(term)}`,
    }))
}

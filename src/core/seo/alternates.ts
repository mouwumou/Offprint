import { langPrefix } from '../config/nav'
import type { SiteConfig } from '../config/schema'

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
    path: `${langPrefix(config, locale)}${clean}` || '/',
  }))
}

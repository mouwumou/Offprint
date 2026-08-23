import { useTranslations, type MessageKey } from '../i18n'
import type { SiteConfig } from './schema'

export interface NavItem {
  href: string
  label: string
  /** Match the URL exactly (home) instead of by prefix. */
  exact?: boolean
}

// Static module → nav mapping until the full module registry lands (P1-9).
// Pages with `nav: true` are injected on top of this in P1-7c.
const moduleNav: { module: 'blog' | 'projects' | 'cv'; path: string; key: MessageKey }[] = [
  { module: 'blog', path: '/blog', key: 'nav.writing' },
  { module: 'projects', path: '/projects', key: 'nav.projects' },
  { module: 'cv', path: '/cv', key: 'nav.cv' },
]

/** URL prefix for a language: '' for the default language, '/zh' style otherwise. */
export function langPrefix(config: SiteConfig, lang: string): string {
  return lang === config.i18n.default ? '' : `/${lang}`
}

/** Navigation entries for the enabled modules (constraint 5), lang-prefixed. */
export function buildNav(config: SiteConfig, lang: string): NavItem[] {
  const t = useTranslations(lang)
  const prefix = langPrefix(config, lang)
  const items: NavItem[] = [{ href: prefix || '/', label: t('nav.home'), exact: true }]
  for (const entry of moduleNav) {
    if (config.modules[entry.module]) {
      items.push({ href: `${prefix}${entry.path}`, label: t(entry.key) })
    }
  }
  return items
}

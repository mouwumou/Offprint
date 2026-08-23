import { useTranslations, type MessageKey } from '../i18n'
import { resolveLocalized } from '../schema/localized'
import type { SiteConfig } from './schema'

export interface NavItem {
  href: string
  label: string
  /** Match the URL exactly (home) instead of by prefix. */
  exact?: boolean
}

/** The slice of a page summary the nav needs. */
export interface NavPage {
  slug: string
  title: string
  lang: string
  nav: boolean
}

const moduleTargets: Record<
  'home' | 'blog' | 'publications' | 'projects' | 'cv',
  { path: string; key: MessageKey; exact?: boolean }
> = {
  home: { path: '', key: 'nav.home', exact: true },
  blog: { path: '/blog', key: 'nav.writing' },
  publications: { path: '/publications', key: 'nav.publications' },
  projects: { path: '/projects', key: 'nav.projects' },
  cv: { path: '/cv', key: 'nav.cv' },
}

/** URL prefix for a language: '' for the default language, '/zh' style otherwise. */
export function langPrefix(config: SiteConfig, lang: string): string {
  return lang === config.i18n.default ? '' : `/${lang}`
}

/**
 * Navigation as data (ADR-015). Without config.nav the theme default applies:
 * home, every enabled module, then pages flagged nav:true. With config.nav
 * the author's list is authoritative — entries pointing at a disabled module
 * or a missing page are skipped instead of breaking the build.
 */
export function resolveNav(config: SiteConfig, lang: string, pages: readonly NavPage[]): NavItem[] {
  const t = useTranslations(lang)
  const prefix = langPrefix(config, lang)
  const items: NavItem[] = []

  const pushModule = (name: keyof typeof moduleTargets, label?: string): void => {
    const target = moduleTargets[name]
    items.push({
      href: name === 'home' ? prefix || '/' : `${prefix}${target.path}`,
      label: label ?? t(target.key),
      ...(target.exact !== undefined && { exact: target.exact }),
    })
  }

  // A page summary may be the other-language fallback (ADR-007 list rule);
  // link it under ITS OWN language prefix — prefixing the requested language
  // onto a page that has no translation there manufactures a dead URL.
  const pageHref = (page: NavPage): string => `${langPrefix(config, page.lang)}/${page.slug}`

  if (config.nav === undefined) {
    pushModule('home')
    for (const name of ['blog', 'publications', 'projects', 'cv'] as const) {
      if (config.modules[name].enabled) pushModule(name)
    }
    if (config.modules.pages.enabled) {
      for (const page of pages.filter((page) => page.nav)) {
        items.push({ href: pageHref(page), label: page.title })
      }
    }
    return items
  }

  for (const entry of config.nav) {
    const label = resolveLocalized(entry.label, lang, config.i18n.default)
    if ('module' in entry) {
      if (entry.module !== 'home' && !config.modules[entry.module].enabled) continue
      pushModule(entry.module, label)
    } else if ('page' in entry) {
      if (!config.modules.pages.enabled) continue
      const page = pages.find((candidate) => candidate.slug === entry.page)
      if (page === undefined) continue
      items.push({ href: pageHref(page), label: label ?? page.title })
    } else {
      const isExternal = /^[a-z][a-z0-9+.-]*:|^\/\//i.test(entry.href)
      items.push({
        href: isExternal ? entry.href : `${prefix}${entry.href}`,
        label: label ?? entry.href,
      })
    }
  }
  return items
}

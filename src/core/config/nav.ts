import { useTranslations, type MessageKey } from '../i18n'
import { getModule, getModules } from '../modules/registry'
import { resolveLocalized, type LocalizedString } from '../schema/localized'
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

// 'home' is the one non-module nav target; every other slot comes from the
// module registry (ADR-019) — a registered module with a nav field gets one.
const HOME_TARGET: Target = { path: '', key: 'nav.home' as MessageKey, exact: true }

interface Target {
  path: string
  key?: MessageKey | undefined
  label?: LocalizedString | undefined
  exact?: boolean
}

function moduleTarget(id: string): Target | null {
  if (id === 'home') return HOME_TARGET
  const nav = getModule(id)?.nav
  return nav ? { path: nav.path, key: nav.labelKey, label: nav.label } : null
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

  const pushModule = (name: string, label?: string): void => {
    const target = moduleTarget(name)
    if (target === null) return
    const fallback =
      target.key !== undefined
        ? t(target.key)
        : (resolveLocalized(target.label, lang, config.i18n.default) ?? name)
    items.push({
      href: name === 'home' ? prefix || '/' : `${prefix}${target.path}`,
      label: label ?? fallback,
      ...(target.exact !== undefined && { exact: target.exact }),
    })
  }

  // A page summary may be the other-language fallback (ADR-007 list rule);
  // link it under ITS OWN language prefix — prefixing the requested language
  // onto a page that has no translation there manufactures a dead URL.
  const pageHref = (page: NavPage): string => `${langPrefix(config, page.lang)}/${page.slug}`

  if (config.nav === undefined) {
    pushModule('home')
    for (const module of getModules()) {
      if (module.nav && config.modules[module.id]?.enabled) pushModule(module.id)
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
      if (entry.module !== 'home' && config.modules[entry.module]?.enabled !== true) continue
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

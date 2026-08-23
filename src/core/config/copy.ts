import { useTranslations, type MessageKey } from '../i18n'
import { resolveLocalized } from '../schema/localized'
import type { SiteConfig } from './schema'

const themeDefaults: Record<
  'blog' | 'projects' | 'publications' | 'cv',
  { title: MessageKey; description?: MessageKey }
> = {
  blog: { title: 'blog.title', description: 'blog.description' },
  projects: { title: 'projects.title', description: 'projects.description' },
  publications: { title: 'pub.title', description: 'pub.description' },
  cv: { title: 'cv.title' },
}

/**
 * A module's landing copy (ADR-015): the author's override from
 * modules.<name>, falling back to the theme's i18n defaults.
 */
export function moduleCopy(
  config: SiteConfig,
  module: keyof typeof themeDefaults,
  lang: string,
): { title: string; description: string | undefined } {
  const t = useTranslations(lang)
  const setting = config.modules[module]
  const defaults = themeDefaults[module]
  const title =
    resolveLocalized(setting.title, lang, config.i18n.default) ?? t(defaults.title)
  const description =
    resolveLocalized(setting.description, lang, config.i18n.default) ??
    (defaults.description ? t(defaults.description) : undefined)
  return { title, description }
}

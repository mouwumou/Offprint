import { useTranslations } from '../i18n'
import { getModule } from '../modules/registry'
import { resolveLocalized } from '../schema/localized'
import type { SiteConfig } from './schema'

/**
 * A module's landing copy: the author's override from
 * modules.<name>, falling back to the defaults the module registered
 *, falling back to the module id.
 */
export function moduleCopy(
  config: SiteConfig,
  module: string,
  lang: string,
): { title: string; description: string | undefined } {
  const t = useTranslations(lang)
  const setting = config.modules[module]
  const defaults = getModule(module)?.copy
  const title =
    resolveLocalized(setting?.title, lang, config.i18n.default) ??
    (defaults?.titleKey !== undefined ? t(defaults.titleKey) : undefined) ??
    resolveLocalized(defaults?.title, lang, config.i18n.default) ??
    module
  const description =
    setting?.description === false
      ? undefined
      : (resolveLocalized(setting?.description, lang, config.i18n.default) ??
        (defaults?.descriptionKey !== undefined ? t(defaults.descriptionKey) : undefined) ??
        resolveLocalized(defaults?.description, lang, config.i18n.default))
  return { title, description }
}

/**
 * The <meta name="description"> of a module landing page: the author's
 * description when there is one, otherwise a neutral "<title> by <name>" —
 * a bare title on the page is fine, a page without a summary is not (search
 * engines, and the Lighthouse SEO audit, expect one).
 */
export function moduleMetaDescription(
  config: SiteConfig,
  module: string,
  lang: string,
  authorName: string,
): string {
  const { title, description } = moduleCopy(config, module, lang)
  if (description) return description
  return useTranslations(lang)('meta.landing')
    .replace('{title}', title)
    .replace('{name}', authorName)
}

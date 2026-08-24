import { useTranslations } from '../i18n'
import { getModule } from '../modules/registry'
import { resolveLocalized } from '../schema/localized'
import type { SiteConfig } from './schema'

/**
 * A module's landing copy (ADR-015): the author's override from
 * modules.<name>, falling back to the defaults the module registered
 * (ADR-019), falling back to the module id.
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
    (defaults ? t(defaults.title) : module)
  const description =
    resolveLocalized(setting?.description, lang, config.i18n.default) ??
    (defaults?.description ? t(defaults.description) : undefined)
  return { title, description }
}

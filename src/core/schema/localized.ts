import { z } from 'zod'

/**
 * A translatable value: a single string shared by all languages, or a
 * per-language record like `{ en: 'Physics', zh: '物理' }`.
 * Used by site config and content collections alike.
 */
export const localizedString = z.union([z.string(), z.record(z.string(), z.string())])

export type LocalizedString = z.infer<typeof localizedString>

/**
 * Resolve a localized value for `lang`, falling back to `fallbackLang`,
 * then to any available translation.
 */
export function resolveLocalized(
  value: LocalizedString | undefined,
  lang: string,
  fallbackLang?: string,
): string | undefined {
  if (value === undefined || typeof value === 'string') return value
  return (
    value[lang] ??
    (fallbackLang !== undefined ? value[fallbackLang] : undefined) ??
    Object.values(value)[0]
  )
}

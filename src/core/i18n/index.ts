import { en, type MessageKey } from './en'
import { zh } from './zh'

const dictionaries: Record<string, Record<MessageKey, string>> = { en, zh }

/**
 * UI strings live here and only here (constraint 9). Pluggable-template users
 * add languages by adding a dictionary file; unknown languages fall back to en.
 */
export function useTranslations(lang: string): (key: MessageKey) => string {
  const dictionary = dictionaries[lang] ?? en
  return (key) => dictionary[key] ?? en[key]
}

const selfLabels: Record<string, string> = { en: 'EN', zh: '中' }

/** How a language names itself in the switcher (DESIGN-REFERENCE §4: EN / 中). */
export function selfLabel(locale: string): string {
  return selfLabels[locale] ?? locale.toUpperCase()
}

/** Localized long date, e.g. "June 14, 2025" / "2025年6月14日". */
export function formatDate(date: Date, lang: string): string {
  try {
    return date.toLocaleDateString(lang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    })
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

export type { MessageKey } from './en'

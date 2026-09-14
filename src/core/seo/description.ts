import { plainText } from '../content/text'
import { resolveLocalized, type Profile } from '../schema'

const MAX_LENGTH = 160

/**
 * The home page's meta description: the tagline when there is one, else the
 * first bio paragraph trimmed to a summary, else the name. A home page never
 * goes without one — search engines expect it, and the Lighthouse SEO gate
 * scores its absence.
 */
export function homeDescription(
  profile: Profile,
  lang: string,
  defaultLang: string,
): string | undefined {
  const tagline = resolveLocalized(profile.tagline, lang, defaultLang)
  if (tagline) return tagline
  const first =
    profile.bio[0] !== undefined ? resolveLocalized(profile.bio[0], lang, defaultLang) : ''
  const text = plainText(first ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text) return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH - 1).trimEnd()}…` : text
  return resolveLocalized(profile.name, lang, defaultLang) || undefined
}

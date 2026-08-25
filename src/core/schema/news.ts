import { z } from 'zod'
import { isoDate } from './common'
import { localizedString } from './localized'

/**
 * One entry of content/news.yaml — the homepage "news" section (paper
 * accepted, talk given, award won). Deliberately tiny: a date, a localized
 * line, an optional link. No archive page in v1 (maintainer decision).
 */
export const newsItemSchema = z.strictObject({
  date: isoDate,
  text: localizedString,
  /** Internal path (/blog/…) or absolute URL. */
  href: z.string().min(1).optional(),
})

export const newsFileSchema = z.array(newsItemSchema)

export type NewsItem = z.output<typeof newsItemSchema>

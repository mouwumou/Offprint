import { z } from 'zod'

/** URL-safe identifier used by urlname/slug fields (CONTENT-CONTRACT §2). */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'expected a slug containing only a-z, 0-9 and hyphens')

/**
 * Dates arrive either as strings (`2025-07-02`, full ISO datetime) or as Date
 * instances (YAML parsers auto-convert bare dates). Output is always a Date.
 */
export const isoDate = z.union(
  [
    z.date(),
    z.iso.date().transform((value) => new Date(`${value}T00:00:00Z`)),
    z.iso.datetime({ offset: true, local: true }).transform((value) => new Date(value)),
  ],
  'expected an ISO date (YYYY-MM-DD or full ISO datetime)',
)

/** Cover images must live on a configured image host or under content/assets/. */
export const coverSource = z
  .string()
  .refine(
    (value) => /^https?:\/\//.test(value) || value.startsWith('assets/'),
    'cover must be an http(s) URL or an assets/ path',
  )

/** `categories: geometry` and `categories: [geometry]` are both valid input. */
export const stringOrStringArray = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : [value]))

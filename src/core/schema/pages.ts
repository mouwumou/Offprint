import { z } from 'zod'
import { isoDate, slugSchema } from './common'

/**
 * Standalone-page front-matter (CONTENT-CONTRACT §6a): About, Now, … —
 * Notion rows with type=Page. Body syntax is identical to posts.
 */
export const pageFrontmatterSchema = z
  .looseObject({
    title: z.string().min(1),
    slug: slugSchema,
    /** Required (ADR-007). */
    lang: z.string().min(2),
    updated: isoDate.optional(),
    /** Whether the page appears in the site navigation. */
    nav: z.boolean().default(false),
    /** Navigation position among pages; lower comes first. */
    order: z.number().int().default(0),
  })
  .transform(({ title, slug, lang, updated, nav, order, ...extra }) => ({
    title,
    slug,
    lang,
    updated,
    nav,
    order,
    extra: extra as Record<string, unknown>,
  }))

export type PageFrontmatter = z.output<typeof pageFrontmatterSchema>

import { z } from 'zod'
import { coverSource, isoDate, slugSchema, stringOrStringArray } from './common'

/**
 * Post front-matter (CONTENT-CONTRACT §2). Tool-agnostic: anything that emits
 * markdown + this YAML front-matter is a valid source. Unknown keys are not an
 * error — they pass through under `extra` for pages to read.
 */
export const postFrontmatterSchema = z
  .looseObject({
    title: z.string().min(1),
    /** Route is /[lang/]blog/:urlname; translations share one urlname (ADR-007). */
    urlname: slugSchema,
    /** First published. */
    date: isoDate,
    /** Last edited; sync backfills from `date` (with a warning) when missing. */
    updated: isoDate,
    description: z.string().optional(),
    /** First entry doubles as the kicker. */
    categories: stringOrStringArray.default([]),
    tags: z.array(z.string()).default([]),
    cover: coverSource.optional(),
    /** Required (ADR-007); sync backfills the default language with a warning. */
    lang: z.string().min(2),
    /** Posts in the same series interlink. */
    series: z.string().optional(),
    top: z.boolean().default(false),
    /** Draft files are kept but excluded from indexes and feeds. */
    draft: z.boolean().default(false),
    /** Show "Cite this post". */
    cite: z.boolean().default(true),
    doi: z.string().optional(),
    /** Points to the original when republishing. */
    canonical: z.url().optional(),
    /** Optional override; the markdown pipeline auto-detects math otherwise. */
    math: z.boolean().optional(),
  })
  .transform(
    ({
      title,
      urlname,
      date,
      updated,
      description,
      categories,
      tags,
      cover,
      lang,
      series,
      top,
      draft,
      cite,
      doi,
      canonical,
      math,
      ...extra
    }) => ({
      title,
      urlname,
      date,
      updated,
      description,
      categories,
      tags,
      cover,
      lang,
      series,
      top,
      draft,
      cite,
      doi,
      canonical,
      math,
      extra: extra as Record<string, unknown>,
    }),
  )

export type PostFrontmatter = z.output<typeof postFrontmatterSchema>

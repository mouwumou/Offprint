import { z } from 'zod'
import { coverSource, slugSchema } from './common'
import { localizedString } from './localized'

export const publicationTypeSchema = z.enum([
  'journal',
  'conference',
  'preprint',
  'workshop',
  'thesis',
])

/**
 * One entry of content/publications.yaml (docs/CONTENT-CONTRACT.md §3), exported by
 * sync from a Notion database. Unknown fields pass through under
 * `extra` like the other collections.
 */
export const publicationSchema = z
  .looseObject({
    /** Stable identifier; also the BibTeX key. */
    key: slugSchema.or(
      z.string().regex(/^[a-z0-9-]+$/i, 'expected an identifier like voss2025geometry'),
    ),
    title: localizedString,
    /** Byline order; entries matching profile.nameVariants get highlighted. */
    authors: z.array(z.string().min(1)).nonempty(),
    year: z.number().int().min(1000).max(3000),
    venue: z.string().min(1),
    type: publicationTypeSchema,
    /** Appears in the homepage Selected work section. */
    selected: z.boolean().default(false),
    doi: z.string().optional(),
    arxiv: z.string().optional(),
    pdf: z.url().optional(),
    code: z.url().optional(),
    data: z.url().optional(),
    slides: z.url().optional(),
    poster: z.url().optional(),
    video: z.url().optional(),
    website: z.url().optional(),
    award: z.string().optional(),
    /** Entry thumbnail for list layouts: assets/… path or absolute URL. */
    thumbnail: coverSource.optional(),
    abstract: localizedString.optional(),
    /** Hand-written override; otherwise BibTeX is generated from the fields above. */
    bibtex: z.string().optional(),
  })
  .transform(
    ({
      key,
      title,
      authors,
      year,
      venue,
      type,
      selected,
      doi,
      arxiv,
      pdf,
      code,
      data,
      slides,
      poster,
      video,
      website,
      award,
      thumbnail,
      abstract,
      bibtex,
      ...extra
    }) => ({
      key,
      title,
      authors,
      year,
      venue,
      type,
      selected,
      doi,
      arxiv,
      pdf,
      code,
      data,
      slides,
      poster,
      video,
      website,
      award,
      thumbnail,
      abstract,
      bibtex,
      extra: extra as Record<string, unknown>,
    }),
  )

export const publicationsFileSchema = z.array(publicationSchema)

export type Publication = z.output<typeof publicationSchema>
export type PublicationType = z.output<typeof publicationTypeSchema>

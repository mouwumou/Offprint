import { z } from 'zod'
import { localizedString } from './localized'

// Pragmatic zod subset of the JSON Resume schema (https://jsonresume.org/schema),
// per CONTENT-CONTRACT §5: YAML-authored, every free-text field may be
// localized {en, zh}, unknown fields pass through untouched. Extensions:
// `teaching[]` (same shape as work) and `publicationsFromSite` (render the
// publications collection instead of an inline list). `period` may override
// the derived startDate–endDate display anywhere.

const timelineBase = {
  location: localizedString.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  /** Free-form display override, e.g. "2023, 2024". */
  period: z.string().optional(),
  summary: localizedString.optional(),
}

export const workEntrySchema = z.looseObject({
  /** Organization (JSON Resume calls this `name`). */
  name: localizedString.optional(),
  position: localizedString.optional(),
  highlights: z.array(localizedString).default([]),
  ...timelineBase,
})

export const educationEntrySchema = z.looseObject({
  institution: localizedString.optional(),
  area: localizedString.optional(),
  studyType: localizedString.optional(),
  score: z.string().optional(),
  courses: z.array(z.string()).default([]),
  ...timelineBase,
})

export const awardEntrySchema = z.looseObject({
  title: localizedString.optional(),
  date: z.string().optional(),
  period: z.string().optional(),
  awarder: localizedString.optional(),
  summary: localizedString.optional(),
})

export const skillEntrySchema = z.looseObject({
  name: localizedString.optional(),
  level: localizedString.optional(),
  keywords: z.array(localizedString).default([]),
})

export const languageEntrySchema = z.looseObject({
  language: localizedString.optional(),
  fluency: localizedString.optional(),
})

export const resumeSchema = z.looseObject({
  basics: z
    .looseObject({
      name: localizedString.optional(),
      label: localizedString.optional(),
      email: z.email().optional(),
      phone: z.string().optional(),
      url: z.url().optional(),
      summary: localizedString.optional(),
      location: z
        .looseObject({
          city: localizedString.optional(),
          region: localizedString.optional(),
          countryCode: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  work: z.array(workEntrySchema).default([]),
  education: z.array(educationEntrySchema).default([]),
  awards: z.array(awardEntrySchema).default([]),
  /** Extension: teaching engagements, same shape as work. */
  teaching: z.array(workEntrySchema).default([]),
  skills: z.array(skillEntrySchema).default([]),
  languages: z.array(languageEntrySchema).default([]),
  /** Extension: render the site's publications collection (§3) in the CV. */
  publicationsFromSite: z.boolean().default(false),
  publications: z
    .array(
      z.looseObject({
        name: localizedString.optional(),
        publisher: localizedString.optional(),
        releaseDate: z.string().optional(),
        url: z.url().optional(),
        summary: localizedString.optional(),
      }),
    )
    .default([]),
})

export type Resume = z.output<typeof resumeSchema>
export type WorkEntry = z.output<typeof workEntrySchema>
export type EducationEntry = z.output<typeof educationEntrySchema>
export type AwardEntry = z.output<typeof awardEntrySchema>

import { z } from 'zod'
import { localizedString } from './localized'

// content/profile.yaml — who the author is (ADR-028). It is CONTENT: it
// lives with the other author-owned files and reaches pages through the
// ContentProvider like cv.yaml or publications.yaml. Every field except
// `name` is optional; an absent field simply does not render. Where each
// field shows up is documented in CONTENT-CONTRACT §6.

export const profileLinkSchema = z.strictObject({
  label: localizedString,
  href: z.url(),
  /** Known kinds (scholar | orcid | github | …) get icons; open set. */
  kind: z.string().optional(),
})

export const profileSchema = z.strictObject({
  /** Required: <title> suffix, header brand, footer, feeds, JSON-LD. */
  name: localizedString,
  /** Byline spellings across languages, used to highlight the author in publication lists. */
  nameVariants: z.array(z.string()).default([]),
  /** Job title: CV page header, paper hero, JSON-LD jobTitle. */
  role: localizedString.optional(),
  /** Discipline: header subtitle (when the brand is on), paper hero, OG image. */
  field: localizedString.optional(),
  /** Institution: footer, paper hero, JSON-LD affiliation. */
  affiliation: localizedString.optional(),
  /** CV page header, paper hero. */
  location: localizedString.optional(),
  /** Bio-header quick link, paper hero, CV page, JSON-LD. */
  email: z.email().optional(),
  /** Path under content/assets or an absolute URL; bio-header / hero / og:image. */
  photo: z.string().optional(),
  /** One line: paper hero, feed description, home og:description. */
  tagline: localizedString.optional(),
  /** Paragraphs: bio-header, about section. */
  bio: z.array(localizedString).default([]),
  /** About section tags, JSON-LD knowsAbout. */
  interests: z.array(localizedString).default([]),
  /** Dedicated fields (not just links[]) so SEO can emit JSON-LD sameAs and Highwire meta. */
  orcid: z
    .string()
    .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, 'expected an ORCID iD like 0000-0002-1825-0097')
    .optional(),
  /** Google Scholar user id → JSON-LD sameAs. */
  scholar: z.string().optional(),
  /** Visible links: bio-header quick links, footer, paper hero, JSON-LD sameAs. */
  links: z.array(profileLinkSchema).default([]),
})

export type Profile = z.output<typeof profileSchema>
export type ProfileInput = z.input<typeof profileSchema>

/** Validate a parsed profile.yaml; the error names the file and the path. */
export function parseProfile(raw: unknown, path = 'content/profile.yaml'): Profile {
  const result = profileSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Invalid ${path}:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}

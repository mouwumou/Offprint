import { z } from 'zod'
import { localizedString } from '../schema/localized'

// All config sections are strict objects: an unknown key is almost always a
// typo and must fail the build, not be silently ignored (constraint: schema
// is the validation).

// ── profile (CONTENT-CONTRACT §6) ────────────────────────────────────────────

export const profileLinkSchema = z.strictObject({
  label: localizedString,
  href: z.url(),
  /** Known kinds (scholar | orcid | github | …) get icons; open set. */
  kind: z.string().optional(),
})

export const profileSchema = z.strictObject({
  name: localizedString,
  /** Byline spellings across languages, used to highlight the author in publication lists. */
  nameVariants: z.array(z.string()).default([]),
  role: localizedString.optional(),
  field: localizedString.optional(),
  affiliation: localizedString.optional(),
  location: localizedString.optional(),
  email: z.email().optional(),
  /** Path under content/assets or an absolute URL. */
  photo: z.string().optional(),
  tagline: localizedString.optional(),
  bio: z.array(localizedString).default([]),
  interests: z.array(localizedString).default([]),
  /** Dedicated fields (not just links[]) so SEO can emit JSON-LD sameAs and Highwire meta. */
  orcid: z
    .string()
    .regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, 'expected an ORCID iD like 0000-0002-1825-0097')
    .optional(),
  /** Google Scholar user id. */
  scholar: z.string().optional(),
  links: z.array(profileLinkSchema).default([]),
})

// ── modules ──────────────────────────────────────────────────────────────────

/**
 * A disabled module generates no routes, no nav entry, and ships no code
 * (constraint 5). Per-module options can widen `boolean` to an object later
 * without breaking existing configs.
 */
export const modulesSchema = z.strictObject({
  blog: z.boolean().default(true),
  pages: z.boolean().default(true),
  publications: z.boolean().default(true),
  projects: z.boolean().default(true),
  cv: z.boolean().default(true),
  talks: z.boolean().default(false),
  news: z.boolean().default(false),
})

export type ModuleName = keyof z.output<typeof modulesSchema>

// ── theme (DESIGN-REFERENCE; tokens locked by ADR-011) ───────────────────────

export const themeSchema = z.strictObject({
  /** Visual preset; 'paper' is the only built-in until the theme-pack phase. */
  preset: z.literal('paper').default('paper'),
  /** Overrides the claret accent from the locked token set. */
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'expected a hex color like #6f2232')
    .optional(),
  fonts: z
    .strictObject({
      serif: z.string().default('Newsreader'),
      sans: z.string().default('Inter'),
      mono: z.string().default('JetBrains Mono'),
    })
    .prefault({}),
  darkMode: z.enum(['auto', 'light', 'dark']).default('auto'),
})

// ── i18n (ADR-007) ───────────────────────────────────────────────────────────

export const i18nSchema = z
  .strictObject({
    /** Default language lives at the root path; the others get a URL prefix. */
    default: z.string().min(2).default('en'),
    locales: z.array(z.string().min(2)).nonempty().default(['en', 'zh']),
  })
  .refine((value) => value.locales.includes(value.default), {
    message: 'i18n.default must be one of i18n.locales',
    path: ['default'],
  })

// ── runtime (ADR-003 / ADR-004) ──────────────────────────────────────────────

export const runtimeSchema = z.strictObject({
  /** static is the default and baseline; server is the optional runtime. */
  mode: z.enum(['static', 'server']).default('static'),
  /** Byte-level content store backing the ContentProvider. */
  store: z.enum(['fs', 'git', 's3']).default('fs'),
})

// ── comments (P3-8) ──────────────────────────────────────────────────────────

export const commentsSchema = z
  .strictObject({
    /** giscus is the only provider for now. */
    provider: z.literal('giscus').default('giscus'),
    enabled: z.boolean().default(false),
    /** owner/repo with the giscus app installed and discussions on. */
    repo: z
      .string()
      .regex(/^[^/\s]+\/[^/\s]+$/, 'expected owner/repo')
      .optional(),
    repoId: z.string().optional(),
    category: z.string().optional(),
    categoryId: z.string().optional(),
  })
  .refine(
    (value) =>
      !value.enabled ||
      (value.repo !== undefined &&
        value.repoId !== undefined &&
        value.category !== undefined &&
        value.categoryId !== undefined),
    { message: 'comments.enabled requires repo, repoId, category, and categoryId' },
  )

// ── site config ──────────────────────────────────────────────────────────────

export const siteConfigSchema = z.strictObject({
  profile: profileSchema,
  modules: modulesSchema.prefault({}),
  theme: themeSchema.prefault({}),
  i18n: i18nSchema.prefault({}),
  runtime: runtimeSchema.prefault({}),
  comments: commentsSchema.prefault({}),
})

export type SiteConfigInput = z.input<typeof siteConfigSchema>
export type SiteConfig = z.output<typeof siteConfigSchema>

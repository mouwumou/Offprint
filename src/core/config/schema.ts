import { z } from 'zod'
import '../modules/builtin'
import { buildModulesSchema, getModules } from '../modules/registry'
import { localizedString } from '../schema/localized'
import { redirectsSchema } from '../schema/redirects'
import { TOKEN_NAMES } from '../theme/contract'

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

// ── modules (ADR-019: composed from the module registry at call time) ────────

export type { ModuleSetting, ModulesConfig } from '../modules/registry'
export type ModuleName = import('../modules/registry').BuiltinModuleId

// ── home composition (ADR-015: the homepage is a section sequence) ───────────

/**
 * One homepage section. Every variant's `title` overrides the theme's i18n
 * default. Sections whose module is disabled, or whose data is empty, are
 * skipped at render time rather than failing the build.
 */
export const homeSectionSchema = z.discriminatedUnion('type', [
  /** Compact academic header: name, small photo, bio, quick links (A2). */
  z.strictObject({ type: z.literal('bio-header') }),
  /** Dated one-liners from content/news.yaml, newest first. */
  z.strictObject({
    type: z.literal('news'),
    title: localizedString.optional(),
    count: z.number().int().min(1).max(20).default(5),
  }),
  /** Barron-style publication rows: thumbnail, authors, venue, links. */
  z.strictObject({
    type: z.literal('publication-list'),
    title: localizedString.optional(),
    selectedOnly: z.boolean().default(true),
  }),
  /** Profile hero with the meta strip (affiliation / contact / elsewhere). */
  z.strictObject({ type: z.literal('hero') }),
  /** profile.bio paragraphs + interests chips. */
  z.strictObject({ type: z.literal('about'), title: localizedString.optional() }),
  /** A standalone page's markdown rendered inline; false hides the label. */
  z.strictObject({
    type: z.literal('prose'),
    page: z.string().min(1),
    title: z.union([z.literal(false), localizedString]).optional(),
  }),
  z.strictObject({
    type: z.literal('selected-publications'),
    title: localizedString.optional(),
    /** Also list the non-selected publications compactly below. */
    others: z.boolean().default(true),
  }),
  z.strictObject({
    type: z.literal('recent-posts'),
    title: localizedString.optional(),
    count: z.number().int().min(1).max(12).default(3),
  }),
  z.strictObject({
    type: z.literal('projects'),
    title: localizedString.optional(),
    count: z.number().int().min(1).max(12).optional(),
  }),
])

export type HomeSection = z.output<typeof homeSectionSchema>

export const homeSchema = z.strictObject({
  /** Page column: narrow (~848px, the academic norm) or wide (max-w-6xl). */
  width: z.enum(['narrow', 'wide']).default('wide'),
  /** The default sequence reproduces the built-in homepage. */
  sections: z
    .array(homeSectionSchema)
    .prefault([
      { type: 'hero' },
      { type: 'about' },
      { type: 'selected-publications' },
      { type: 'recent-posts' },
    ]),
})

// ── navigation (ADR-015: nav is data, not module wiring) ─────────────────────

/**
 * One nav slot. `module` points at a module landing page (label defaults to
 * the theme's i18n string), `page` at a standalone page by slug (label
 * defaults to the page title), `href` is a free link (internal paths get the
 * language prefix, absolute URLs pass through).
 */
export function buildNavEntrySchema() {
  // 'home' plus every registered module that has a nav landing page.
  const moduleIds = [
    'home',
    ...getModules()
      .filter((module) => module.nav !== null && module.nav !== undefined)
      .map((module) => module.id),
  ] as [string, ...string[]]
  return z.union([
    z.strictObject({ module: z.enum(moduleIds), label: localizedString.optional() }),
    z.strictObject({ page: z.string().min(1), label: localizedString.optional() }),
    z.strictObject({ href: z.string().min(1), label: localizedString }),
  ])
}

export interface NavEntryModule {
  module: string
  label?: z.output<typeof localizedString> | undefined
}
export interface NavEntryPage {
  page: string
  label?: z.output<typeof localizedString> | undefined
}
export interface NavEntryHref {
  href: string
  label: z.output<typeof localizedString>
}
export type NavEntry = NavEntryModule | NavEntryPage | NavEntryHref

// ── chrome: header & footer (ADR-015) ────────────────────────────────────────

/** `false` hides the element; a localized string replaces the theme default. */
const hideable = z.union([z.literal(false), localizedString])

export const headerSchema = z.strictObject({
  /** Brand title; defaults to profile.name. false removes the brand link. */
  title: hideable.optional(),
  /** Small caption next to the title; defaults to the first segment of profile.field. */
  subtitle: hideable.optional(),
  search: z.boolean().default(true),
  themeToggle: z.boolean().default(true),
  languageSwitcher: z.boolean().default(true),
})

export const footerSchema = z.strictObject({
  enabled: z.boolean().default(true),
  /** Credit line before © year; false leaves only the © year. */
  colophon: hideable.optional(),
  rss: z.boolean().default(true),
})

// ── theme (DESIGN-REFERENCE; tokens locked by ADR-011) ───────────────────────

// ADR-018: the theme is resolved by NAME against src/site/themes/ and the
// built-ins — the resolver is the validation (unknown names fail the build
// listing what exists), so no enum here to keep third-party themes possible.
export const themeSchema = z.strictObject({
  name: z.string().min(1).default('paper'),
  /** Shorthand for tokens: primary/accent/ring in one go, both schemes. */
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'expected a hex color like #6f2232')
    .optional(),
  /** Per-token overrides on top of the theme, applied to both schemes. */
  tokens: z.record(z.enum(TOKEN_NAMES), z.string().min(1)).optional(),
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
  store: z.enum(['fs', 'git']).default('fs'),
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

/**
 * Built at parse CALL time, not module-load time (ADR-019/021): the modules
 * and nav schemas come from the registry, which discovers site-local module
 * manifests (src/site/modules/<id>/module.yaml) right before composing.
 */
export function buildSiteConfigSchema() {
  return z.strictObject({
    profile: profileSchema,
    modules: buildModulesSchema().prefault({}),
    /** Absent → theme default: home, enabled modules, then nav:true pages. */
    nav: z.array(buildNavEntrySchema()).optional(),
    home: homeSchema.prefault({}),
    header: headerSchema.prefault({}),
    footer: footerSchema.prefault({}),
    theme: themeSchema.prefault({}),
    i18n: i18nSchema.prefault({}),
    runtime: runtimeSchema.prefault({}),
    comments: commentsSchema.prefault({}),
    /** Old URL → new URL (P1-10); formerly the standalone redirects.yaml. */
    redirects: redirectsSchema.prefault({}),
  })
}

export type SiteConfigInput = z.input<ReturnType<typeof buildSiteConfigSchema>>
export type SiteConfig = z.output<ReturnType<typeof buildSiteConfigSchema>>

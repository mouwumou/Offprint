import { z } from 'zod'
import '../modules/builtin'
import { buildModulesSchema, getModules } from '../modules/registry'
import { localizedString } from '../schema/localized'
import { redirectsSchema } from '../schema/redirects'
import { cssValue, TOKEN_NAMES, typographySchema } from '../theme/contract'

// All config sections are strict objects: an unknown key is almost always a
// typo and must fail the build, not be silently ignored (constraint: schema
// is the validation).

// ── profile: moved to content/profile.yaml — see src/core/schema/profile.ts

// ── modules (composed from the module registry at call time) ────────

export type { ModuleSetting, ModulesConfig } from '../modules/registry'
export type ModuleName = import('../modules/registry').BuiltinModuleId

// ── home composition (the homepage is a section sequence) ───────────

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
  /** The default sequence: the academic homepage (A4). */
  sections: z
    .array(homeSectionSchema)
    .prefault([
      { type: 'bio-header' },
      { type: 'news' },
      { type: 'publication-list' },
      { type: 'recent-posts' },
    ]),
})

// ── navigation (nav is data, not module wiring) ─────────────────────

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

// ── layout ───────────────────────────────────────────────────────────────────

/** Site-wide page column — one width for every page, nav and footer included
 * (mixed widths between pages read as jumps). */
export const layoutSchema = z.strictObject({
  /** narrow (~848px, the academic norm) | wide (max-w-6xl, suits paper). */
  width: z.enum(['narrow', 'wide']).default('narrow'),
})

// ── chrome: header & footer ────────────────────────────────────────

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

// ── theme ───────────────────────

// The theme is resolved by NAME against extensions/themes/ and the
// built-ins — the resolver is the validation (unknown names fail the build
// listing what exists), so no enum here to keep third-party themes possible.
export const themeSchema = z.strictObject({
  name: z.string().min(1).default('scholar'),
  /** Shorthand for tokens: primary/accent/ring in one go, both schemes. */
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'expected a hex color like #6f2232')
    .optional(),
  /** Per-token overrides on top of the theme, applied to both schemes. */
  tokens: z.record(z.enum(TOKEN_NAMES), cssValue).optional(),
  /** Article body typography (proseSize); overrides the theme's declaration. */
  typography: typographySchema.partial().optional(),
  /** Values for the options the ACTIVE theme declares in its theme.json;
   * validated against that declaration at build. */
  options: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])).optional(),
})

// ── i18n ───────────────────────────────────────────────────────────

export const i18nSchema = z
  .strictObject({
    /** Default language lives at the root path; the others get a URL prefix. */
    default: z.string().min(2).default('en'),
    locales: z.array(z.string().min(2)).nonempty().default(['en', 'zh']),
    /** Locales kept out of search engines: robots noindex on their pages, no
     * hreflang/sitemap entries, robots.txt Disallow. Pages stay reachable. */
    noindex: z.array(z.string().min(2)).default([]),
  })
  .refine((value) => value.locales.includes(value.default), {
    message: 'i18n.default must be one of i18n.locales',
    path: ['default'],
  })
  .refine((value) => value.noindex.every((locale) => value.locales.includes(locale)), {
    message: 'i18n.noindex entries must be listed in i18n.locales',
    path: ['noindex'],
  })

// ── runtime ──────────────────────────────────────────────

export const runtimeSchema = z.strictObject({
  /** static is the default and baseline; server is the optional runtime. */
  mode: z.enum(['static', 'server']).default('static'),
  /** Byte-level content store backing the ContentProvider. */
  store: z.enum(['fs', 'git']).default('fs'),
})

// ── comments ──────────────────────────────────────────────────────────

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

// ── analytics ────────────────────────────────────────────────────────────────

/**
 * Site analytics, off by default. Each provider is one small object; the
 * matching script tag is injected into <head> of production builds only
 * (the one opt-in exception to the zero-JS default). Usually one is set.
 */
export const analyticsSchema = z.strictObject({
  /** Umami (cloud or self-hosted); `src` is the tracker script URL. */
  umami: z
    .strictObject({
      websiteId: z.string().min(1),
      src: z.url().default('https://cloud.umami.is/script.js'),
    })
    .optional(),
  /** Plausible (plausible.io or self-hosted). */
  plausible: z
    .strictObject({
      domain: z.string().min(1),
      src: z.url().default('https://plausible.io/js/script.js'),
    })
    .optional(),
  /** GoatCounter: `code` is the subdomain of <code>.goatcounter.com. */
  goatcounter: z
    .strictObject({
      code: z.string().regex(/^[a-z0-9-]+$/, 'expected the goatcounter site code'),
      src: z.url().default('https://gc.zgo.at/count.js'),
    })
    .optional(),
})

// ── seo ──────────────────────────────────────────────────────────────────────

export const seoSchema = z.strictObject({
  /** Emit the schema.org Person block (from content/profile.yaml) on the home page. */
  person: z.boolean().default(true),
})

// ── site config ──────────────────────────────────────────────────────────────

/**
 * Built at parse CALL time, not module-load time: the modules
 * and nav schemas come from the registry, which discovers site-local module
 * manifests (extensions/modules/<id>/module.yaml) right before composing.
 */
export function buildSiteConfigSchema() {
  return z.strictObject({
    modules: buildModulesSchema().prefault({}),
    /** Absent → theme default: home, enabled modules, then nav:true pages. */
    nav: z.array(buildNavEntrySchema()).optional(),
    home: homeSchema.prefault({}),
    layout: layoutSchema.prefault({}),
    header: headerSchema.prefault({}),
    footer: footerSchema.prefault({}),
    theme: themeSchema.prefault({}),
    i18n: i18nSchema.prefault({}),
    seo: seoSchema.prefault({}),
    runtime: runtimeSchema.prefault({}),
    comments: commentsSchema.prefault({}),
    analytics: analyticsSchema.prefault({}),
    /** Old URL → new URL; formerly the standalone redirects.yaml. */
    redirects: redirectsSchema.prefault({}),
  })
}

export type SiteConfigInput = z.input<ReturnType<typeof buildSiteConfigSchema>>
export type SiteConfig = z.output<ReturnType<typeof buildSiteConfigSchema>>

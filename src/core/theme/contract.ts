import { z } from 'zod'

// ADR-018: a theme is a directory conforming to this contract — tokens plus
// font stacks in theme.json, optional theme.css alongside (font loading and
// theme-specific styles). Themes carry no JS and no layout forks (layout
// belongs to the widget layer). Validation happens by RESOLUTION, not by an
// enum: any directory under src/site/themes/<name> or src/core/themes/<name>
// that parses against this schema is a legal theme.

/** The complete token vocabulary. base.css consumes exactly these. */
export const TOKEN_NAMES = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'border',
  'ring',
  'radius',
] as const

export type TokenName = (typeof TOKEN_NAMES)[number]

// Token and font values are injected raw into a <style> block by BaseLayout,
// so a value like `#000}</style><script>…` from a third-party theme package
// would break out. Forbid the CSS-value metacharacters that enable that
// (installed themes are untrusted data — ADR-022). Legit colors, radii, and
// font stacks never contain these.
export const cssValue = z
  .string()
  .min(1)
  .refine((v) => !/[<>;{}]/.test(v), 'CSS value must not contain < > ; { }')

/** Prose size lives beside fonts (not in the color/radius token table). */
export const typographySchema = z.strictObject({
  /** Base font size of article bodies (`.prose`); 17px reads well for Latin and CJK alike. */
  proseSize: cssValue.default('1.0625rem'),
})

// z.record over an enum key is exhaustive in zod 4: a missing token is an
// error naming the key, an unknown token is rejected — exactly the contract.
const tokenTable = z.record(z.enum(TOKEN_NAMES), cssValue)

/**
 * Voice: the theme's mannerisms (A3). `labels` governs the decorative
 * register — mono-caps = letterspaced uppercase mono kickers/labels/nav
 * (the paper look), plain = ordinary type and no kickers (the academic
 * norm). `photo` governs the hero portrait treatment.
 */
export const themeVoiceSchema = z
  .strictObject({
    labels: z.enum(['mono-caps', 'plain']).default('plain'),
    photo: z.enum(['grayscale-hover', 'plain']).default('plain'),
    /** Page-header rhythm: airy = magazine stage (~96px gaps, display-size
     * titles), compact = academic density (~40px gaps, document titles). */
    density: z.enum(['airy', 'compact']).default('compact'),
  })
  .prefault({})

/**
 * A theme's own configurable options, DECLARED here and VALUED by the user
 * in site.yaml `theme.options` (ADR-022: the theme package is read-only,
 * every knob lives in the site config). Validated at build against this
 * declaration; gen:schema folds it into site.yaml's editor completion.
 */
export const themeOptionDeclSchema = z.strictObject({
  type: z.enum(['boolean', 'string', 'number']),
  default: z.union([z.boolean(), z.string(), z.number()]).optional(),
  enum: z.array(z.union([z.string(), z.number()])).optional(),
  description: z.string().optional(),
})

export type ThemeOptionDecl = z.output<typeof themeOptionDeclSchema>
export type ThemeOptionValue = boolean | string | number

export const themeManifestSchema = z.strictObject({
  name: z.string().min(1),
  voice: themeVoiceSchema,
  options: z.record(z.string(), themeOptionDeclSchema).prefault({}),
  /** Body typography of rendered markdown; users override via site.yaml theme.typography. */
  typography: typographySchema.prefault({}),
  /** Full token tables for both color schemes. */
  tokens: z.strictObject({ light: tokenTable, dark: tokenTable }),
  /** Complete font-family stacks (including CJK and system fallbacks). */
  fonts: z.strictObject({
    sans: cssValue,
    serif: cssValue,
    mono: cssValue,
  }),
})

export type ThemeManifest = z.output<typeof themeManifestSchema>

export interface ResolvedTheme {
  manifest: ThemeManifest
  /** Absolute path of the theme's optional stylesheet, if present. */
  cssPath: string | null
}

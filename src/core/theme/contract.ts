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

// z.record over an enum key is exhaustive in zod 4: a missing token is an
// error naming the key, an unknown token is rejected — exactly the contract.
const tokenTable = z.record(z.enum(TOKEN_NAMES), z.string().min(1))

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

export const themeManifestSchema = z.strictObject({
  name: z.string().min(1),
  voice: themeVoiceSchema,
  /** Full token tables for both color schemes. */
  tokens: z.strictObject({ light: tokenTable, dark: tokenTable }),
  /** Complete font-family stacks (including CJK and system fallbacks). */
  fonts: z.strictObject({
    sans: z.string().min(1),
    serif: z.string().min(1),
    mono: z.string().min(1),
  }),
})

export type ThemeManifest = z.output<typeof themeManifestSchema>

export interface ResolvedTheme {
  manifest: ThemeManifest
  /** Absolute path of the theme's optional stylesheet, if present. */
  cssPath: string | null
}

// The resolved theme of THIS site, for components that branch on voice or
// read theme options (A3). Kept separate from resolve.ts so the
// resolver stays config-free.
import config from '../config/current'
import type { ThemeOptionDecl, ThemeOptionValue } from './contract'
import { resolveTheme } from './resolve'

const { manifest } = resolveTheme(config.theme.name)

/** Validate site.yaml theme.options against the theme's declaration and
 * fill defaults — unknown keys and wrong types fail the build. */
export function resolveThemeOptions(
  themeName: string,
  declared: Record<string, ThemeOptionDecl>,
  given: Record<string, ThemeOptionValue>,
): Record<string, ThemeOptionValue> {
  const names = Object.keys(declared)
  for (const [key, value] of Object.entries(given)) {
    const decl = declared[key]
    if (decl === undefined) {
      throw new Error(
        `theme "${themeName}" has no option "${key}" — declared options: ${names.join(', ') || '(none)'}`,
      )
    }
    if (typeof value !== decl.type) {
      throw new Error(`theme option "${key}" expects a ${decl.type}, got ${typeof value}`)
    }
    if (decl.enum && !decl.enum.includes(value as string | number)) {
      throw new Error(`theme option "${key}" must be one of: ${decl.enum.join(', ')}`)
    }
  }
  const resolved: Record<string, ThemeOptionValue> = {}
  for (const [key, decl] of Object.entries(declared)) {
    const value = given[key] ?? decl.default
    if (value !== undefined) resolved[key] = value
  }
  return resolved
}

export const themeOptions = resolveThemeOptions(
  manifest.name,
  manifest.options,
  config.theme.options ?? {},
)
export const currentTheme = manifest
export const themeVoice = manifest.voice

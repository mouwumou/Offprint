import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { themeManifestSchema, type ResolvedTheme } from './contract'

// Installed themes (extensions/, ADR-022) shadow built-ins of the same
// name; npm-distributed themes join the chain when the package split lands
// (phase 4). Reading theme.json via fs keeps ADR-006 intact: core never
// imports extension code, and a manifest is data, not code.
const THEME_ROOTS = ['extensions/themes', 'src/core/themes'] as const

const cache = new Map<string, ResolvedTheme>()

function themeDir(name: string): string | null {
  for (const root of THEME_ROOTS) {
    const dir = resolve(root, name)
    if (existsSync(join(dir, 'theme.json'))) return dir
  }
  return null
}

/** Every theme name currently resolvable, for error messages. */
export function listThemes(): string[] {
  const names = new Set<string>()
  for (const root of THEME_ROOTS) {
    const dir = resolve(root)
    if (!existsSync(dir)) continue
    for (const name of readdirSync(dir)) {
      if (existsSync(join(dir, name, 'theme.json'))) names.add(name)
    }
  }
  return [...names].sort()
}

/** The resolver IS the validation (ADR-018): unknown names fail the build. */
export function resolveTheme(name: string): ResolvedTheme {
  const cached = cache.get(name)
  if (cached !== undefined) return cached

  const dir = themeDir(name)
  if (dir === null) {
    throw new Error(
      `theme "${name}" not found — available themes: ${listThemes().join(', ') || '(none)'}. ` +
        'A theme is a directory with a theme.json under extensions/themes/ or src/core/themes/ (docs/THEMING.md).',
    )
  }

  const raw: unknown = JSON.parse(readFileSync(join(dir, 'theme.json'), 'utf8'))
  const parsed = themeManifestSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(`invalid ${join(dir, 'theme.json')}:\n${z.prettifyError(parsed.error)}`)
  }
  if (parsed.data.name !== name) {
    throw new Error(
      `${join(dir, 'theme.json')} declares name "${parsed.data.name}", expected "${name}"`,
    )
  }

  const cssPath = join(dir, 'theme.css')
  const resolved: ResolvedTheme = {
    manifest: parsed.data,
    cssPath: existsSync(cssPath) ? cssPath : null,
  }
  cache.set(name, resolved)
  return resolved
}

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import YAML from 'yaml'
import { z } from 'zod'
import { buildSiteConfigSchema, type SiteConfig } from './schema'

// ADR-021: the site configuration is pure data in site.yaml (validated by
// the same zod schemas as ever — the error quality never came from the TS
// file format), and the homepage composition lives with the content in
// content/home.yaml. Both are read at build/startup; changing them means
// rebuilding or restarting, exactly like the old TS config.

const SITE_FILE = 'site.yaml'
const HOME_FILE = 'content/home.yaml'

function readYaml(path: string): unknown {
  try {
    return YAML.parse(readFileSync(path, 'utf8')) ?? {}
  } catch (error) {
    throw new Error(`Could not read ${path}: ${String(error)}`, { cause: error })
  }
}

/** Load and validate site.yaml (+ content/home.yaml) from the repo root. */
export function loadSiteConfig(root: string = process.cwd()): SiteConfig {
  const sitePath = resolve(root, SITE_FILE)
  if (!existsSync(sitePath)) {
    throw new Error(
      `${SITE_FILE} not found at ${sitePath} — the site configuration lives there (ADR-021)`,
    )
  }
  const site = readYaml(sitePath)
  if (typeof site !== 'object' || site === null) {
    throw new Error(`${SITE_FILE} must be a YAML mapping`)
  }
  if ('home' in site) {
    throw new Error(
      `${SITE_FILE} must not contain "home" — the homepage composition lives in ${HOME_FILE} (ADR-021)`,
    )
  }
  if ('profile' in site) {
    throw new Error(
      `${SITE_FILE} must not contain "profile" — who you are is content and lives in content/profile.yaml (ADR-028). ` +
        'Move the block there unchanged (drop the two-space indent); every field keeps its name.',
    )
  }

  const homePath = resolve(root, HOME_FILE)
  const home = existsSync(homePath) ? readYaml(homePath) : undefined
  const merged = home === undefined ? site : { ...site, home }

  const result = buildSiteConfigSchema().safeParse(merged)
  if (!result.success) {
    // Point issues inside `home` back at the file they actually live in.
    const message = z.prettifyError(result.error).replaceAll('at home.', `in ${HOME_FILE}: at `)
    throw new Error(`Invalid ${SITE_FILE}:\n${message}`)
  }
  return result.data
}

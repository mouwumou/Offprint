import { z } from 'zod'
import { buildSiteConfigSchema, type SiteConfig, type SiteConfigInput } from './schema'

/**
 * Validate the site configuration and return it fully typed with defaults
 * applied. Runs once at module load of site.config.ts: an invalid config must
 * fail the build (static) or startup (server) loudly, never render.
 */
export function defineConfig(config: SiteConfigInput): SiteConfig {
  const result = buildSiteConfigSchema().safeParse(config)
  if (!result.success) {
    throw new Error(`Invalid site.config.ts:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}

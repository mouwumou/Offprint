import { z } from 'zod'
import { buildSiteConfigSchema, type SiteConfig, type SiteConfigInput } from './schema'

/**
 * Validate a site configuration object and return it fully typed with
 * defaults applied (the TS-facing API; site.yaml goes through load.ts which
 * calls the same schema). Invalid config fails the build loudly.
 */
export function defineConfig(config: SiteConfigInput): SiteConfig {
  const result = buildSiteConfigSchema().safeParse(config)
  if (!result.success) {
    throw new Error(`Invalid site.config.ts:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}

export { moduleCopy } from './copy'
export { defineConfig } from './define-config'
export {
  buildSiteConfigSchema,
  commentsSchema,
  i18nSchema,
  runtimeSchema,
  themeSchema,
} from './schema'
export type { ModuleName, SiteConfig, SiteConfigInput } from './schema'
// The author profile is content; re-exported here for callers that used to find it in the config.
export { parseProfile, profileLinkSchema, profileSchema } from '../schema/profile'
export type { Profile, ProfileInput } from '../schema/profile'
export { defineModule, registerModule, getModules, getModule } from '../modules/registry'
export type { OffprintModuleDef, ModuleSetting } from '../modules/registry'

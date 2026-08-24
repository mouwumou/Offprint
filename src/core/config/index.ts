export { moduleCopy } from './copy'
export { defineConfig } from './define-config'
export {
  buildSiteConfigSchema,
  commentsSchema,
  i18nSchema,
  profileLinkSchema,
  profileSchema,
  runtimeSchema,
  themeSchema,
} from './schema'
export type { ModuleName, SiteConfig, SiteConfigInput } from './schema'
export { defineModule, registerModule, getModules, getModule } from '../modules/registry'
export type { OffprintModuleDef, ModuleSetting } from '../modules/registry'

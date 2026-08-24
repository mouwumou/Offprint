import { z } from 'zod'
import type { MessageKey } from '../i18n'
import { localizedString } from '../schema/localized'

// ADR-019 module registry: a module becomes legal by REGISTERING, and the
// `modules` config schema is composed from the registered modules' own
// schemas at defineConfig() time — an unregistered name in the config is a
// "not registered" build error, not a hardcoded-whitelist rejection.
// Built-ins register in ./builtin.ts; a site-local module registers itself
// when site.config.ts imports it (any import order works, because schemas
// are built lazily when defineConfig runs, after all imports settled).

const copyShape = {
  /** Landing-page heading override. */
  title: localizedString.optional(),
  /** Landing-page intro override. */
  description: localizedString.optional(),
}

export interface ModuleSetting {
  enabled: boolean
  title?: z.output<typeof localizedString> | undefined
  description?: z.output<typeof localizedString> | undefined
  colophon?: false | z.output<typeof localizedString> | undefined
}

const toggle = (shape: z.ZodRawShape): z.ZodType<ModuleSetting, unknown> =>
  z
    .union([z.boolean(), z.strictObject(shape)])
    .transform((value): ModuleSetting =>
      typeof value === 'boolean' ? { enabled: value } : { enabled: true, ...value },
    )

/** boolean | { title?, description? } — the default config for a module. */
export const moduleToggle: z.ZodType<ModuleSetting, unknown> = toggle(copyShape)

/** The blog's toggle additionally accepts the post-colophon override. */
export const moduleToggleWithColophon: z.ZodType<ModuleSetting, unknown> = toggle({
  ...copyShape,
  /** Post colophon box override; false hides it. */
  colophon: z.union([z.literal(false), localizedString]).optional(),
})

export interface OffprintModuleDef {
  id: string
  /** Schema for this module's `modules.<id>` config value. */
  configSchema?: z.ZodType<ModuleSetting, unknown>
  enabledByDefault?: boolean
  /** Default nav slot (language prefix applied by resolveNav); null = none. */
  nav?: { path: string; labelKey: MessageKey } | null
  /** Landing copy defaults (theme i18n keys; user overrides via config). */
  copy?: { title: MessageKey; description?: MessageKey }
  /** Content collections this module reads. */
  collections?: string[]
}

export interface RegisteredModule extends OffprintModuleDef {
  configSchema: z.ZodType<ModuleSetting, unknown>
  enabledByDefault: boolean
}

const registry = new Map<string, RegisteredModule>()

/** Identity helper for typing/documentation symmetry with defineTheme. */
export function defineModule(def: OffprintModuleDef): OffprintModuleDef {
  return def
}

export function registerModule(def: OffprintModuleDef): void {
  if (!/^[a-z][a-z0-9-]*$/.test(def.id)) {
    throw new Error(`module id "${def.id}" must be kebab-case`)
  }
  if (registry.has(def.id)) {
    throw new Error(`module "${def.id}" is already registered`)
  }
  registry.set(def.id, {
    ...def,
    configSchema: def.configSchema ?? moduleToggle,
    enabledByDefault: def.enabledByDefault ?? false,
  })
}

export function getModules(): RegisteredModule[] {
  return [...registry.values()]
}

export function getModule(id: string): RegisteredModule | undefined {
  return registry.get(id)
}

/** Built-in ids, for the static config type; third-party ids type as string. */
export type BuiltinModuleId = 'blog' | 'pages' | 'publications' | 'projects' | 'cv'
export type ModulesConfig = Record<BuiltinModuleId, ModuleSetting> & Record<string, ModuleSetting>

/**
 * The `modules` schema, composed from the registry AT CALL TIME. Unknown
 * keys report "not registered" with the current registry listed.
 */
export function buildModulesSchema(): z.ZodType<ModulesConfig, unknown> {
  const shape = Object.fromEntries(
    getModules().map((module) => [
      module.id,
      module.configSchema.prefault(module.enabledByDefault),
    ]),
  )
  const schema = z.looseObject(shape).superRefine((value, ctx) => {
    for (const key of Object.keys(value)) {
      if (!(key in shape)) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `module "${key}" is not registered — registered modules: ${getModules()
            .map((m) => m.id)
            .join(
              ', ',
            )}. Site-local modules live in src/site/modules/<id>/ and register by being imported from site.config.ts (ADR-019).`,
        })
      }
    }
  })
  return schema as unknown as z.ZodType<ModulesConfig, unknown>
}

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import YAML from 'yaml'
import { z } from 'zod'
import type { MessageKey } from '../i18n'
import { localizedString, type LocalizedString } from '../schema/localized'

// ADR-019 module registry: a module becomes legal by REGISTERING, and the
// `modules` config schema is composed from the registered modules' own
// schemas at defineConfig() time — an unregistered name in the config is a
// "not registered" build error, not a hardcoded-whitelist rejection.
// Built-ins register in ./builtin.ts; site-local modules are discovered
// from extensions/modules/<id>/module.yaml manifests (ADR-021/022) right before
// the modules schema is composed.

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
  /**
   * Default nav slot (language prefix applied by resolveNav); null = none.
   * Built-ins label via theme i18n keys; site-local manifests via localized
   * literals.
   */
  nav?: { path: string; labelKey?: MessageKey; label?: LocalizedString } | null
  /** Landing copy defaults; same key/literal duality as nav. */
  copy?: {
    titleKey?: MessageKey
    title?: LocalizedString
    descriptionKey?: MessageKey
    description?: LocalizedString
  }
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

// ── site-local module discovery (ADR-021) ────────────────────────────────────

/** extensions/modules/<id>/module.yaml — declarative manifest, fs-read like a
 * theme's theme.json (no import across the ADR-006 boundary, no bundle
 * timing). Behaviour (routes) is injected separately by the integration. */
const moduleManifestSchema = z.strictObject({
  nav: z
    .strictObject({
      path: z.string().regex(/^\//, 'nav.path must start with /'),
      label: localizedString,
    })
    .nullable()
    .optional(),
  copy: z
    .strictObject({ title: localizedString, description: localizedString.optional() })
    .optional(),
  collections: z.array(z.string()).optional(),
  enabledByDefault: z.boolean().optional(),
})

const SITE_MODULES_DIR = 'extensions/modules'
let siteModulesDiscovered = false

/** Test hook: production discovers once per process; tests create/remove
 * manifest dirs mid-run and need to force a re-scan. */
export function rediscoverSiteModules(): void {
  siteModulesDiscovered = false
}

function discoverSiteModules(): void {
  if (siteModulesDiscovered) return
  siteModulesDiscovered = true
  const root = resolve(SITE_MODULES_DIR)
  if (!existsSync(root)) return
  for (const id of readdirSync(root).sort()) {
    const file = join(root, id, 'module.yaml')
    if (!existsSync(file)) continue
    const parsed = moduleManifestSchema.safeParse(YAML.parse(readFileSync(file, 'utf8')) ?? {})
    if (!parsed.success) {
      throw new Error(`invalid ${file}:\n${z.prettifyError(parsed.error)}`)
    }
    const manifest = parsed.data
    registerModule({
      id,
      ...(manifest.enabledByDefault !== undefined && {
        enabledByDefault: manifest.enabledByDefault,
      }),
      ...(manifest.nav !== undefined && {
        nav: manifest.nav === null ? null : { path: manifest.nav.path, label: manifest.nav.label },
      }),
      ...(manifest.copy !== undefined && { copy: manifest.copy }),
      ...(manifest.collections !== undefined && { collections: manifest.collections }),
    })
  }
}

export function getModules(): RegisteredModule[] {
  discoverSiteModules()
  return [...registry.values()]
}

export function getModule(id: string): RegisteredModule | undefined {
  discoverSiteModules()
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
      if (!Object.hasOwn(shape, key)) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `module "${key}" is not registered — registered modules: ${getModules()
            .map((m) => m.id)
            .join(
              ', ',
            )}. Installed modules live in extensions/modules/<id>/ with a module.yaml (ADR-019/022).`,
        })
      }
    }
  })
  return schema as unknown as z.ZodType<ModulesConfig, unknown>
}

// Collects widget overrides for the registry (src/core/widgets/registry.ts).
// Lives in the pages layer because core must not import extensions/; the
// globs are compile-time literals, so EVERY theme's widgets are bundled and
// the active theme's are picked here. Loaded on every page by the integration
// (page-ssr script), so registration precedes the first render in both modes.
import siteConfig from '../core/config/current'
import { registerWidgets } from '../core/widgets/registry'

const themeWidgetModules = import.meta.glob<{ default: unknown }>(
  '../../extensions/themes/*/widgets/*.astro',
  { eager: true },
)
const siteWidgetModules = import.meta.glob<{ default: unknown }>(
  '../../extensions/widgets/*.astro',
  { eager: true },
)

const fromTheme: Record<string, unknown> = {}
for (const [path, module] of Object.entries(themeWidgetModules)) {
  const match = /themes\/([^/]+)\/widgets\/([^/]+)\.astro$/.exec(path)
  if (match && match[1] === siteConfig.theme.name) fromTheme[match[2] as string] = module.default
}
const fromSite: Record<string, unknown> = {}
for (const [path, module] of Object.entries(siteWidgetModules)) {
  fromSite[path.replace(/^.*\/([^/]+)\.astro$/, '$1')] = module.default
}
// Order = precedence: the site's own overrides win over the theme's.
registerWidgets(fromTheme, `extensions/themes/${siteConfig.theme.name}/widgets`)
registerWidgets(fromSite, 'extensions/widgets')

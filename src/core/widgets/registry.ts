// Widget registry: the lookup chain "site override > active theme's widget >
// built-in" as one mechanism for every replaceable part of the UI, not only
// the home-page sections. Core never imports extensions/ (package boundary);
// the pages layer collects widget modules with compile-time globs
// (src/pages/_widgets.ts) and registers them here before any page renders.
// Components ask `resolveWidget(name, Builtin)` and get the override or the
// built-in — the built-in's props ARE the contract an override must accept.

export const WIDGET_NAMES = [
  // home-page sections (content/home.yaml `sections[].type`)
  'bio-header',
  'news',
  'publication-list',
  'hero',
  'about',
  'prose',
  'selected-publications',
  'recent-posts',
  'projects',
  // rows and chrome shared by several pages
  'publication-row',
  'post-row',
  'site-header',
  'site-footer',
] as const

export type WidgetName = (typeof WIDGET_NAMES)[number]

const registry = new Map<WidgetName, unknown>()

function isWidgetName(name: string): name is WidgetName {
  return (WIDGET_NAMES as readonly string[]).includes(name)
}

/**
 * Register override components keyed by widget name (the file's basename).
 * An unknown name is almost always a typo in extensions/…/widgets/, so it
 * fails the build naming the valid parts instead of being silently ignored.
 */
export function registerWidgets(overrides: Record<string, unknown>, source = 'widgets'): void {
  for (const [name, component] of Object.entries(overrides)) {
    if (!isWidgetName(name)) {
      throw new Error(
        `${source}: "${name}" is not a widget — valid names: ${WIDGET_NAMES.join(', ')}`,
      )
    }
    registry.set(name, component)
  }
}

/** The registered override for `name`, or the built-in passed in. */
export function resolveWidget<T>(name: WidgetName, builtin: T): T {
  return (registry.get(name) as T | undefined) ?? builtin
}

/** Test seam. */
export function clearWidgets(): void {
  registry.clear()
}

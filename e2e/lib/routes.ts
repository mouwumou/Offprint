import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Content-agnostic route discovery: the deep tests derive their
// route lists from the build output instead of hardcoding sample-content
// slugs, so the same suite passes on any instance's content.

/** redirects.yaml entries build into meta-refresh stubs, not real pages. */
function redirectTarget(distDir: string, route: string): string | null {
  const head = readFileSync(join(distDir, route, 'index.html'), 'utf8').slice(0, 512)
  const match = /http-equiv="refresh"[^>]*url=([^"]+)"/.exec(head)
  return match?.[1] ?? null
}

/** All real HTML routes of a directory-format static build ('/', '/about/', …). */
export function discoverRoutes(distDir: string): string[] {
  return walkRoutes(distDir).filter((route) => redirectTarget(distDir, route) === null)
}

/** The redirect stubs, with the destination each one points at. */
export function discoverRedirects(distDir: string): { route: string; target: string }[] {
  return walkRoutes(distDir).flatMap((route) => {
    const target = redirectTarget(distDir, route)
    return target === null ? [] : [{ route, target }]
  })
}

function walkRoutes(distDir: string): string[] {
  const routes: string[] = []
  const walk = (dir: string, prefix: string): void => {
    for (const name of readdirSync(dir)) {
      if (prefix === '/' && name === 'pagefind') continue
      const path = join(dir, name)
      if (statSync(path).isDirectory()) {
        walk(path, `${prefix}${name}/`)
      } else if (name === 'index.html') {
        routes.push(prefix)
      }
    }
  }
  walk(distDir, '/')
  return routes.sort()
}

/**
 * One representative route per URL shape, so per-page checks (axe, viewport
 * overflow, Lighthouse) cover every page TYPE without scaling with content
 * size. Shape: strip the language prefix, then collection entries (depth ≥ 2
 * with siblings) collapse to `parent/*`; top-level pages stay distinct.
 * Language prefixes are kept apart so every language is sampled.
 */
export function sampleRoutes(routes: string[], locales: readonly string[]): string[] {
  const siblingCount = new Map<string, number>()
  for (const route of routes) {
    const parent = route.replace(/[^/]+\/$/, '')
    if (parent !== route) siblingCount.set(parent, (siblingCount.get(parent) ?? 0) + 1)
  }

  const depthWithoutLang = (route: string): number => {
    const segments = route.split('/').filter(Boolean)
    if (segments[0] !== undefined && locales.includes(segments[0])) segments.shift()
    return segments.length
  }

  const seen = new Set<string>()
  const sample: string[] = []
  for (const route of routes) {
    const parent = route.replace(/[^/]+\/$/, '')
    const isCollectionEntry =
      depthWithoutLang(route) >= 2 && parent !== route && (siblingCount.get(parent) ?? 0) > 1
    const shape = isCollectionEntry ? `${parent}*` : route
    if (seen.has(shape)) continue
    seen.add(shape)
    sample.push(route)
  }
  return sample
}

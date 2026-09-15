// Links between Notion pages arrive as https://www.notion.so/<slug>-<id> (or
// a bare <id>, or <workspace>.notion.site/…). When the target is a document
// of this same sync, the link becomes the site's own route; anything else is
// left alone. The routes are the site's structural ones (/blog/<urlname>,
// /<slug>), which content already relies on.

/** Notion page id (32 hex, no dashes) → root-relative route, e.g. /zh/blog/x. */
export type RouteMap = Map<string, string>

const PAGE_ID =
  /(?:^|[/-])([0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?=[?#]|$)/i

/** The page id a Notion URL points at, or null when it is not a page link. */
export function notionPageId(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const host = parsed.hostname.toLowerCase()
  if (host !== 'notion.so' && host !== 'www.notion.so' && !host.endsWith('.notion.site')) {
    return null
  }
  // Asset URLs (notion.so/image/…, /signed/…) carry ids in the query, not the path.
  if (/^\/(?:image|signed)\//.test(parsed.pathname)) return null
  const match = PAGE_ID.exec(parsed.pathname)
  return match?.[1] ? match[1].replaceAll('-', '').toLowerCase() : null
}

/** Route for a synced document. Only the default language lives at the root. */
export function routeFor(
  kind: 'post' | 'page',
  slug: string,
  lang: string,
  defaultLang: string,
): string {
  const prefix = lang === defaultLang ? '' : `/${lang}`
  return kind === 'post' ? `${prefix}/blog/${slug}` : `${prefix}/${slug}`
}

const LINK = /(\]\(|<)(https?:\/\/[^\s)>]+)(\)|>)/g

/**
 * Rewrite Markdown link targets (`[text](url)` and `<url>`) that point at
 * synced Notion pages. Fenced code is left untouched. Unresolved page ids are
 * returned so the sync can say which links stayed on Notion.
 */
export function rewriteNotionLinks(
  markdown: string,
  routes: RouteMap,
): { markdown: string; unresolved: string[] } {
  const unresolved = new Set<string>()
  const rewrite = (chunk: string): string =>
    chunk.replace(LINK, (whole, open: string, url: string, close: string) => {
      const id = notionPageId(url)
      if (id === null) return whole
      const route = routes.get(id)
      if (route === undefined) {
        unresolved.add(id)
        return whole
      }
      return `${open}${route}${close}`
    })
  // Split on fences so code samples keep their URLs verbatim.
  const parts = markdown.split(/(^(?:```|~~~)[\s\S]*?^(?:```|~~~)[ \t]*$)/m)
  const out = parts.map((part, index) => (index % 2 === 1 ? part : rewrite(part))).join('')
  return { markdown: out, unresolved: [...unresolved] }
}

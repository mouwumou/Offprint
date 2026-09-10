import type { PageSummary, PostSummary } from './provider'

/**
 * List rule: every list shows each article once — in the requested
 * language when a translation exists, otherwise in its only language (the
 * caller renders a language badge when `post.lang` differs). Input order
 * (pinned-first, newest-first) is preserved by first occurrence.
 */
/** The same list rule for standalone pages, keyed by slug. */
export function pagesForLanguage(pages: readonly PageSummary[], lang: string): PageSummary[] {
  const bySlug = new Map<string, PageSummary>()
  for (const page of pages) {
    const existing = bySlug.get(page.slug)
    if (existing === undefined || (existing.lang !== lang && page.lang === lang)) {
      bySlug.set(page.slug, page)
    }
  }
  return [...bySlug.values()].sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug))
}

/** Distinct categories across published posts, in first-seen order. */
export function collectCategories(posts: readonly PostSummary[]): string[] {
  return [...new Set(posts.flatMap((post) => post.categories))]
}

/**
 * Tags visible in one language's display list, with counts. A tag
 * carried only by a post's other-language translation does NOT belong here —
 * deriving tags globally produced empty /blog/tag/* pages in the language
 * whose translation lacks the tag, and double counts for shared tags.
 */
export function tagsForLanguage(
  posts: readonly PostSummary[],
  lang: string,
): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const post of postsForLanguage(posts, lang)) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

/** Categories visible in one language's display list, in first-seen order. */
export function categoriesForLanguage(posts: readonly PostSummary[], lang: string): string[] {
  return [...new Set(postsForLanguage(posts, lang).flatMap((post) => post.categories))]
}

export function postsForLanguage(posts: readonly PostSummary[], lang: string): PostSummary[] {
  const byUrlname = new Map<string, PostSummary>()
  for (const post of posts) {
    const existing = byUrlname.get(post.urlname)
    if (existing === undefined) {
      byUrlname.set(post.urlname, post)
    } else if (existing.lang !== lang && post.lang === lang) {
      byUrlname.set(post.urlname, post)
    }
  }
  return [...byUrlname.values()]
}

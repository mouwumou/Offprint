import { postsForLanguage } from './posts-view'
import type { PostSummary } from './provider'

/**
 * Related posts (P3-10): shared tags weigh double, shared categories single;
 * translations of the current post never appear, and the ADR-007 language
 * preference applies.
 */
export function relatedPosts(
  all: readonly PostSummary[],
  current: PostSummary,
  lang: string,
  max = 3,
): PostSummary[] {
  return postsForLanguage(all, lang)
    .filter((post) => post.urlname !== current.urlname)
    .map((post) => ({
      post,
      score:
        post.tags.filter((tag) => current.tags.includes(tag)).length * 2 +
        post.categories.filter((category) => current.categories.includes(category)).length,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.post.date.getTime() - a.post.date.getTime())
    .slice(0, max)
    .map((entry) => entry.post)
}

/** All posts of the current post's series, oldest first; [] unless ≥ 2. */
export function seriesNav(
  all: readonly PostSummary[],
  current: PostSummary,
  lang: string,
): PostSummary[] {
  if (current.series === undefined) return []
  const posts = postsForLanguage(all, lang)
    .filter((post) => post.series === current.series)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  return posts.length >= 2 ? posts : []
}

/** Posts meaningfully edited after publication, most recently updated first. */
export function recentlyUpdated(
  all: readonly PostSummary[],
  lang: string,
  max = 3,
): PostSummary[] {
  return postsForLanguage(all, lang)
    .filter((post) => post.updated.getTime() > post.date.getTime())
    .sort((a, b) => b.updated.getTime() - a.updated.getTime())
    .slice(0, max)
}

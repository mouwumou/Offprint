import type { PostSummary } from './provider'

/**
 * ADR-007 list rule: every list shows each article once — in the requested
 * language when a translation exists, otherwise in its only language (the
 * caller renders a language badge when `post.lang` differs). Input order
 * (pinned-first, newest-first) is preserved by first occurrence.
 */
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

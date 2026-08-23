import type { SiteConfig } from '../config/schema'
import type { Post } from '../content'
import type { Stats } from '../content/markdown'
import { resolveLocalized } from '../schema'

/** schema.org Person for the homepage (constraint 7). */
export function personJsonLd(config: SiteConfig, lang: string, siteUrl: string): object {
  const profile = config.profile
  const r = (value: Parameters<typeof resolveLocalized>[0]) =>
    resolveLocalized(value, lang, config.i18n.default)
  const sameAs = [
    ...profile.links.map((link) => link.href),
    ...(profile.orcid ? [`https://orcid.org/${profile.orcid}`] : []),
    ...(profile.scholar ? [`https://scholar.google.com/citations?user=${profile.scholar}`] : []),
  ]
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: r(profile.name),
    ...(profile.role ? { jobTitle: r(profile.role) } : {}),
    ...(profile.email ? { email: `mailto:${profile.email}` } : {}),
    ...(profile.photo ? { image: profile.photo } : {}),
    url: siteUrl,
    ...(profile.affiliation
      ? { affiliation: { '@type': 'Organization', name: r(profile.affiliation) } }
      : {}),
    knowsAbout: profile.interests.map((interest) => r(interest)),
    sameAs,
  }
}

/** schema.org BlogPosting for post pages (constraint 7). */
export function blogPostingJsonLd(
  config: SiteConfig,
  post: Post,
  _stats: Stats,
  url: string,
  siteUrl: string,
): object {
  const name = resolveLocalized(config.profile.name, post.lang, config.i18n.default)
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    ...(post.description ? { description: post.description } : {}),
    datePublished: post.date.toISOString(),
    dateModified: post.updated.toISOString(),
    inLanguage: post.lang,
    author: { '@type': 'Person', name, url: siteUrl },
    ...(post.cover ? { image: post.cover } : {}),
    ...(post.tags.length > 0 ? { keywords: post.tags.join(', ') } : {}),
    url,
    mainEntityOfPage: url,
  }
}

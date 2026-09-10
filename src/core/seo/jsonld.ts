import type { SiteConfig } from '../config/schema'
import type { Post } from '../content'
import type { Stats } from '../content/markdown'
import { resolveLocalized, type Profile, type Publication } from '../schema'

/** schema.org Person for the homepage (academic SEO). */
export function personJsonLd(
  profile: Profile,
  config: SiteConfig,
  lang: string,
  siteUrl: string,
): object {
  const r = (value: Parameters<typeof resolveLocalized>[0]) =>
    resolveLocalized(value, lang, config.i18n.default)
  // Deduplicated: the dedicated orcid/scholar fields and a visible link in
  // profile.links may legitimately name the same URL.
  const sameAs = [
    ...new Set([
      ...profile.links.map((link) => link.href),
      ...(profile.orcid ? [`https://orcid.org/${profile.orcid}`] : []),
      ...(profile.scholar ? [`https://scholar.google.com/citations?user=${profile.scholar}`] : []),
    ]),
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

/**
 * schema.org ScholarlyArticle entries for the homepage Selected work section
 *. Highwire Press citation_* meta belongs to the phase-3 publication
 * pages.
 */
export function scholarlyArticlesJsonLd(
  config: SiteConfig,
  publications: readonly Publication[],
  lang: string,
): object[] {
  return publications.map((pub) => ({
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: resolveLocalized(pub.title, lang, config.i18n.default),
    author: pub.authors.map((name) => ({ '@type': 'Person', name })),
    datePublished: String(pub.year),
    isPartOf: { '@type': 'Periodical', name: pub.venue },
    ...(pub.doi
      ? { identifier: `doi:${pub.doi}`, sameAs: `https://doi.org/${pub.doi}` }
      : pub.arxiv
        ? { sameAs: `https://arxiv.org/abs/${pub.arxiv}` }
        : {}),
    ...(pub.pdf ? { url: pub.pdf } : {}),
  }))
}

/** schema.org BlogPosting for post pages (academic SEO). */
export function blogPostingJsonLd(
  profile: Profile,
  config: SiteConfig,
  post: Post,
  _stats: Stats,
  url: string,
  siteUrl: string,
): object {
  const name = resolveLocalized(profile.name, post.lang, config.i18n.default)
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

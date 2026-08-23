import type { SiteConfig } from '../config/schema'
import { resolveLocalized, type Publication } from '../schema'

/**
 * Highwire Press citation_* meta for publication detail pages (constraint 7,
 * P3-0) — what Google Scholar actually crawls.
 */
export function highwireMeta(
  config: SiteConfig,
  publication: Publication,
  lang: string,
): { name: string; content: string }[] {
  const meta: { name: string; content: string }[] = []
  const push = (name: string, content: string | undefined): void => {
    if (content) meta.push({ name, content })
  }

  push('citation_title', resolveLocalized(publication.title, lang, config.i18n.default))
  for (const author of publication.authors) push('citation_author', author)
  push('citation_publication_date', String(publication.year))
  if (publication.type === 'journal') push('citation_journal_title', publication.venue)
  else if (publication.type === 'conference' || publication.type === 'workshop')
    push('citation_conference_title', publication.venue)
  else push('citation_technical_report_institution', publication.venue)
  push('citation_doi', publication.doi)
  push('citation_arxiv_id', publication.arxiv)
  push('citation_pdf_url', publication.pdf)
  return meta
}

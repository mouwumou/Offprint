import { Cite, plugins } from '@citation-js/core'
import '@citation-js/plugin-csl'
import chicago from './styles/chicago-author-date.csl?raw'
import mla from './styles/modern-language-association.csl?raw'
import type { Publication } from '../schema'
import { resolveLocalized } from '../schema'
import { publicationToBibtex } from './bibtex'

export interface CitationFormats {
  bibtex: string
  apa: string
  mla: string
  chicago: string
}

let registered = false
function registerTemplates(): void {
  if (registered) return
  const config = plugins.config.get('@csl') as {
    styles: { add(name: string, template: string): void }
  }
  config.styles.add('mla', mla)
  config.styles.add('chicago', chicago)
  registered = true
}

/** 'M. E. Voss' → CSL name parts (last token = family; good enough for latin bylines). */
function toCslName(name: string): { family: string; given?: string } {
  const parts = name.trim().split(/\s+/)
  const family = parts.pop() ?? name
  return parts.length > 0 ? { family, given: parts.join(' ') } : { family }
}

function toCslJson(publication: Publication, lang: string): object {
  const cslTypes: Record<Publication['type'], string> = {
    journal: 'article-journal',
    conference: 'paper-conference',
    workshop: 'paper-conference',
    preprint: 'article',
    thesis: 'thesis',
  }
  return {
    id: publication.key,
    type: cslTypes[publication.type],
    title: resolveLocalized(publication.title, lang) ?? publication.key,
    author: publication.authors.map(toCslName),
    issued: { 'date-parts': [[publication.year]] },
    'container-title': publication.venue,
    ...(publication.doi ? { DOI: publication.doi } : {}),
    ...(publication.pdf ? { URL: publication.pdf } : {}),
  }
}

/** In-text citation label, APA-flavoured: (Voss & Nakamura, 2025) / (Voss et al., 2025). */
export function inlineCitation(publication: Publication): string {
  const family = (name: string): string => name.trim().split(/\s+/).pop() ?? name
  const authors = publication.authors
  const names =
    authors.length === 1
      ? family(authors[0] ?? '')
      : authors.length === 2
        ? `${family(authors[0] ?? '')} & ${family(authors[1] ?? '')}`
        : `${family(authors[0] ?? '')} et al.`
  return `(${names}, ${publication.year})`
}

/** One reference-list entry (APA text) for the in-post bibliography (P3-2). */
export function bibliographyEntry(publication: Publication, lang: string): string {
  registerTemplates()
  const cite = new Cite(toCslJson(publication, lang))
  return (
    cite.format('bibliography', { format: 'text', template: 'apa', lang: 'en-US' }) as string
  ).trim()
}

/**
 * Server-side citation rendering (P3-1): BibTeX from our own generator, the
 * prose styles via citation-js + CSL (APA bundled; MLA/Chicago vendored,
 * CC-BY-SA, headers preserved). Pages pass the strings to the dialog island
 * so no citation machinery ships to the client.
 */
export function citationFormats(publication: Publication, lang: string): CitationFormats {
  registerTemplates()
  const cite = new Cite(toCslJson(publication, lang))
  const format = (template: string): string =>
    (cite.format('bibliography', { format: 'text', template, lang: 'en-US' }) as string).trim()
  return {
    bibtex: publicationToBibtex(publication, lang),
    apa: format('apa'),
    mla: format('mla'),
    chicago: format('chicago'),
  }
}

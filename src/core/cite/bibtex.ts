import type { Publication } from '../schema'
import { resolveLocalized } from '../schema'

const entryTypes: Record<Publication['type'], string> = {
  journal: 'article',
  conference: 'inproceedings',
  workshop: 'inproceedings',
  preprint: 'misc',
  thesis: 'phdthesis',
}

/**
 * BibTeX generated from the YAML fields (fields → BibTeX, never the
 * reverse). A hand-written `bibtex` field overrides everything.
 */
export function publicationToBibtex(publication: Publication, fallbackLang: string): string {
  if (publication.bibtex) return publication.bibtex.trim()

  const type = entryTypes[publication.type]
  const title = resolveLocalized(publication.title, fallbackLang) ?? publication.key
  const fields: [string, string][] = [
    ['author', publication.authors.join(' and ')],
    ['title', title],
  ]
  if (publication.type === 'journal') fields.push(['journal', publication.venue])
  else if (publication.type === 'conference' || publication.type === 'workshop')
    fields.push(['booktitle', publication.venue])
  else if (publication.type === 'thesis') fields.push(['school', publication.venue])
  else fields.push(['howpublished', publication.venue])
  fields.push(['year', String(publication.year)])
  if (publication.doi) fields.push(['doi', publication.doi])
  if (publication.arxiv) fields.push(['eprint', publication.arxiv], ['archivePrefix', 'arXiv'])
  const url = publication.website ?? publication.pdf
  if (url) fields.push(['url', url])

  const body = fields.map(([key, value]) => `  ${key} = {${value}}`).join(',\n')
  return `@${type}{${publication.key},\n${body}\n}`
}

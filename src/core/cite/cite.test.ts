import { describe, expect, it } from 'vitest'
import { publicationSchema } from '../schema/publications'
import { publicationToBibtex } from './bibtex'
import { citationFormats } from './formats'

const pub = publicationSchema.parse({
  key: 'voss2025geometry',
  title: 'The geometry of uncertainty',
  authors: ['M. E. Voss', 'R. Nakamura'],
  year: 2025,
  venue: 'Nature Neuroscience',
  type: 'journal',
  doi: '10.1038/x',
})

describe('publicationToBibtex (ADR-008: fields → BibTeX)', () => {
  it('renders an @article with authors joined by and', () => {
    const bibtex = publicationToBibtex(pub, 'en')
    expect(bibtex).toContain('@article{voss2025geometry,')
    expect(bibtex).toContain('author = {M. E. Voss and R. Nakamura}')
    expect(bibtex).toContain('journal = {Nature Neuroscience}')
    expect(bibtex).toContain('doi = {10.1038/x}')
  })

  it('respects a hand-written bibtex override and maps conference/preprint types', () => {
    expect(publicationToBibtex({ ...pub, bibtex: '@misc{x, title={Y}}' }, 'en')).toBe(
      '@misc{x, title={Y}}',
    )
    expect(publicationToBibtex({ ...pub, type: 'conference' }, 'en')).toContain(
      'booktitle = {Nature Neuroscience}',
    )
  })
})

describe('citationFormats (P3-1)', () => {
  it('renders APA, MLA, and Chicago via CSL', () => {
    const formats = citationFormats(pub, 'en')
    expect(formats.apa).toMatch(/Voss, M\. E\., & Nakamura, R\. \(2025\)/)
    expect(formats.mla).toContain('Voss')
    expect(formats.mla).toContain('Nature Neuroscience')
    expect(formats.chicago).toContain('2025')
    expect(formats.bibtex).toContain('@article{voss2025geometry')
  })
})

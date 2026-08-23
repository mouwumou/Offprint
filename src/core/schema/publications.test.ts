import { describe, expect, it } from 'vitest'
import { markAuthors } from '../content/authors'
import { publicationSchema } from './publications'

const minimal = {
  key: 'voss2025geometry',
  title: 'The geometry of uncertainty',
  authors: ['M. E. Voss'],
  year: 2025,
  venue: 'Nature Neuroscience',
  type: 'journal',
}

describe('publicationSchema', () => {
  it('accepts a minimal entry and applies defaults', () => {
    const pub = publicationSchema.parse(minimal)
    expect(pub.selected).toBe(false)
    expect(pub.extra).toEqual({})
  })

  it('accepts a fully populated entry with localized title', () => {
    const pub = publicationSchema.parse({
      ...minimal,
      title: { en: 'The geometry of uncertainty', zh: '不确定性的几何' },
      selected: true,
      doi: '10.1038/x',
      arxiv: '2403.11928',
      pdf: 'https://example.edu/a.pdf',
      award: 'Best Paper',
      abstract: 'A ribbon, not a curve.',
      notionId: 'passthrough',
    })
    expect(pub.selected).toBe(true)
    expect(pub.extra).toEqual({ notionId: 'passthrough' })
  })

  it('rejects entries missing required fields or with bad values', () => {
    expect(() => publicationSchema.parse({ ...minimal, key: undefined })).toThrow()
    expect(() => publicationSchema.parse({ ...minimal, authors: [] })).toThrow()
    expect(() => publicationSchema.parse({ ...minimal, type: 'patent' })).toThrow()
    expect(() => publicationSchema.parse({ ...minimal, year: '2025' })).toThrow()
    expect(() => publicationSchema.parse({ ...minimal, pdf: 'not a url' })).toThrow()
  })
})

describe('markAuthors', () => {
  it('flags the owner by any name variant, ignoring spacing and case', () => {
    const marked = markAuthors(
      ['M. E. Voss', 'R. Nakamura', 'mara e.  voss'],
      ['M. E. Voss', 'Mara E. Voss'],
    )
    expect(marked.map((a) => a.self)).toEqual([true, false, true])
    expect(markAuthors(['Mara  E.  Voss'], ['Mara E. Voss'])[0]?.self).toBe(true)
  })
})

describe('projectSchema', async () => {
  const { projectSchema } = await import('./projects')
  const minimal = { name: 'manifold-lab', blurb: 'A toolkit.' }

  it('accepts a minimal project with defaults', () => {
    const project = projectSchema.parse(minimal)
    expect(project.status).toBe('active')
    expect(project.tags).toEqual([])
  })

  it('accepts localized blurbs and validates urls/status', () => {
    expect(
      projectSchema.parse({ ...minimal, blurb: { en: 'A toolkit.', zh: '工具包。' } }).blurb,
    ).toEqual({ en: 'A toolkit.', zh: '工具包。' })
    expect(() => projectSchema.parse({ ...minimal, repo: 'not a url' })).toThrow()
    expect(() => projectSchema.parse({ ...minimal, status: 'dead' })).toThrow()
    expect(() => projectSchema.parse({ blurb: 'x' })).toThrow()
  })
})

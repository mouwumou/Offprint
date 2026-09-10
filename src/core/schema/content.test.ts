import { describe, expect, it } from 'vitest'
import { pageFrontmatterSchema } from './pages'
import { postFrontmatterSchema } from './posts'

// Minimal compliant post, as a YAML parser would hand it over (bare dates
// become Date instances).
const minimalPost = {
  title: 'The Geometry of Uncertainty',
  urlname: 'geometry-of-uncertainty',
  date: new Date('2025-07-02'),
  updated: new Date('2025-07-10'),
  lang: 'en',
}

describe('postFrontmatterSchema', () => {
  it('accepts a minimal post and applies defaults', () => {
    const post = postFrontmatterSchema.parse(minimalPost)
    expect(post.categories).toEqual([])
    expect(post.tags).toEqual([])
    expect(post.top).toBe(false)
    expect(post.draft).toBe(false)
    expect(post.cite).toBe(true)
    expect(post.extra).toEqual({})
  })

  it('accepts a fully populated post', () => {
    const post = postFrontmatterSchema.parse({
      ...minimalPost,
      description: 'On priors and manifolds.',
      categories: ['geometry', 'statistics'],
      tags: ['bayes', 'manifolds'],
      cover: 'assets/geometry.png',
      series: 'uncertainty',
      top: true,
      draft: true,
      cite: false,
      doi: '10.5281/zenodo.1234567',
      canonical: 'https://example.com/original',
      math: true,
    })
    expect(post.categories).toEqual(['geometry', 'statistics'])
    expect(post.doi).toBe('10.5281/zenodo.1234567')
  })

  it('accepts ISO strings for dates and normalizes to Date', () => {
    const post = postFrontmatterSchema.parse({
      ...minimalPost,
      date: '2025-07-02',
      updated: '2025-07-10T08:30:00Z',
    })
    expect(post.date).toBeInstanceOf(Date)
    expect(post.date.toISOString()).toBe('2025-07-02T00:00:00.000Z')
    expect(post.updated.toISOString()).toBe('2025-07-10T08:30:00.000Z')
  })

  it('normalizes a single-string categories value to an array', () => {
    const post = postFrontmatterSchema.parse({ ...minimalPost, categories: 'geometry' })
    expect(post.categories).toEqual(['geometry'])
  })

  it('passes unknown keys through under extra', () => {
    const post = postFrontmatterSchema.parse({
      ...minimalPost,
      notionId: 'abc123',
      customBadge: true,
    })
    expect(post.extra).toEqual({ notionId: 'abc123', customBadge: true })
    expect(post).not.toHaveProperty('notionId')
  })

  it('accepts image-host URLs and assets/ paths for cover, nothing else', () => {
    expect(() =>
      postFrontmatterSchema.parse({ ...minimalPost, cover: 'https://img.example.com/a.png' }),
    ).not.toThrow()
    expect(() =>
      postFrontmatterSchema.parse({ ...minimalPost, cover: 'assets/a.png' }),
    ).not.toThrow()
    expect(() =>
      postFrontmatterSchema.parse({ ...minimalPost, cover: '../secrets/a.png' }),
    ).toThrow(/cover/)
  })

  it('rejects a post without lang', () => {
    const { lang: _lang, ...withoutLang } = minimalPost
    expect(() => postFrontmatterSchema.parse(withoutLang)).toThrow()
  })

  it('rejects missing required fields', () => {
    expect(() => postFrontmatterSchema.parse({})).toThrow()
    const { updated: _updated, ...withoutUpdated } = minimalPost
    expect(() => postFrontmatterSchema.parse(withoutUpdated)).toThrow()
  })

  it('rejects malformed urlname, date, and canonical values', () => {
    expect(() => postFrontmatterSchema.parse({ ...minimalPost, urlname: 'Hello_World' })).toThrow(
      /slug/,
    )
    expect(() => postFrontmatterSchema.parse({ ...minimalPost, date: 'yesterday' })).toThrow(
      /ISO date/,
    )
    expect(() => postFrontmatterSchema.parse({ ...minimalPost, canonical: 'not a url' })).toThrow()
  })
})

const minimalPage = { title: 'About', slug: 'about', lang: 'en' }

describe('pageFrontmatterSchema', () => {
  it('accepts a minimal page and applies defaults', () => {
    const page = pageFrontmatterSchema.parse(minimalPage)
    expect(page.nav).toBe(false)
    expect(page.order).toBe(0)
    expect(page.updated).toBeUndefined()
    expect(page.extra).toEqual({})
  })

  it('accepts nav pages with an order and updated date', () => {
    const page = pageFrontmatterSchema.parse({
      ...minimalPage,
      nav: true,
      order: 2,
      updated: '2026-01-05',
    })
    expect(page.nav).toBe(true)
    expect(page.updated).toBeInstanceOf(Date)
  })

  it('rejects a page without lang or with a bad slug', () => {
    expect(() => pageFrontmatterSchema.parse({ title: 'About', slug: 'about' })).toThrow()
    expect(() => pageFrontmatterSchema.parse({ ...minimalPage, slug: 'About Me' })).toThrow(/slug/)
    expect(() => pageFrontmatterSchema.parse({ ...minimalPage, order: 1.5 })).toThrow()
  })
})

import { describe, expect, it } from 'vitest'
import type { PostSummary } from './provider'
import { recentlyUpdated, relatedPosts, seriesNav } from './related'

function post(overrides: Partial<PostSummary> & { urlname: string }): PostSummary {
  return {
    title: overrides.urlname,
    date: new Date('2025-01-01'),
    updated: new Date('2025-01-01'),
    lang: 'en',
    categories: [],
    tags: [],
    top: false,
    draft: false,
    cite: true,
    extra: {},
    description: undefined,
    cover: undefined,
    series: undefined,
    doi: undefined,
    canonical: undefined,
    math: undefined,
    ...overrides,
  }
}

const current = post({ urlname: 'a', tags: ['x', 'y'], categories: ['c'] })
const all = [
  current,
  post({ urlname: 'a', lang: 'zh', tags: ['x', 'y'] }), // translation — excluded
  post({ urlname: 'b', tags: ['x', 'y'], categories: ['c'], date: new Date('2025-02-01') }), // score 5
  post({ urlname: 'c', tags: ['x'] }), // score 2
  post({ urlname: 'd', categories: ['c'] }), // score 1
  post({ urlname: 'e', tags: ['z'] }), // score 0
]

describe('relatedPosts (P3-10)', () => {
  it('ranks by shared tags then categories and excludes self/translations', () => {
    expect(relatedPosts(all, current, 'en').map((p) => p.urlname)).toEqual(['b', 'c', 'd'])
  })
  it('returns nothing when nothing overlaps', () => {
    expect(relatedPosts(all, post({ urlname: 'solo' }), 'en')).toEqual([])
  })
})

describe('seriesNav', () => {
  const s1 = post({ urlname: 's1', series: 'ribbon', date: new Date('2025-01-01') })
  const s2 = post({ urlname: 's2', series: 'ribbon', date: new Date('2025-03-01') })
  it('orders the series oldest-first and needs at least two entries', () => {
    expect(seriesNav([s2, s1, current], s1, 'en').map((p) => p.urlname)).toEqual(['s1', 's2'])
    expect(seriesNav([s1, current], s1, 'en')).toEqual([])
    expect(seriesNav([s1, s2], current, 'en')).toEqual([])
  })
})

describe('recentlyUpdated', () => {
  it('lists posts edited after publication, newest edits first', () => {
    const u1 = post({ urlname: 'u1', updated: new Date('2025-05-01') })
    const u2 = post({ urlname: 'u2', updated: new Date('2025-06-01') })
    expect(recentlyUpdated([current, u1, u2], 'en').map((p) => p.urlname)).toEqual(['u2', 'u1'])
  })
})

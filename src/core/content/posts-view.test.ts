import { describe, expect, it } from 'vitest'
import type { PostSummary } from './provider'
import { categoriesForLanguage, tagsForLanguage } from './posts-view'

const post = (over: Partial<PostSummary>): PostSummary =>
  ({
    title: 'T',
    urlname: 'u',
    lang: 'en',
    date: new Date('2025-01-01'),
    updated: new Date('2025-01-01'),
    draft: false,
    top: false,
    tags: [],
    categories: [],
    extra: {},
    cite: true,
    math: false,
    ...over,
  }) as unknown as PostSummary

describe('per-language tag/category views (ADR-007)', () => {
  // publishing-from-notion case: the zh translation carries 工具链, the en
  // translation does not — the en list shows the en translation, so the tag
  // must not exist in en (it produced an empty /blog/tag/工具链 page).
  const posts = [
    post({ urlname: 'a', lang: 'en', tags: ['tooling'], categories: ['Engineering'] }),
    post({ urlname: 'a', lang: 'zh', tags: ['tooling', '工具链'], categories: ['工程'] }),
    post({ urlname: 'b', lang: 'en', tags: ['geometry'], categories: ['Research'] }),
  ]

  it('derives tags from the display list, not from every translation', () => {
    expect(tagsForLanguage(posts, 'en')).toEqual([
      { tag: 'geometry', count: 1 },
      { tag: 'tooling', count: 1 },
    ])
    // zh shows a's zh translation plus b as en fallback.
    expect(tagsForLanguage(posts, 'zh')).toEqual([
      { tag: 'geometry', count: 1 },
      { tag: 'tooling', count: 1 },
      { tag: '工具链', count: 1 },
    ])
  })

  it('counts each article once instead of once per translation', () => {
    expect(tagsForLanguage(posts, 'en').find(({ tag }) => tag === 'tooling')?.count).toBe(1)
  })

  it('derives categories the same way', () => {
    expect(categoriesForLanguage(posts, 'en')).toEqual(['Engineering', 'Research'])
    expect(categoriesForLanguage(posts, 'zh')).toEqual(['工程', 'Research'])
  })
})

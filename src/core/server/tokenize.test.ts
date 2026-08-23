import MiniSearch from 'minisearch'
import { describe, expect, it } from 'vitest'
import { tokenizeCjk } from './tokenize'

describe('tokenizeCjk', () => {
  it('bigrams Han runs and passes latin through', () => {
    expect(tokenizeCjk('工具链')).toEqual(['工具', '具链'])
    expect(tokenizeCjk('a mixed 博客 sentence')).toEqual(['a', 'mixed', '博客', 'sentence'])
    expect(tokenizeCjk('用elog发布')).toEqual(['用', 'elog', '发布'])
    expect(tokenizeCjk('几何。')).toEqual(['几何'])
  })

  it('makes mid-sentence Chinese terms searchable in MiniSearch', () => {
    // The audit's failing queries against the default tokenizer.
    const index = new MiniSearch({
      fields: ['title', 'text'],
      storeFields: ['title'],
      tokenize: tokenizeCjk,
    })
    index.add({
      id: 1,
      title: '不确定性的几何',
      text: '我们讨论神经元群体如何编码不确定性，以及工具链与博客的构建。',
    })
    for (const query of ['不确定性', '工具链', '博客', '几何']) {
      expect(index.search(query, { prefix: true }).length, query).toBeGreaterThan(0)
    }
    expect(index.search('quantum', { prefix: true })).toHaveLength(0)
  })
})

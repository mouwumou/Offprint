import { describe, expect, it } from 'vitest'
import { notionPageId, rewriteNotionLinks, routeFor } from './links'

describe('notionPageId', () => {
  it('reads page ids from every Notion page URL shape and ignores assets', () => {
    const id = '27082c8a3c5280e2b832c2678345c394'
    expect(notionPageId('https://www.notion.so/27082c8a-3c52-80e2-b832-c2678345c394')).toBe(id)
    expect(
      notionPageId('https://www.notion.so/My-Post-27082c8a3c5280e2b832c2678345c394?pvs=4'),
    ).toBe(id)
    expect(
      notionPageId('https://acme.notion.site/My-Post-27082c8a3c5280e2b832c2678345c394#block'),
    ).toBe(id)
    expect(
      notionPageId(
        'https://www.notion.so/image/https%3A%2F%2Fx.png?table=block&id=27082c8a-3c52-80e2-b832-c2678345c394',
      ),
    ).toBeNull()
    expect(notionPageId('https://example.org/27082c8a3c5280e2b832c2678345c394')).toBeNull()
    expect(notionPageId('not a url')).toBeNull()
  })
})

describe('routeFor', () => {
  it('puts only the default language at the root', () => {
    expect(routeFor('post', 'kv-cache', 'en', 'en')).toBe('/blog/kv-cache')
    expect(routeFor('post', 'rag-bm25', 'zh', 'en')).toBe('/zh/blog/rag-bm25')
    expect(routeFor('page', 'about', 'zh', 'en')).toBe('/zh/about')
  })
})

describe('rewriteNotionLinks', () => {
  const routes = new Map([['27082c8a3c5280e2b832c2678345c394', '/blog/cv']])

  it('rewrites links to synced pages, keeps the rest, and reports unresolved ids', () => {
    const md = [
      'See [my CV](https://www.notion.so/27082c8a-3c52-80e2-b832-c2678345c394) and',
      '<https://www.notion.so/27082c8a-3c52-80e2-b832-c2678345c394#heading>,',
      'but [this one](https://www.notion.so/Draft-35a82c8a3c528007aaadd2a0e3af240e) is a draft',
      'and [the web](https://example.org/x) is not Notion.',
    ].join(' ')
    const { markdown, unresolved } = rewriteNotionLinks(md, routes)
    expect(markdown).toContain('[my CV](/blog/cv)')
    expect(markdown).toContain('</blog/cv>')
    expect(markdown).toContain('(https://www.notion.so/Draft-35a82c8a3c528007aaadd2a0e3af240e)')
    expect(markdown).toContain('(https://example.org/x)')
    expect(unresolved).toEqual(['35a82c8a3c528007aaadd2a0e3af240e'])
  })

  it('leaves fenced code alone', () => {
    const md = '```\n[x](https://www.notion.so/27082c8a-3c52-80e2-b832-c2678345c394)\n```\n'
    expect(rewriteNotionLinks(md, routes).markdown).toBe(md)
  })
})

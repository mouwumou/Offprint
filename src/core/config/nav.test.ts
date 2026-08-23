import { describe, expect, it } from 'vitest'
import { defineConfig } from './define-config'
import { resolveNav, type NavPage } from './nav'

const minimal = { profile: { name: 'Ada Lovelace' } }

const pages: NavPage[] = [
  { slug: 'about', title: 'About', nav: true },
  { slug: 'teaching', title: 'Teaching', nav: false },
]

describe('resolveNav (ADR-015)', () => {
  it('defaults to home, enabled modules, then nav:true pages', () => {
    const config = defineConfig({ ...minimal, modules: { publications: false } })
    const nav = resolveNav(config, 'en', pages)
    expect(nav.map((item) => item.href)).toEqual(['/', '/blog', '/projects', '/cv', '/about'])
    expect(nav[0]).toEqual({ href: '/', label: 'Home', exact: true })
    expect(nav.at(-1)?.label).toBe('About')
  })

  it('prefixes every href for a non-default language', () => {
    const config = defineConfig(minimal)
    const nav = resolveNav(config, 'zh', [])
    expect(nav[0]?.href).toBe('/zh')
    expect(nav.map((item) => item.href).slice(1)).toEqual([
      '/zh/blog',
      '/zh/publications',
      '/zh/projects',
      '/zh/cv',
    ])
  })

  it('an explicit nav is authoritative: order, labels, and free links', () => {
    const config = defineConfig({
      ...minimal,
      nav: [
        { module: 'home', label: { en: 'Start', zh: '起点' } },
        { page: 'about' },
        { module: 'blog' },
        { href: '/talks-archive', label: { en: 'Talks' } },
        { href: 'https://example.org', label: { en: 'Lab' } },
      ],
    })
    const nav = resolveNav(config, 'zh', pages)
    expect(nav).toEqual([
      { href: '/zh', label: '起点', exact: true },
      { href: '/zh/about', label: 'About' },
      { href: '/zh/blog', label: '文章' },
      { href: '/zh/talks-archive', label: 'Talks' },
      { href: 'https://example.org', label: 'Lab' },
    ])
  })

  it('skips disabled modules and missing pages instead of breaking', () => {
    const config = defineConfig({
      ...minimal,
      modules: { publications: false },
      nav: [{ module: 'publications' }, { page: 'nope' }, { module: 'cv' }],
    })
    expect(resolveNav(config, 'en', pages)).toEqual([{ href: '/cv', label: 'CV' }])
  })

  it('rejects a nav entry with an unknown shape', () => {
    expect(() => defineConfig({ ...minimal, nav: [{ modul: 'blog' }] as never })).toThrow()
  })
})

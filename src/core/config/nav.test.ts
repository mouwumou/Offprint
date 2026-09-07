import { afterEach, describe, expect, it, vi } from 'vitest'
import { basePath } from './base'
import { defineConfig } from './define-config'
import { resolveNav, type NavPage } from './nav'

// Spy-mocked so the sub-path tests can set a base without an Astro build.
vi.mock('./base', { spy: true })

const minimal = { profile: { name: 'Ada Lovelace' } }

const pages: NavPage[] = [
  { slug: 'about', title: 'About', lang: 'en', nav: true },
  { slug: 'teaching', title: 'Teaching', lang: 'en', nav: false },
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
    expect(nav[0]?.href).toBe('/zh/')
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
    // `about` here is the en fallback summary — its link must stay at /about.
    const nav = resolveNav(config, 'zh', pages)
    expect(nav).toEqual([
      { href: '/zh/', label: '起点', exact: true },
      { href: '/about', label: 'About' },
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

describe('resolveNav language fallback (ADR-007)', () => {
  it('links a fallback-language page under its own prefix, not the requested one', () => {
    // The /zh/now dead link: `now` exists only in en, so the zh nav must
    // link /now — /zh/now is not a route.
    const config = defineConfig(minimal)
    const nav = resolveNav(config, 'zh', [
      { slug: 'about', title: '关于', lang: 'zh', nav: true },
      { slug: 'now', title: 'Now', lang: 'en', nav: true },
    ])
    expect(nav.slice(-2)).toEqual([
      { href: '/zh/about', label: '关于' },
      { href: '/now', label: 'Now' },
    ])
  })
})

describe('deployment sub-path (ADR-023)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('prefixes every href with the base, home stays slash-terminated', () => {
    vi.mocked(basePath).mockReturnValue('/repo')
    const config = defineConfig(minimal)
    expect(resolveNav(config, 'en', pages).map((item) => item.href)).toEqual([
      '/repo/',
      '/repo/blog',
      '/repo/publications',
      '/repo/projects',
      '/repo/cv',
      '/repo/about',
    ])
    expect(resolveNav(config, 'zh', [])[0]?.href).toBe('/repo/zh/')
  })

  it('leaves external links alone under a base', () => {
    vi.mocked(basePath).mockReturnValue('/repo')
    const config = defineConfig({
      ...minimal,
      nav: [{ href: 'https://lab.example', label: 'Lab' }],
    })
    expect(resolveNav(config, 'en', [])[0]?.href).toBe('https://lab.example')
  })
})

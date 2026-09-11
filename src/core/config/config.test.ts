import { describe, expect, it } from 'vitest'
import { resolveLocalized } from '../schema/localized'
import { defineConfig } from './define-config'

const minimal = {}

describe('defineConfig', () => {
  it('accepts a minimal config and applies all defaults', () => {
    const config = defineConfig(minimal)
    expect(config.modules).toEqual({
      blog: { enabled: true },
      pages: { enabled: true },
      publications: { enabled: true },
      projects: { enabled: true },
      cv: { enabled: true },
      news: { enabled: true },
    })
    expect(config.theme.name).toBe('scholar')
    expect(config.i18n).toEqual({ default: 'en', locales: ['en', 'zh'], noindex: [] })
    expect(config.runtime).toEqual({ mode: 'static', store: 'fs' })
    expect(config.seo).toEqual({ person: true })
  })

  it('lets modules be switched off', () => {
    const config = defineConfig({
      ...minimal,
      modules: { publications: false, projects: true },
    })
    expect(config.modules.publications.enabled).toBe(false)
    expect(config.modules.projects.enabled).toBe(true)
    expect(config.modules.blog.enabled).toBe(true)
  })

  it('rejects an i18n default outside locales', () => {
    expect(() =>
      defineConfig({ ...minimal, i18n: { default: 'fr', locales: ['en', 'zh'] } }),
    ).toThrow(/i18n\.default must be one of i18n\.locales/)
  })

  it('rejects unknown keys anywhere (typo protection)', () => {
    expect(() => defineConfig({ ...minimal, modles: {} } as never)).toThrow(/Invalid site\.config/)
    // profile moved to content/profile.yaml: a leftover block is now a typo-class error.
    expect(() => defineConfig({ profile: { name: 'Q' } } as never)).toThrow(/Invalid site\.config/)
  })

  it('rejects malformed field values with the offending path in the message', () => {
    expect(() => defineConfig({ ...minimal, theme: { accent: 'red' } })).toThrow(/hex color/)
    expect(() => defineConfig({ ...minimal, runtime: { mode: 'edge' } } as never)).toThrow(/mode/)
  })
})

describe('resolveLocalized', () => {
  it('passes plain strings through for any language', () => {
    expect(resolveLocalized('shared', 'zh')).toBe('shared')
  })

  it('picks the requested language, then the fallback, then anything', () => {
    const value = { en: 'Home', zh: '首页' }
    expect(resolveLocalized(value, 'zh')).toBe('首页')
    expect(resolveLocalized({ zh: '首页' }, 'en', 'zh')).toBe('首页')
    expect(resolveLocalized({ ja: 'ホーム' }, 'en', 'zh')).toBe('ホーム')
    expect(resolveLocalized(undefined, 'en')).toBeUndefined()
  })
})

describe('comments', () => {
  it('defaults off and demands full giscus config when enabled', () => {
    expect(defineConfig(minimal).comments.enabled).toBe(false)
    expect(() => defineConfig({ ...minimal, comments: { enabled: true } })).toThrow(/requires/)
    const config = defineConfig({
      ...minimal,
      comments: {
        enabled: true,
        repo: 'owner/repo',
        repoId: 'R_x',
        category: 'Comments',
        categoryId: 'DIC_x',
      },
    })
    expect(config.comments.repo).toBe('owner/repo')
  })
})

describe('module copy overrides', () => {
  it('widens booleans to settings and accepts copy objects', () => {
    const config = defineConfig({
      ...minimal,
      modules: {
        blog: { title: { en: 'Field notes', zh: '田野笔记' }, colophon: false },
        pages: true,
      },
    })
    expect(config.modules.blog).toEqual({
      enabled: true,
      title: { en: 'Field notes', zh: '田野笔记' },
      colophon: false,
    })
    expect(config.modules.pages.enabled).toBe(true)
    expect(() =>
      defineConfig({ ...minimal, modules: { blog: { titel: 'typo' } } as never }),
    ).toThrow()
    // Unimplemented freedoms are rejected, not silently accepted.
    expect(() => defineConfig({ ...minimal, modules: { talks: true } as never })).toThrow()
    expect(() =>
      defineConfig({ ...minimal, theme: { fonts: { serif: 'Lora' } } as never }),
    ).toThrow()
  })
})

describe('header/footer chrome', () => {
  it('defaults keep every chrome element on', () => {
    const config = defineConfig(minimal)
    expect(config.header).toEqual({ search: true, themeToggle: true, languageSwitcher: true })
    expect(config.footer).toEqual({ enabled: true, rss: true })
  })

  it('lets the brand title and colophon be hidden or replaced', () => {
    const config = defineConfig({
      ...minimal,
      header: { title: false, subtitle: { en: 'est. 2026' } },
      footer: { colophon: false, rss: false },
    })
    expect(config.header.title).toBe(false)
    expect(config.header.subtitle).toEqual({ en: 'est. 2026' })
    expect(config.footer.colophon).toBe(false)
    expect(config.footer.rss).toBe(false)
    expect(() => defineConfig({ ...minimal, header: { serch: true } as never })).toThrow()
  })
})

describe('home sections', () => {
  it('defaults to the academic bio/news/publications/posts sequence (A4)', () => {
    const config = defineConfig(minimal)
    expect(config.layout.width).toBe('narrow')
    expect(config.home.sections).toEqual([
      { type: 'bio-header' },
      { type: 'news', count: 5 },
      { type: 'publication-list', selectedOnly: true },
      { type: 'recent-posts', count: 3 },
    ])
  })

  it('accepts a custom sequence with per-section options', () => {
    const config = defineConfig({
      ...minimal,
      home: {
        sections: [
          { type: 'hero' },
          { type: 'prose', page: 'about', title: false },
          { type: 'recent-posts', count: 5, title: { en: 'Notes' } },
          { type: 'projects' },
        ],
      },
    })
    expect(config.home.sections[1]).toEqual({ type: 'prose', page: 'about', title: false })
    expect(config.home.sections[2]).toEqual({
      type: 'recent-posts',
      count: 5,
      title: { en: 'Notes' },
    })
  })

  it('rejects unknown section types and out-of-range counts', () => {
    expect(() =>
      defineConfig({ ...minimal, home: { sections: [{ type: 'carousel' }] } as never }),
    ).toThrow()
    expect(() =>
      defineConfig({
        ...minimal,
        home: { sections: [{ type: 'recent-posts', count: 40 }] } as never,
      }),
    ).toThrow()
  })
})

describe('module registry', () => {
  it('rejects an unregistered module with a "not registered" error', () => {
    expect(() => defineConfig({ ...minimal, modules: { talks: true } as never })).toThrow(
      /module "talks" is not registered/,
    )
  })

  it('a registered site-local module becomes legal config, nav, and copy', async () => {
    const { registerModule } = await import('../modules/registry')
    const { resolveNav } = await import('./nav')
    const { moduleCopy } = await import('./copy')
    registerModule({
      id: 'guestbook',
      nav: { path: '/guestbook', labelKey: 'nav.home' },
    })
    const config = defineConfig({
      ...minimal,
      modules: { guestbook: { title: { en: 'Guestbook' } } },
      nav: [{ module: 'guestbook' }],
    })
    // Registry state is module-global per test file (vitest isolates files);
    // the extra module is harmless to the remaining assertions here.
    expect(config.modules['guestbook']).toEqual({ enabled: true, title: { en: 'Guestbook' } })
    expect(resolveNav(config, 'en', [])).toEqual([{ href: '/guestbook', label: 'Home' }])
    expect(moduleCopy(config, 'guestbook', 'en').title).toBe('Guestbook')
  })

  it('duplicate registration fails loudly', async () => {
    const { registerModule } = await import('../modules/registry')
    expect(() => registerModule({ id: 'blog' })).toThrow(/already registered/)
  })
})

describe('site-local module manifests', () => {
  it('discovers src/site/modules/<id>/module.yaml and makes it legal config', async () => {
    const { mkdir, rm, writeFile } = await import('node:fs/promises')
    await mkdir('extensions/modules/reading', { recursive: true })
    await writeFile(
      'extensions/modules/reading/module.yaml',
      'nav: { path: /reading, label: { en: Reading, zh: 在读 } }\ncopy: { title: { en: Reading list } }\n',
    )
    try {
      const { getModule, rediscoverSiteModules } = await import('../modules/registry')
      rediscoverSiteModules()
      const { resolveNav } = await import('./nav')
      const { moduleCopy } = await import('./copy')
      expect(getModule('reading')?.nav).toEqual({
        path: '/reading',
        label: { en: 'Reading', zh: '在读' },
      })
      const config = defineConfig({
        ...minimal,
        modules: { reading: true },
        nav: [{ module: 'reading' }],
      })
      expect(resolveNav(config, 'zh', [])).toEqual([{ href: '/zh/reading', label: '在读' }])
      expect(moduleCopy(config, 'reading', 'en').title).toBe('Reading list')
    } finally {
      await rm('extensions/modules', { recursive: true, force: true })
    }
  })
})

describe('i18n.noindex', () => {
  it('accepts listed locales and rejects unknown ones', async () => {
    const { defineConfig } = await import('./define-config')
    expect(defineConfig({ i18n: { noindex: ['zh'] } }).i18n.noindex).toEqual(['zh'])
    expect(() => defineConfig({ i18n: { noindex: ['fr'] } })).toThrow(/noindex/)
  })
})

describe('modules.blog options', () => {
  it('accepts colophon: false and related: false', async () => {
    const { defineConfig } = await import('./define-config')
    const config = defineConfig({
      modules: { blog: { colophon: false, related: false } },
    })
    expect(config.modules.blog).toMatchObject({ enabled: true, colophon: false, related: false })
  })
})

describe('modules.blog.search / modules.cv.indexable', () => {
  it('parses the search switch and the CV indexability flag', async () => {
    const { defineConfig } = await import('./define-config')
    const config = defineConfig({
      modules: { blog: { search: false }, cv: { indexable: false } },
    })
    expect(config.modules.blog).toMatchObject({ enabled: true, search: false })
    expect(config.modules.cv).toMatchObject({ enabled: true, indexable: false })
  })
})

describe('modules.publications.detail', () => {
  it('accepts detail: false alongside order', async () => {
    const { defineConfig } = await import('./define-config')
    const config = defineConfig({ modules: { publications: { detail: false, order: 'file' } } })
    expect(config.modules.publications).toMatchObject({
      enabled: true,
      detail: false,
      order: 'file',
    })
  })
})

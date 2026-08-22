import { describe, expect, it } from 'vitest'
import { resolveLocalized } from '../schema/localized'
import { defineConfig } from './define-config'

const minimal = { profile: { name: 'Ada Lovelace' } }

describe('defineConfig', () => {
  it('accepts a minimal config and applies all defaults', () => {
    const config = defineConfig(minimal)
    expect(config.modules).toEqual({
      blog: true,
      pages: true,
      publications: true,
      projects: true,
      cv: true,
      talks: false,
      news: false,
    })
    expect(config.theme.preset).toBe('paper')
    expect(config.theme.fonts).toEqual({
      serif: 'Newsreader',
      sans: 'Inter',
      mono: 'JetBrains Mono',
    })
    expect(config.theme.darkMode).toBe('auto')
    expect(config.i18n).toEqual({ default: 'en', locales: ['en', 'zh'] })
    expect(config.runtime).toEqual({ mode: 'static', store: 'fs' })
    expect(config.profile.nameVariants).toEqual([])
  })

  it('accepts localized values as plain strings or {en,zh} records', () => {
    const config = defineConfig({
      profile: {
        name: { en: 'Ada Lovelace', zh: '阿达·洛芙莱斯' },
        affiliation: 'Analytical Engine Lab',
        links: [{ label: { en: 'Notes', zh: '笔记' }, href: 'https://example.com' }],
      },
    })
    expect(config.profile.name).toEqual({ en: 'Ada Lovelace', zh: '阿达·洛芙莱斯' })
    expect(config.profile.affiliation).toBe('Analytical Engine Lab')
  })

  it('lets modules be switched off', () => {
    const config = defineConfig({
      ...minimal,
      modules: { publications: false, talks: true },
    })
    expect(config.modules.publications).toBe(false)
    expect(config.modules.talks).toBe(true)
    expect(config.modules.blog).toBe(true)
  })

  it('rejects an i18n default outside locales', () => {
    expect(() =>
      defineConfig({ ...minimal, i18n: { default: 'fr', locales: ['en', 'zh'] } }),
    ).toThrow(/i18n\.default must be one of i18n\.locales/)
  })

  it('rejects unknown keys anywhere (typo protection)', () => {
    expect(() => defineConfig({ ...minimal, modles: {} } as never)).toThrow(/Invalid site\.config/)
    expect(() => defineConfig({ profile: { name: 'Q', afiliation: 'x' } } as never)).toThrow(
      /Invalid site\.config/,
    )
  })

  it('rejects malformed field values with the offending path in the message', () => {
    expect(() => defineConfig({ profile: { name: 'Q', email: 'not-an-email' } })).toThrow(/email/)
    expect(() => defineConfig({ profile: { name: 'Q', orcid: '1234' } })).toThrow(/ORCID/)
    expect(() =>
      defineConfig({ profile: { name: 'Q', links: [{ label: 'x', href: 'not a url' }] } }),
    ).toThrow(/links/)
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

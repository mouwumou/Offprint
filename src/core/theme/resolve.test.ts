import { mkdir, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { themeManifestSchema } from './contract'
import { listThemes, resolveTheme } from './resolve'

describe('theme resolution', () => {
  it('resolves the built-in paper theme with full token tables', () => {
    const { manifest, cssPath } = resolveTheme('paper')
    expect(manifest.name).toBe('paper')
    expect(manifest.tokens.light['background']).toBe('#faf8f3')
    expect(manifest.tokens.dark['primary']).toBe('#cf9aa4')
    expect(manifest.fonts.serif).toContain('Newsreader')
    expect(manifest.voice).toEqual({
      labels: 'mono-caps',
      photo: 'grayscale-hover',
      density: 'airy',
    })
    expect(cssPath).toMatch(/themes\/paper\/theme\.css$/)
    expect(listThemes()).toContain('paper')
  })

  it('fails unknown names listing what exists (the resolver is the validation)', () => {
    expect(() => resolveTheme('nope')).toThrow(/theme "nope" not found — available themes: .*paper/)
  })

  it('rejects a manifest with missing tokens', () => {
    const result = themeManifestSchema.safeParse({
      name: 'x',
      tokens: { light: { background: '#fff' }, dark: { background: '#000' } },
      fonts: { sans: 'a', serif: 'b', mono: 'c' },
    })
    expect(result.success).toBe(false)
    // zod's exhaustive record names every missing token key.
    expect(JSON.stringify(result.error?.issues)).toContain('foreground')
  })

  describe('site-local themes shadow built-ins', () => {
    afterEach(async () => {
      await rm('extensions/themes', { recursive: true, force: true })
    })

    it('finds a theme dropped into src/site/themes', async () => {
      const { manifest } = resolveTheme('paper')
      await mkdir('extensions/themes/mytheme', { recursive: true })
      const { voice: _voice, ...rest } = manifest
      await writeFile(
        'extensions/themes/mytheme/theme.json',
        JSON.stringify({ ...rest, name: 'mytheme' }),
      )
      expect(listThemes()).toContain('mytheme')
      const local = resolveTheme('mytheme')
      expect(local.manifest.name).toBe('mytheme')
      expect(local.cssPath).toBeNull()
      // A manifest without voice defaults to the plain register.
      expect(local.manifest.voice).toEqual({ labels: 'plain', photo: 'plain', density: 'compact' })
    })
  })
})

describe('CSS injection guard (security audit)', () => {
  it('rejects a token or font value that could break out of <style>', () => {
    const base = {
      name: 'x',
      voice: {},
      options: {},
      fonts: { sans: 'a', serif: 'b', mono: 'c' },
    }
    const goodTokens = Object.fromEntries(
      [
        'background',
        'foreground',
        'card',
        'card-foreground',
        'primary',
        'primary-foreground',
        'secondary',
        'secondary-foreground',
        'muted',
        'muted-foreground',
        'accent',
        'accent-foreground',
        'border',
        'ring',
        'radius',
      ].map((k) => [k, '#000']),
    )
    const evil = { ...goodTokens, primary: '#000}</style><script>alert(1)</script>' }
    expect(
      themeManifestSchema.safeParse({ ...base, tokens: { light: evil, dark: goodTokens } }).success,
    ).toBe(false)
    expect(
      themeManifestSchema.safeParse({
        ...base,
        fonts: { sans: 'Inter</style>', serif: 'b', mono: 'c' },
        tokens: { light: goodTokens, dark: goodTokens },
      }).success,
    ).toBe(false)
  })
})

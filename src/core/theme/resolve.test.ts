import { mkdir, rm, writeFile } from 'node:fs/promises'
import { afterEach, describe, expect, it } from 'vitest'
import { themeManifestSchema } from './contract'
import { listThemes, resolveTheme } from './resolve'

describe('theme resolution (ADR-018)', () => {
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
      await rm('src/site/themes', { recursive: true, force: true })
    })

    it('finds a theme dropped into src/site/themes', async () => {
      const { manifest } = resolveTheme('paper')
      await mkdir('src/site/themes/mytheme', { recursive: true })
      const { voice: _voice, ...rest } = manifest
      await writeFile(
        'src/site/themes/mytheme/theme.json',
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

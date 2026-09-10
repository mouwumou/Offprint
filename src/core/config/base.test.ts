import { describe, expect, it } from 'vitest'
import { basePath, basePathFromSiteUrl, normalizeBase } from './base'

describe('basePathFromSiteUrl', () => {
  it("is '' at the origin root and the normalised pathname otherwise", () => {
    expect(basePathFromSiteUrl('https://example.com')).toBe('')
    expect(basePathFromSiteUrl('https://example.com/')).toBe('')
    expect(basePathFromSiteUrl('https://user.github.io/repo')).toBe('/repo')
    expect(basePathFromSiteUrl('https://user.github.io/repo/')).toBe('/repo')
    expect(basePathFromSiteUrl('https://h/a/b/')).toBe('/a/b')
  })

  it('rejects a relative SITE_URL loudly', () => {
    expect(() => basePathFromSiteUrl('example.com')).toThrow(/absolute URL/)
  })
})

describe('basePath (runtime)', () => {
  it('normalises with or without a trailing slash', () => {
    expect(normalizeBase('/')).toBe('')
    expect(normalizeBase('/repo/')).toBe('/repo')
    expect(normalizeBase('/repo')).toBe('/repo')
  })

  it("is '' in a root build (vitest, like an unset base)", () => {
    expect(basePath()).toBe('')
  })
})

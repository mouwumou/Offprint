import { describe, expect, it } from 'vitest'
import { parseProfile } from './profile'

describe('content/profile.yaml (ADR-028)', () => {
  it('needs only a name and applies the defaults', () => {
    const profile = parseProfile({ name: 'Ada Lovelace' })
    expect(profile.nameVariants).toEqual([])
    expect(profile.bio).toEqual([])
    expect(profile.links).toEqual([])
  })

  it('accepts localized values as plain strings or {en,zh} records', () => {
    const profile = parseProfile({
      name: { en: 'Ada Lovelace', zh: '阿达·洛芙莱斯' },
      affiliation: 'Analytical Engine Lab',
      links: [{ label: { en: 'Notes', zh: '笔记' }, href: 'https://example.com' }],
    })
    expect(profile.name).toEqual({ en: 'Ada Lovelace', zh: '阿达·洛芙莱斯' })
    expect(profile.affiliation).toBe('Analytical Engine Lab')
  })

  it('rejects unknown keys and malformed values, naming the file', () => {
    expect(() => parseProfile({ name: 'Q', afiliation: 'x' })).toThrow(/profile\.yaml/)
    expect(() => parseProfile({ name: 'Q', email: 'not-an-email' })).toThrow(/email/)
    expect(() => parseProfile({ name: 'Q', orcid: '1234' })).toThrow(/ORCID/)
    expect(() => parseProfile({ name: 'Q', links: [{ label: 'x', href: 'not a url' }] })).toThrow(
      /links/,
    )
    expect(() => parseProfile({})).toThrow(/name/)
  })
})

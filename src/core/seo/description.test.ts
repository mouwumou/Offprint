import { describe, expect, it } from 'vitest'
import { parseProfile } from '../schema/profile'
import { homeDescription } from './description'

describe('homeDescription', () => {
  it('prefers the tagline', () => {
    const profile = parseProfile(
      { name: 'Q', tagline: { en: 'Short.', zh: '短。' }, bio: ['Long bio.'] },
      'p',
    )
    expect(homeDescription(profile, 'zh', 'en')).toBe('短。')
  })

  it('falls back to the first bio paragraph as plain text, trimmed', () => {
    const long = `Hi there! I study **trustworthy** [ML](https://x). ${'word '.repeat(60)}`
    const profile = parseProfile({ name: 'Q', bio: [long, 'Second.'] }, 'p')
    const description = homeDescription(profile, 'en', 'en') ?? ''
    expect(description.startsWith('Hi there! I study trustworthy ML.')).toBe(true)
    expect(description.length).toBeLessThanOrEqual(160)
    expect(description.endsWith('…')).toBe(true)
  })

  it('falls back to the name when there is nothing else', () => {
    expect(homeDescription(parseProfile({ name: 'Q' }, 'p'), 'en', 'en')).toBe('Q')
  })
})

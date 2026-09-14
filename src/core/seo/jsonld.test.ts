import { describe, expect, it } from 'vitest'
import { defineConfig } from '../config/define-config'
import { parseProfile } from '../schema/profile'
import { personJsonLd } from './jsonld'

describe('personJsonLd', () => {
  it('absolutizes a repository-local photo like every other content URL', () => {
    const profile = parseProfile({ name: 'Q', photo: 'assets/photo.png' }, 'profile.yaml')
    const person = personJsonLd(profile, defineConfig({}), 'en', 'https://example.org/') as {
      image?: string
    }
    expect(person.image).toBe('https://example.org/assets/photo.png')
  })

  it('leaves an absolute photo URL alone', () => {
    const profile = parseProfile(
      { name: 'Q', photo: 'https://cdn.example.org/p.jpg' },
      'profile.yaml',
    )
    const person = personJsonLd(profile, defineConfig({}), 'en', 'https://example.org/') as {
      image?: string
    }
    expect(person.image).toBe('https://cdn.example.org/p.jpg')
  })
})

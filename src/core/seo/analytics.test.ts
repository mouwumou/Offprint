import { describe, expect, it } from 'vitest'
import { defineConfig } from '../config/define-config'
import { analyticsScripts } from './analytics'

describe('analytics', () => {
  it('is off by default', () => {
    expect(analyticsScripts(defineConfig({}).analytics)).toEqual([])
  })

  it('fills provider defaults and emits one script per provider', () => {
    const config = defineConfig({
      analytics: {
        umami: { websiteId: 'site-1' },
        plausible: { domain: 'example.org', src: 'https://stats.example.org/js/script.js' },
        goatcounter: { code: 'mysite' },
      },
    })
    expect(analyticsScripts(config.analytics)).toEqual([
      {
        src: 'https://cloud.umami.is/script.js',
        attrs: { defer: true, 'data-website-id': 'site-1' },
      },
      {
        src: 'https://stats.example.org/js/script.js',
        attrs: { defer: true, 'data-domain': 'example.org' },
      },
      {
        src: 'https://gc.zgo.at/count.js',
        attrs: { async: true, 'data-goatcounter': 'https://mysite.goatcounter.com/count' },
      },
    ])
  })

  it('rejects unknown providers and malformed values', () => {
    expect(() => defineConfig({ analytics: { ga: { id: 'G-1' } } } as never)).toThrow()
    expect(() => defineConfig({ analytics: { goatcounter: { code: 'My Site' } } })).toThrow(
      /goatcounter/,
    )
    expect(() => defineConfig({ analytics: { umami: { websiteId: 'x', src: 'nope' } } })).toThrow()
  })
})

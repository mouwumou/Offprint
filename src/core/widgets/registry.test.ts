import { afterEach, describe, expect, it } from 'vitest'
import { clearWidgets, registerWidgets, resolveWidget, WIDGET_NAMES } from './registry'

afterEach(() => clearWidgets())

describe('widget registry', () => {
  it('returns the built-in when nothing is registered', () => {
    const Builtin = { tag: 'builtin' }
    expect(resolveWidget('post-row', Builtin)).toBe(Builtin)
  })

  it('returns the override once registered, for any declared part', () => {
    const Override = { tag: 'override' }
    registerWidgets({ 'site-footer': Override })
    expect(resolveWidget('site-footer', { tag: 'builtin' })).toBe(Override)
    expect(WIDGET_NAMES).toContain('site-footer')
  })

  it('rejects an unknown widget name, naming the valid ones', () => {
    expect(() => registerWidgets({ 'publication-rows': {} }, 'extensions/widgets')).toThrow(
      /extensions\/widgets: "publication-rows" is not a widget — valid names: bio-header/,
    )
  })
})

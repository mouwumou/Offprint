import { describe, expect, it } from 'vitest'
import { resolveThemeOptions } from './current'
import type { ThemeOptionDecl } from './contract'

const declared: Record<string, ThemeOptionDecl> = {
  sidebar: { type: 'string', enum: ['left', 'right'], default: 'right' },
  showAffiliations: { type: 'boolean', default: true },
  columns: { type: 'number' },
}

describe('theme options (ADR-022)', () => {
  it('fills defaults and accepts declared values', () => {
    expect(resolveThemeOptions('x', declared, { sidebar: 'left' })).toEqual({
      sidebar: 'left',
      showAffiliations: true,
    })
  })

  it('rejects unknown options listing what the theme declares', () => {
    expect(() => resolveThemeOptions('x', declared, { sidbar: 'left' })).toThrow(
      /has no option "sidbar" — declared options: sidebar, showAffiliations, columns/,
    )
  })

  it('rejects wrong types and out-of-enum values', () => {
    expect(() => resolveThemeOptions('x', declared, { showAffiliations: 'yes' })).toThrow(
      /expects a boolean/,
    )
    expect(() => resolveThemeOptions('x', declared, { sidebar: 'top' })).toThrow(
      /one of: left, right/,
    )
  })
})

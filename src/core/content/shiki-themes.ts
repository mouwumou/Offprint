import type { ThemeRegistration } from 'shiki'

// Code-highlight colors from DESIGN-REFERENCE §1, locked by ADR-011:
// comment = muted-foreground italic, keyword = primary, plus fixed
// string/number/title colors per scheme.

const scopes = {
  comment: ['comment', 'punctuation.definition.comment'],
  keyword: ['keyword', 'storage.type', 'storage.modifier', 'keyword.operator.new'],
  string: ['string', 'punctuation.definition.string', 'string.template'],
  number: ['constant.numeric', 'constant.language', 'constant.character'],
  title: [
    'entity.name.function',
    'entity.name.type',
    'entity.name.class',
    'entity.name.tag',
    'support.function',
    'support.class',
  ],
}

function theme(
  name: string,
  type: 'light' | 'dark',
  colors: Record<keyof typeof scopes | 'foreground' | 'background', string>,
): ThemeRegistration {
  return {
    name,
    type,
    colors: {
      'editor.background': colors.background,
      'editor.foreground': colors.foreground,
    },
    settings: [
      { settings: { foreground: colors.foreground } },
      { scope: scopes.comment, settings: { foreground: colors.comment, fontStyle: 'italic' } },
      { scope: scopes.keyword, settings: { foreground: colors.keyword } },
      { scope: scopes.string, settings: { foreground: colors.string } },
      { scope: scopes.number, settings: { foreground: colors.number } },
      { scope: scopes.title, settings: { foreground: colors.title } },
    ],
  }
}

export const offprintLight = theme('offprint-light', 'light', {
  background: '#ffffff',
  foreground: '#1c1a16',
  comment: '#6c675c',
  keyword: '#6f2232',
  string: '#4f7a4f',
  number: '#9a6a2f',
  title: '#3a5a8c',
})

export const offprintDark = theme('offprint-dark', 'dark', {
  background: '#1e1c15',
  foreground: '#ebe6da',
  comment: '#a29c8c',
  keyword: '#cf9aa4',
  string: '#9ec49e',
  number: '#d8a765',
  title: '#8fb0dd',
})

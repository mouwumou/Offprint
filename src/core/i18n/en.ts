export const en = {
  'nav.home': 'Home',
  'nav.writing': 'Writing',
  'nav.projects': 'Projects',
  'nav.cv': 'CV',
  'layout.skipToContent': 'Skip to content',
  'layout.toggleTheme': 'Toggle color theme',
  'layout.colophon': 'Written in Notion · published with elog',
  'layout.rss': 'RSS',
  'post.back': '← Writing',
  'post.minRead': 'min read',
  'post.words': 'words',
  'post.updated': 'updated',
  'post.onThisPage': 'On this page',
  'post.colophon': 'Colophon',
  'post.colophonText':
    'Drafted in Notion, exported to markdown with elog, rendered here with KaTeX and syntax highlighting. The source of this post is a plain .md file in the repository.',
} as const

export type MessageKey = keyof typeof en

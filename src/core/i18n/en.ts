export const en = {
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

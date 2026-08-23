import MiniSearch from 'minisearch'
import siteConfig from '../config/current'
import { langPrefix } from '../config/nav'
import { getProvider } from '../content'

export interface SearchHit {
  url: string
  title: string
  excerpt: string
  lang: string
}

interface SearchDoc extends SearchHit {
  id: string
  text: string
}

// Server-mode in-memory index (P2-9): rebuilt lazily whenever the content
// version changes (which revalidate/watch roll on every sync).
let cached: { version: string; index: MiniSearch<SearchDoc> } | null = null

/** Rough markdown → text for indexing/excerpts. */
function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function buildIndex(): Promise<MiniSearch<SearchDoc>> {
  const provider = getProvider()
  const index = new MiniSearch<SearchDoc>({
    fields: ['title', 'text'],
    storeFields: ['url', 'title', 'excerpt', 'lang'],
  })

  if (siteConfig.modules.blog.enabled) {
    for (const summary of await provider.listPosts()) {
      const post = await provider.getPost(summary.urlname, summary.lang)
      if (!post) continue
      const text = plainText(post.body)
      index.add({
        id: `post:${post.urlname}:${post.lang}`,
        url: `${langPrefix(siteConfig, post.lang)}/blog/${post.urlname}/`,
        title: post.title,
        text,
        excerpt: post.description ?? text.slice(0, 160),
        lang: post.lang,
      })
    }
  }
  if (siteConfig.modules.pages.enabled) {
    for (const summary of await provider.listPages()) {
      const page = await provider.getPage(summary.slug, summary.lang)
      if (!page) continue
      const text = plainText(page.body)
      index.add({
        id: `page:${page.slug}:${page.lang}`,
        url: `${langPrefix(siteConfig, page.lang)}/${page.slug}`,
        title: page.title,
        text,
        excerpt: text.slice(0, 160),
        lang: page.lang,
      })
    }
  }
  return index
}

export async function searchContent(query: string, lang: string): Promise<SearchHit[]> {
  const version = await getProvider().version()
  if (cached === null || cached.version !== version) {
    cached = { version, index: await buildIndex() }
  }
  return cached.index
    .search(query, {
      prefix: true,
      fuzzy: 0.15,
      filter: (result) => result['lang'] === lang,
    })
    .slice(0, 10)
    .map((result) => ({
      url: result['url'] as string,
      title: result['title'] as string,
      excerpt: result['excerpt'] as string,
      lang: result['lang'] as string,
    }))
}

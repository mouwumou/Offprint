import { createHash } from 'node:crypto'
import matter from 'gray-matter'
import YAML from 'yaml'
import { z } from 'zod'
import {
  pageFrontmatterSchema,
  postFrontmatterSchema,
  projectsFileSchema,
  publicationsFileSchema,
  resumeSchema,
  type PageFrontmatter,
  type PostFrontmatter,
  type Project,
  type Publication,
  type Resume,
} from '../schema'
import type { ContentStore, Manifest } from '../store'

export type PostSummary = PostFrontmatter
export type Post = PostFrontmatter & { body: string }
export type PageSummary = PageFrontmatter
export type Page = PageFrontmatter & { body: string }
export type { Project, Publication, Resume } from '../schema'

/**
 * The semantic content layer (DYNAMIC-PUBLISHING §3.2): parsed + validated +
 * cached. Pages and components depend on this interface and nothing below it
 * (constraint 1). Static mode calls it once at build; server mode per request.
 */
export interface ContentProvider {
  listPosts(opts?: { includeDrafts?: boolean; lang?: string }): Promise<PostSummary[]>
  getPost(urlname: string, lang: string): Promise<Post | null>
  /** Every translation of one urlname, for interlinks and hreflang. */
  getTranslations(urlname: string): Promise<{ lang: string }[]>
  listTags(): Promise<{ tag: string; count: number }[]>
  listPages(lang?: string): Promise<PageSummary[]>
  listPublications(): Promise<Publication[]>
  listProjects(): Promise<Project[]>
  getCV(): Promise<Resume | null>
  /** Drop cached entries (manifest keys); no argument drops everything. */
  revalidate(keys?: string[]): Promise<void>
  /** Current content version (manifest hash), used for ETag / 304. */
  version(): Promise<string>
}

interface CacheEntry {
  hash: string
  value: unknown
}

function parseWith<T>(
  schema: z.ZodType<T, unknown>,
  raw: string,
  path: string,
): T & { body: string } {
  const { data, content } = matter(raw)
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new Error(`Invalid front-matter in ${path}:\n${z.prettifyError(result.error)}`)
  }
  return { ...result.data, body: content }
}

/** posts/<urlname>.<lang>.md — the filename is part of the contract (§1). */
function checkFilename(path: string, expected: string): void {
  const basename = path.slice(path.lastIndexOf('/') + 1)
  if (basename !== expected) {
    throw new Error(`Front-matter of ${path} implies filename ${expected}; rename one of them`)
  }
}

export function createProvider(store: ContentStore): ContentProvider {
  // undefined = not loaded yet; null = store has no manifest.
  let manifestCache: Manifest | null | undefined
  let hashByPath: Map<string, string> | undefined
  const fileCache = new Map<string, CacheEntry>()

  async function getManifest(): Promise<Manifest | null> {
    if (manifestCache === undefined) {
      manifestCache = await store.manifest()
      hashByPath = new Map(
        Object.values(manifestCache?.entries ?? {}).map((entry) => [entry.path, entry.hash]),
      )
    }
    return manifestCache
  }

  /**
   * Read + parse one file, memoized on the manifest hash. Without a manifest
   * (hand-written content) nothing is cached: the next build or request sees
   * edits immediately.
   */
  async function load<T>(path: string, parse: (raw: string, path: string) => T): Promise<T | null> {
    await getManifest()
    const hash = hashByPath?.get(path)
    if (hash !== undefined) {
      const cached = fileCache.get(path)
      if (cached && cached.hash === hash) return cached.value as T
    }
    const raw = await store.read(path)
    if (raw === null) return null
    const value = parse(raw, path)
    if (hash !== undefined) fileCache.set(path, { hash, value })
    return value
  }

  function parsePost(raw: string, path: string): Post {
    const post = parseWith(postFrontmatterSchema, raw, path)
    checkFilename(path, `${post.urlname}.${post.lang}.md`)
    return post
  }

  function parsePage(raw: string, path: string): Page {
    const page = parseWith(pageFrontmatterSchema, raw, path)
    checkFilename(path, `${page.slug}.${page.lang}.md`)
    return page
  }

  function parsePublications(raw: string, path: string): Publication[] {
    const result = publicationsFileSchema.safeParse(YAML.parse(raw))
    if (!result.success) {
      throw new Error(`Invalid ${path}:\n${z.prettifyError(result.error)}`)
    }
    return result.data
  }

  function parseProjects(raw: string, path: string): Project[] {
    const result = projectsFileSchema.safeParse(YAML.parse(raw))
    if (!result.success) {
      throw new Error(`Invalid ${path}:\n${z.prettifyError(result.error)}`)
    }
    return result.data
  }

  async function loadAllPosts(): Promise<Post[]> {
    const paths = (await store.list('posts')).filter((path) => path.endsWith('.md'))
    const posts = await Promise.all(paths.map((path) => load(path, parsePost)))
    return posts.filter((post): post is Post => post !== null)
  }

  return {
    async listPosts(opts) {
      const posts = (await loadAllPosts())
        .filter((post) => (opts?.includeDrafts ? true : !post.draft))
        .filter((post) => (opts?.lang === undefined ? true : post.lang === opts.lang))
        .sort(
          (a, b) => Number(b.top) - Number(a.top) || b.date.getTime() - a.date.getTime(),
        )
      return posts.map(({ body: _body, ...summary }) => summary)
    },

    async getPost(urlname, lang) {
      return load(`posts/${urlname}.${lang}.md`, parsePost)
    },

    async getTranslations(urlname) {
      const posts = await loadAllPosts()
      return posts
        .filter((post) => post.urlname === urlname && !post.draft)
        .map((post) => ({ lang: post.lang }))
        .sort((a, b) => a.lang.localeCompare(b.lang))
    },

    async listTags() {
      const counts = new Map<string, number>()
      for (const post of await loadAllPosts()) {
        if (post.draft) continue
        for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
      return [...counts]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    },

    async listPages(lang) {
      const paths = (await store.list('pages')).filter((path) => path.endsWith('.md'))
      const pages = await Promise.all(paths.map((path) => load(path, parsePage)))
      return pages
        .filter((page): page is Page => page !== null)
        .filter((page) => (lang === undefined ? true : page.lang === lang))
        .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
        .map(({ body: _body, ...summary }) => summary)
    },

    async listPublications() {
      // An absent file is a template without a publications export, not an
      // error; the module toggle decides whether anything renders at all.
      const publications = await load('publications.yaml', parsePublications)
      return (publications ?? [])
        .slice()
        .sort((a, b) => b.year - a.year || a.key.localeCompare(b.key))
    },

    async listProjects() {
      // Authored order is curated by the maintainer — no sorting.
      return (await load('projects.yaml', parseProjects)) ?? []
    },

    async getCV() {
      return load('cv.yaml', (raw, path) => {
        const result = resumeSchema.safeParse(YAML.parse(raw))
        if (!result.success) {
          throw new Error(`Invalid ${path}:\n${z.prettifyError(result.error)}`)
        }
        return result.data
      })
    },

    async revalidate(keys) {
      if (keys === undefined) {
        fileCache.clear()
      } else {
        const entries = manifestCache?.entries ?? {}
        for (const key of keys) {
          const entry = entries[key]
          if (entry !== undefined) fileCache.delete(entry.path)
          // Callers may also pass raw paths; drop those too.
          fileCache.delete(key)
        }
      }
      manifestCache = undefined
      hashByPath = undefined
    },

    async version() {
      const manifest = await getManifest()
      if (manifest === null) return 'no-manifest'
      return createHash('sha256').update(JSON.stringify(manifest)).digest('hex')
    },
  }
}

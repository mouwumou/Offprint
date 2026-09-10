import { createHash } from 'node:crypto'
import matter from 'gray-matter'
import YAML from 'yaml'
import { z } from 'zod'
import { parseProfile, type Profile } from '../schema/profile'
import {
  newsFileSchema,
  pageFrontmatterSchema,
  postFrontmatterSchema,
  projectsFileSchema,
  publicationsFileSchema,
  resumeSchema,
  type NewsItem,
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
export type { NewsItem, Profile, Project, Publication, Resume } from '../schema'

/**
 * The semantic content layer (docs/DYNAMIC-PUBLISHING.md §3.2): parsed + validated +
 * cached. Pages and components depend on this interface and nothing below it
 * (pages read content only through the provider). Static mode calls it once at build; server mode per request.
 */
export interface ContentProvider {
  listPosts(opts?: { includeDrafts?: boolean; lang?: string }): Promise<PostSummary[]>
  getPost(urlname: string, lang: string): Promise<Post | null>
  /** Every translation of one urlname, for interlinks and hreflang. */
  getTranslations(urlname: string): Promise<{ lang: string }[]>
  listTags(): Promise<{ tag: string; count: number }[]>
  listPages(lang?: string): Promise<PageSummary[]>
  getPage(slug: string, lang: string): Promise<Page | null>
  listPublications(): Promise<Publication[]>
  listProjects(): Promise<Project[]>
  /** Homepage news entries, newest first. Absent file = empty list. */
  listNews(): Promise<NewsItem[]>
  getCV(): Promise<Resume | null>
  /** content/profile.yaml — who the author is; required (at least `name`). */
  getProfile(): Promise<Profile>
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

// Route params flow straight into store paths; reject anything that isn't a
// clean slug so a decoded `..%2F` can never escape content/ in server mode.
// Front matter is already slug-constrained, so this rejects nothing valid.
const SAFE_SEGMENT = /^[a-z0-9-]+$/i
function safeParam(value: string): boolean {
  return SAFE_SEGMENT.test(value)
}

/** posts/<urlname>.<lang>.md — the filename is part of the contract (docs/CONTENT-CONTRACT.md §1). */
function checkFilename(path: string, expected: string): void {
  const basename = path.slice(path.lastIndexOf('/') + 1)
  if (basename !== expected) {
    throw new Error(`Front-matter of ${path} implies filename ${expected}; rename one of them`)
  }
}

/** Within-year order of publications; years are always newest first. */
export type PublicationOrder = 'file' | 'key' | 'title'

export interface ProviderOptions {
  publicationOrder?: PublicationOrder | undefined
}

const titleText = (title: unknown): string =>
  typeof title === 'string'
    ? title
    : typeof title === 'object' && title !== null
      ? String(Object.values(title as Record<string, unknown>)[0] ?? '')
      : ''

export function createProvider(store: ContentStore, options: ProviderOptions = {}): ContentProvider {
  const publicationOrder = options.publicationOrder ?? 'file'
  // undefined = not loaded yet; null = store has no manifest.
  let manifestCache: Manifest | null | undefined
  let hashByPath: Map<string, string> | undefined
  const fileCache = new Map<string, CacheEntry>()
  let fallbackVersion: { at: number; value: string } | null = null

  /**
   * Hand-written content ships without a manifest; a constant version there
   * would freeze the server search index and feed ETags forever. Fingerprint
   * the content bytes instead, memoized briefly — a personal site's content
   * is a few dozen small files.
   */
  async function computeFallbackVersion(): Promise<string> {
    if (fallbackVersion !== null && Date.now() - fallbackVersion.at < 2_000) {
      return fallbackVersion.value
    }
    const hash = createHash('sha256')
    for (const prefix of ['posts', 'pages']) {
      for (const path of (await store.list(prefix)).sort()) {
        hash.update(path)
        hash.update((await store.read(path)) ?? '')
      }
    }
    for (const file of ['publications.yaml', 'projects.yaml', 'cv.yaml', 'news.yaml']) {
      hash.update(file)
      hash.update((await store.read(file)) ?? '')
    }
    fallbackVersion = { at: Date.now(), value: `files-${hash.digest('hex').slice(0, 32)}` }
    return fallbackVersion.value
  }

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
      if (!safeParam(urlname) || !safeParam(lang)) return null
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

    async getPage(slug, lang) {
      if (!safeParam(slug) || !safeParam(lang)) return null
      return load(`pages/${slug}.${lang}.md`, parsePage)
    },

    async listPublications() {
      // An absent file is a template without a publications export, not an
      // error; the module toggle decides whether anything renders at all.
      const publications = await load('publications.yaml', parsePublications)
      // Array#sort is stable: sorting by year alone keeps the file order
      // inside each year, which is the author's curation (first-author work
      // first, say) — the default. key/title are the alphabetical options.
      const within = (a: Publication, b: Publication): number =>
        publicationOrder === 'key'
          ? a.key.localeCompare(b.key)
          : publicationOrder === 'title'
            ? titleText(a.title).localeCompare(titleText(b.title))
            : 0
      return (publications ?? []).slice().sort((a, b) => b.year - a.year || within(a, b))
    },

    async listProjects() {
      // Authored order is curated by the maintainer — no sorting.
      return (await load('projects.yaml', parseProjects)) ?? []
    },

    async listNews() {
      const news = await load('news.yaml', (raw, path) => {
        const result = newsFileSchema.safeParse(YAML.parse(raw))
        if (!result.success) {
          throw new Error(`Invalid ${path}:\n${z.prettifyError(result.error)}`)
        }
        return result.data
      })
      return (news ?? []).slice().sort((a, b) => b.date.getTime() - a.date.getTime())
    },

    async getProfile() {
      const profile = await load('profile.yaml', (raw, path) => parseProfile(YAML.parse(raw), path))
      if (profile === null) {
        throw new Error(
          'content/profile.yaml is missing — it holds who you are (at least `name`; see docs/CONTENT-CONTRACT.md §6)',
        )
      }
      return profile
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
      fallbackVersion = null
    },

    async version() {
      const manifest = await getManifest()
      if (manifest === null) return computeFallbackVersion()
      return createHash('sha256').update(JSON.stringify(manifest)).digest('hex')
    },
  }
}

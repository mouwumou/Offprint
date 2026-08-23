import { z } from 'zod'
import { manifestSchema, type ContentStore, type Manifest } from './types'

interface CacheEntry {
  etag: string
  body: string
}

export interface GitStoreOptions {
  /** owner/repo */
  repo: string
  branch?: string | undefined
  /** Subdirectory holding the content layout; '' = repo root. */
  dir?: string | undefined
  token?: string | undefined
}

/**
 * ContentStore over the GitHub Contents API (ADR-004, P2-6) — the serverless
 * path: the sync Action pushes content to a repo, the site reads it at
 * request time. Responses are ETag-cached in memory, so unchanged files cost
 * a 304 instead of a body (and barely touch the rate limit). No push
 * channel: `watch` is absent; invalidation arrives via POST /api/revalidate
 * (the sync notify step). On Vercel that cache-drop is the ISR revalidate
 * path — the next request re-fetches from GitHub.
 */
export class GitStore implements ContentStore {
  private readonly cache = new Map<string, CacheEntry>()
  private readonly base: string
  private readonly branch: string
  private readonly dir: string
  private readonly token: string | undefined

  constructor(options: GitStoreOptions) {
    this.base = `https://api.github.com/repos/${options.repo}/contents`
    this.branch = options.branch ?? 'main'
    this.dir = options.dir ? `${options.dir.replace(/\/+$/, '')}/` : ''
    this.token = options.token
  }

  private headers(extra: Record<string, string>): Record<string, string> {
    return {
      'X-GitHub-Api-Version': '2022-11-28',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...extra,
    }
  }

  async read(path: string): Promise<string | null> {
    const url = `${this.base}/${this.dir}${path}?ref=${this.branch}`
    const cached = this.cache.get(url)
    const response = await fetch(url, {
      headers: this.headers({
        Accept: 'application/vnd.github.raw+json',
        ...(cached ? { 'If-None-Match': cached.etag } : {}),
      }),
    })
    if (response.status === 304 && cached) return cached.body
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`GitStore read ${path}: HTTP ${response.status}`)
    }
    const body = await response.text()
    const etag = response.headers.get('etag')
    if (etag) this.cache.set(url, { etag, body })
    return body
  }

  async list(prefix: string): Promise<string[]> {
    const url = `${this.base}/${this.dir}${prefix}?ref=${this.branch}`
    const response = await fetch(url, {
      headers: this.headers({ Accept: 'application/vnd.github+json' }),
    })
    if (response.status === 404) return []
    if (!response.ok) {
      throw new Error(`GitStore list ${prefix}: HTTP ${response.status}`)
    }
    const entries = (await response.json()) as { type: string; name: string }[]
    return entries
      .filter((entry) => entry.type === 'file')
      .map((entry) => `${prefix}/${entry.name}`)
      .sort()
  }

  async manifest(): Promise<Manifest | null> {
    const raw = await this.read('manifest.json')
    if (raw === null) return null
    const result = manifestSchema.safeParse(JSON.parse(raw))
    if (!result.success) {
      throw new Error(`Invalid manifest.json:\n${z.prettifyError(result.error)}`)
    }
    return result.data
  }
}

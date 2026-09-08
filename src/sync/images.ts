import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// IMAGE_PLATFORM=local (the default): Notion-hosted images are signed S3
// URLs that expire within hours, so publishing them verbatim rots every
// image. This pass runs after normalization: download each Notion asset into
// the live content/assets (named by a hash of the stable URL path, so
// re-syncs reuse the file instead of re-downloading through the rotating
// signature), then rewrite the staged markdown to point at it. Failures keep
// the original URL and never block the sync.

const NOTION_HOSTS = [
  /(^|\.)secure\.notion-static\.com$/i,
  /(^|\.)notion\.so$/i,
  /^prod-files-secure\..+\.amazonaws\.com$/i,
  /^s3\..+\.amazonaws\.com$/i,
]

const EXT_BY_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
}

export function isNotionAssetUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    // www.notion.so also hosts PAGE links (/<uuid>, /<slug>-<uuid>): on that
    // host only /image/ and /signed/ are files; file.notion.so is files only.
    if (/^(www\.)?notion\.so$/i.test(url.hostname)) return /^\/(image|signed)\//.test(url.pathname)
    return NOTION_HOSTS.some((host) => host.test(url.hostname))
  } catch {
    return false
  }
}

/** Stable stem: the signature query rotates per export, the path does not. */
export function assetStem(value: string): string {
  const url = new URL(value)
  const hash = createHash('sha256').update(`${url.hostname}${url.pathname}`).digest('hex')
  return `notion-${hash.slice(0, 16)}`
}

// Markdown image/link destinations plus front-matter cover values. Excludes
// the markdown link/image delimiters so a `](url)` or `]` boundary can't glue
// two URLs into one match; trailing sentence punctuation is trimmed below.
const URL_PATTERN = /https:\/\/[^\s"')\](<>\\]+/g
const TRAILING_PUNCT = /[.,;:!?]+$/

/** Download safety: cap the read, the wait, and re-check redirect hops. */
const FETCH_TIMEOUT_MS = 30_000
const COVER_CHECK_TIMEOUT_MS = 10_000

// Front-matter `cover:` on its own line, single-line scalar (quoted or not).
const COVER_LINE = /^cover:[ \t]*(['"]?)(https?:\/\/[^'"\n]+)\1[ \t]*$/m

/**
 * External covers (NotionNext's `source.unsplash.com/random`, dead CDNs) can
 * only be checked at sync time; a broken image beats no image nowhere, so an
 * unreachable or non-image cover is dropped with a warning and the post
 * falls back to its generated OG image.
 */
export async function dropDeadCover(head: string, fetchImpl: typeof fetch): Promise<string> {
  const match = COVER_LINE.exec(head)
  if (!match) return head
  const url = match[2] ?? ''
  // Notion-hosted covers go through the download path above; a failed
  // download deliberately keeps the URL, so never second-guess it here.
  if (isNotionAssetUrl(url)) return head
  let reason: string | null = null
  try {
    let response = await fetchImpl(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(COVER_CHECK_TIMEOUT_MS),
    })
    if (response.status === 405 || response.status === 501) {
      response = await fetchImpl(url, { signal: AbortSignal.timeout(COVER_CHECK_TIMEOUT_MS) })
    }
    const type = (response.headers.get('content-type') ?? '').split(';')[0] ?? ''
    if (!response.ok) reason = `HTTP ${response.status}`
    else if (!type.startsWith('image/')) reason = `not an image (${type || 'no content-type'})`
  } catch (error) {
    reason = String(error)
  }
  if (reason === null) return head
  console.warn(`⚠ cover unreachable, dropped: ${url}\n  ${reason}`)
  return head.replace(COVER_LINE, '').replace(/\n{3,}/g, '\n\n')
}
const MAX_IMAGE_BYTES = 25 * 1024 * 1024

export interface ImageSummary {
  downloaded: number
  reused: number
  failed: number
}

export async function materializeImages(options: {
  stagingDir: string
  contentDir: string
  collections: readonly string[]
  fetchImpl?: typeof fetch
}): Promise<ImageSummary> {
  const summary: ImageSummary = { downloaded: 0, reused: 0, failed: 0 }
  if ((process.env['IMAGE_PLATFORM'] ?? 'local') !== 'local') return summary

  const fetchImpl = options.fetchImpl ?? fetch
  const assetsDir = join(options.contentDir, 'assets')
  await mkdir(assetsDir, { recursive: true })
  const byStem = new Map<string, string>()
  for (const name of await readdir(assetsDir)) {
    byStem.set(name.replace(/\.[^.]+$/, ''), name)
  }

  // One URL may appear in several documents — resolve each once.
  const resolved = new Map<string, string | null>()
  const resolve = async (url: string): Promise<string | null> => {
    const cached = resolved.get(url)
    if (cached !== undefined) return cached
    const stem = assetStem(url)
    let filename = byStem.get(stem) ?? null
    if (filename !== null) {
      summary.reused += 1
    } else {
      try {
        // Follow redirects manually, re-checking each hop against the Notion
        // allowlist: an allowed host could 302 to an internal address
        // (169.254.169.254, a private IP) and blind follow would be SSRF.
        let current = url
        let response: Response
        for (let hop = 0; ; hop++) {
          if (hop > 5) throw new Error('too many redirects')
          response = await fetchImpl(current, {
            redirect: 'manual',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          })
          if (response.status < 300 || response.status >= 400) break
          const location = response.headers.get('location')
          if (!location) break
          current = new URL(location, current).toString()
          if (!isNotionAssetUrl(current)) throw new Error(`redirect to disallowed host: ${current}`)
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const declared = Number(response.headers.get('content-length') ?? 0)
        if (declared > MAX_IMAGE_BYTES) throw new Error(`too large: ${declared} bytes`)
        const type = (response.headers.get('content-type') ?? '').split(';')[0] ?? ''
        const fromPath = /\.([a-z0-9]{2,4})$/i.exec(new URL(url).pathname)?.[1]?.toLowerCase()
        const ext = EXT_BY_TYPE[type] ?? fromPath ?? 'bin'
        filename = `${stem}.${ext}`
        const bytes = Buffer.from(await response.arrayBuffer())
        if (bytes.byteLength > MAX_IMAGE_BYTES)
          throw new Error(`too large: ${bytes.byteLength} bytes`)
        await writeFile(join(assetsDir, filename), bytes)
        byStem.set(stem, filename)
        summary.downloaded += 1
      } catch (error) {
        console.warn(`⚠ image download failed, keeping the Notion URL: ${url}\n  ${String(error)}`)
        summary.failed += 1
        filename = null
      }
    }
    resolved.set(url, filename)
    return filename
  }

  for (const collection of options.collections) {
    const dir = join(options.stagingDir, collection)
    let names: string[]
    try {
      names = (await readdir(dir)).filter((name) => name.endsWith('.md'))
    } catch {
      continue
    }
    for (const name of names) {
      const path = join(dir, name)
      const raw = await readFile(path, 'utf8')
      const urls = [
        ...new Set((raw.match(URL_PATTERN) ?? []).map((u) => u.replace(TRAILING_PUNCT, ''))),
      ].filter(isNotionAssetUrl)
      const mapping = new Map<string, string>()
      // Replace longest first so a URL that is a prefix of another never
      // corrupts the longer one's tail.
      for (const url of urls.sort((a, b) => b.length - a.length)) {
        const filename = await resolve(url)
        if (filename !== null) mapping.set(url, filename)
      }
      // Front matter keeps the contract's `assets/…` form; the body gets the
      // absolute path so deep routes (/blog/x/) resolve it.
      const bodyStart = raw.indexOf('\n---', 3)
      let head = bodyStart === -1 ? '' : raw.slice(0, bodyStart)
      let body = bodyStart === -1 ? raw : raw.slice(bodyStart)
      for (const [url, filename] of mapping) {
        head = head.replaceAll(url, `assets/${filename}`)
        body = body.replaceAll(url, `/assets/${filename}`)
      }
      head = await dropDeadCover(head, fetchImpl)
      if (head + body === raw) continue
      await writeFile(path, head + body)
    }
  }
  return summary
}

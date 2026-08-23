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

/** Markdown image/link destinations plus front-matter cover values. */
const URL_PATTERN = /https:\/\/[^\s"')<>\\]+/g

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
        const response = await fetchImpl(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const type = (response.headers.get('content-type') ?? '').split(';')[0] ?? ''
        const fromPath = /\.([a-z0-9]{2,4})$/i.exec(new URL(url).pathname)?.[1]?.toLowerCase()
        const ext = EXT_BY_TYPE[type] ?? fromPath ?? 'bin'
        filename = `${stem}.${ext}`
        await writeFile(join(assetsDir, filename), Buffer.from(await response.arrayBuffer()))
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
      const urls = [...new Set(raw.match(URL_PATTERN) ?? [])].filter(isNotionAssetUrl)
      if (urls.length === 0) continue
      const mapping = new Map<string, string>()
      for (const url of urls) {
        const filename = await resolve(url)
        if (filename !== null) mapping.set(url, filename)
      }
      if (mapping.size === 0) continue
      // Front matter keeps the contract's `assets/…` form; the body gets the
      // absolute path so deep routes (/blog/x/) resolve it.
      const bodyStart = raw.indexOf('\n---', 3)
      let head = bodyStart === -1 ? '' : raw.slice(0, bodyStart)
      let body = bodyStart === -1 ? raw : raw.slice(bodyStart)
      for (const [url, filename] of mapping) {
        head = head.replaceAll(url, `assets/${filename}`)
        body = body.replaceAll(url, `/assets/${filename}`)
      }
      await writeFile(path, head + body)
    }
  }
  return summary
}

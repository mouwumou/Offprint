import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assetStem, isNotionAssetUrl, materializeImages } from './images'

const NOTION_URL =
  'https://prod-files-secure.s3.us-west-2.amazonaws.com/abc/def/cover.png?X-Amz-Signature=sig1'

describe('isNotionAssetUrl', () => {
  it('matches Notion asset hosts and nothing else', () => {
    expect(isNotionAssetUrl(NOTION_URL)).toBe(true)
    expect(isNotionAssetUrl('https://img.secure.notion-static.com/x.png')).toBe(true)
    expect(isNotionAssetUrl('https://file.notion.so/f/x.png')).toBe(true)
    expect(isNotionAssetUrl('https://example.com/photo.png')).toBe(false)
    expect(isNotionAssetUrl('not a url')).toBe(false)
  })

  it('derives a stem from the stable path, ignoring the rotating signature', () => {
    expect(assetStem(NOTION_URL)).toBe(assetStem(NOTION_URL.replace('sig1', 'sig2')))
  })
})

describe('materializeImages', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'offprint-img-'))
    await mkdir(join(root, 'staging', 'posts'), { recursive: true })
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  const doc = `---
title: T
cover: '${NOTION_URL}'
---

Text ![alt](${NOTION_URL}) and a normal ![x](https://example.com/keep.png).
`

  const okFetch = () =>
    vi.fn(
      async () =>
        new Response(new Uint8Array([137, 80]), {
          status: 200,
          headers: { 'content-type': 'image/png' },
        }),
    ) as unknown as typeof fetch

  it('downloads Notion images once and rewrites cover + body forms', async () => {
    const fetchImpl = okFetch()
    await writeFile(join(root, 'staging', 'posts', 'a.en.md'), doc)
    const summary = await materializeImages({
      stagingDir: join(root, 'staging'),
      contentDir: join(root, 'content'),
      collections: ['posts'],
      fetchImpl,
    })
    expect(summary).toEqual({ downloaded: 1, reused: 0, failed: 0 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    const stem = assetStem(NOTION_URL)
    expect(await readdir(join(root, 'content', 'assets'))).toEqual([`${stem}.png`])
    const rewritten = await readFile(join(root, 'staging', 'posts', 'a.en.md'), 'utf8')
    expect(rewritten).toContain(`cover: 'assets/${stem}.png'`)
    expect(rewritten).toContain(`![alt](/assets/${stem}.png)`)
    expect(rewritten).toContain('https://example.com/keep.png')
    expect(rewritten).not.toContain('amazonaws.com')
  })

  it('reuses an already-materialized file across re-syncs', async () => {
    const stem = assetStem(NOTION_URL)
    await mkdir(join(root, 'content', 'assets'), { recursive: true })
    await writeFile(join(root, 'content', 'assets', `${stem}.png`), 'existing')
    const fetchImpl = okFetch()
    // The signature rotated since the file was first downloaded.
    await writeFile(join(root, 'staging', 'posts', 'a.en.md'), doc.replaceAll('sig1', 'sig2'))
    const summary = await materializeImages({
      stagingDir: join(root, 'staging'),
      contentDir: join(root, 'content'),
      collections: ['posts'],
      fetchImpl,
    })
    expect(summary).toEqual({ downloaded: 0, reused: 1, failed: 0 })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('keeps the original URL when the download fails', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(null, { status: 403 }),
    ) as unknown as typeof fetch
    await writeFile(join(root, 'staging', 'posts', 'a.en.md'), doc)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const summary = await materializeImages({
      stagingDir: join(root, 'staging'),
      contentDir: join(root, 'content'),
      collections: ['posts'],
      fetchImpl,
    })
    expect(summary.failed).toBe(1)
    expect(warn).toHaveBeenCalled()
    expect(await readFile(join(root, 'staging', 'posts', 'a.en.md'), 'utf8')).toBe(doc)
  })

  it('does nothing when IMAGE_PLATFORM is not local', async () => {
    process.env['IMAGE_PLATFORM'] = 'none'
    try {
      const fetchImpl = okFetch()
      await writeFile(join(root, 'staging', 'posts', 'a.en.md'), doc)
      const summary = await materializeImages({
        stagingDir: join(root, 'staging'),
        contentDir: join(root, 'content'),
        collections: ['posts'],
        fetchImpl,
      })
      expect(summary).toEqual({ downloaded: 0, reused: 0, failed: 0 })
      expect(fetchImpl).not.toHaveBeenCalled()
    } finally {
      delete process.env['IMAGE_PLATFORM']
    }
  })
})

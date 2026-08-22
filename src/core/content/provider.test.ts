import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FsStore } from '../store'
import { createProvider, type ContentProvider } from './provider'

let root: string
let provider: ContentProvider

function post(fields: Record<string, unknown>, body: string): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
  return `---\n${lines.join('\n')}\n---\n\n${body}\n`
}

async function writePost(name: string, fields: Record<string, unknown>, body = 'Body.'): Promise<void> {
  await writeFile(join(root, 'posts', name), post(fields, body))
}

const base = { date: '2025-01-01', updated: '2025-01-02' }

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'offprint-provider-'))
  await mkdir(join(root, 'posts'), { recursive: true })
  await mkdir(join(root, 'pages'), { recursive: true })
  await writePost('alpha.en.md', {
    ...base,
    title: 'Alpha',
    urlname: 'alpha',
    lang: 'en',
    tags: ['bayes', 'geometry'],
  })
  await writePost('alpha.zh.md', { ...base, title: '阿尔法', urlname: 'alpha', lang: 'zh' })
  await writePost('beta.en.md', {
    title: 'Beta',
    urlname: 'beta',
    lang: 'en',
    date: '2025-06-01',
    updated: '2025-06-01',
    tags: ['bayes'],
  })
  await writePost('pinned.en.md', {
    title: 'Pinned',
    urlname: 'pinned',
    lang: 'en',
    date: '2024-01-01',
    updated: '2024-01-01',
    top: true,
  })
  await writePost('secret.en.md', {
    ...base,
    title: 'Secret',
    urlname: 'secret',
    lang: 'en',
    draft: true,
    tags: ['bayes'],
  })
  await writeFile(
    join(root, 'pages', 'about.en.md'),
    post({ title: 'About', slug: 'about', lang: 'en', nav: true, order: 2 }, 'About body.'),
  )
  await writeFile(
    join(root, 'pages', 'now.en.md'),
    post({ title: 'Now', slug: 'now', lang: 'en', nav: true, order: 1 }, 'Now body.'),
  )
  provider = createProvider(new FsStore(root))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('createProvider · posts', () => {
  it('lists published posts, pinned first then newest', async () => {
    const posts = await provider.listPosts()
    expect(posts.map((p) => p.urlname)).toEqual(['pinned', 'beta', 'alpha', 'alpha'])
    expect(posts.every((p) => !p.draft)).toBe(true)
    expect(posts[0]).not.toHaveProperty('body')
  })

  it('filters by language and can include drafts', async () => {
    const en = await provider.listPosts({ lang: 'en' })
    expect(en.map((p) => p.urlname)).toEqual(['pinned', 'beta', 'alpha'])
    const withDrafts = await provider.listPosts({ includeDrafts: true, lang: 'en' })
    expect(withDrafts.map((p) => p.urlname)).toContain('secret')
  })

  it('gets a single post with its body, and null for a missing one', async () => {
    const alpha = await provider.getPost('alpha', 'en')
    expect(alpha?.title).toBe('Alpha')
    expect(alpha?.body).toContain('Body.')
    expect(await provider.getPost('alpha', 'fr')).toBeNull()
    expect(await provider.getPost('nope', 'en')).toBeNull()
  })

  it('lists translations of one urlname, excluding drafts', async () => {
    expect(await provider.getTranslations('alpha')).toEqual([{ lang: 'en' }, { lang: 'zh' }])
    expect(await provider.getTranslations('secret')).toEqual([])
  })

  it('counts tags across published posts only', async () => {
    expect(await provider.listTags()).toEqual([
      { tag: 'bayes', count: 2 },
      { tag: 'geometry', count: 1 },
    ])
  })

  it('throws a readable error for invalid front-matter', async () => {
    await writePost('bad.en.md', { title: 'Bad', urlname: 'bad', lang: 'en', date: '2025-01-01' })
    await expect(provider.listPosts()).rejects.toThrow(/bad\.en\.md/)
  })

  it('throws when the filename contradicts the front-matter', async () => {
    await writePost('mismatch.en.md', { ...base, title: 'M', urlname: 'other', lang: 'en' })
    await expect(provider.getPost('mismatch', 'en')).rejects.toThrow(/other\.en\.md/)
  })
})

describe('createProvider · pages', () => {
  it('lists pages sorted by order', async () => {
    const pages = await provider.listPages('en')
    expect(pages.map((p) => p.slug)).toEqual(['now', 'about'])
  })
})

describe('createProvider · stubs', () => {
  it('publications and CV loaders announce their phase', async () => {
    await expect(provider.listPublications()).rejects.toThrow(/P1-4/)
    await expect(provider.getCV()).rejects.toThrow(/P1-6/)
  })
})

describe('createProvider · cache & revalidate', () => {
  function sha256(text: string): string {
    return createHash('sha256').update(text).digest('hex')
  }

  async function writeManifest(): Promise<void> {
    const content = post({ ...base, title: 'Alpha', urlname: 'alpha', lang: 'en' }, 'Original.')
    await writeFile(join(root, 'posts', 'alpha.en.md'), content)
    const manifest = {
      generatedAt: '2026-08-22T10:00:00Z',
      tool: { name: 'elog', version: '1.0.0' },
      entries: {
        'posts/alpha.en': {
          path: 'posts/alpha.en.md',
          hash: sha256(content),
          updated: '2025-01-02',
        },
      },
    }
    await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest))
  }

  it('serves cached content until revalidated when a manifest pins the hash', async () => {
    await writeManifest()
    expect((await provider.getPost('alpha', 'en'))?.body).toContain('Original.')

    // Edit the file but leave the manifest untouched: the provider must keep
    // serving the version the manifest describes.
    await writePost('alpha.en.md', { ...base, title: 'Alpha', urlname: 'alpha', lang: 'en' }, 'Edited.')
    expect((await provider.getPost('alpha', 'en'))?.body).toContain('Original.')

    await provider.revalidate(['posts/alpha.en'])
    expect((await provider.getPost('alpha', 'en'))?.body).toContain('Edited.')
  })

  it('never caches when there is no manifest (hand-written content)', async () => {
    expect((await provider.getPost('alpha', 'en'))?.body).toContain('Body.')
    await writePost('alpha.en.md', { ...base, title: 'Alpha', urlname: 'alpha', lang: 'en' }, 'Fresh.')
    expect((await provider.getPost('alpha', 'en'))?.body).toContain('Fresh.')
  })

  it('exposes a version derived from the manifest', async () => {
    expect(await provider.version()).toBe('no-manifest')
    await writeManifest()
    await provider.revalidate()
    const version = await provider.version()
    expect(version).toMatch(/^[0-9a-f]{64}$/)
  })
})

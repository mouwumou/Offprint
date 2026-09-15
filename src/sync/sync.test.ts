import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { atomicSwitch } from './atomic'
import { detectLang } from './lang-detect'
import { buildManifest, sameContent } from './manifest'
import { normalizeDoc } from './normalize'
import { stageDocuments } from './stage'
import { validateContent } from './validate'

// A raw elog export in the exact shape observed (NotionNext database).
const notionNextDoc = `---
password: ''
icon: ''
date: '2021-11-05 08:00:00'
type: Post
category: 技术分享
slug: example-1
tags:
  - 建站
summary: 这是示例的文章摘要。
title: 示例文章
status: Published
cover: 'https://images.unsplash.com/photo.jpg'
urlname: e004a20c-1243-49bb-8423-d03c59c902fe
updated: '2024-09-23 05:49:00'
---

这是一篇中文示例正文，用来验证语言探测与归一化流程。段落里应当有足够多的汉字。
`

describe('normalizeDoc (docs/CONTENT-CONTRACT.md §7.1)', () => {
  it('normalizes a real NotionNext export into contract shape', () => {
    const result = normalizeDoc(notionNextDoc, 'example-1.md', 'en')
    expect(result.kind).toBe('post')
    if (result.kind !== 'post') return
    expect(result.filename).toBe('posts/example-1.zh.md')
    expect(result.content).toContain('urlname: example-1')
    expect(result.content).toContain("date: '2021-11-05'")
    expect(result.content).toContain("updated: '2024-09-23'")
    expect(result.content).toContain('lang: zh')
    expect(result.content).toContain('categories: 技术分享')
    expect(result.content).toContain('description: 这是示例的文章摘要。')
    expect(result.content).not.toContain('password')
    expect(result.content).not.toContain('status')
    expect(result.warnings.some((w) => w.includes('lang detected'))).toBe(true)
  })

  it('skips NotionNext structural rows (Menu/Config/Notice)', () => {
    const menu = `---\ntitle: '#'\ntype: Menu\nslug: '#'\ndate: '2024-01-01 00:00:00'\n---\n`
    expect(normalizeDoc(menu, 'menu.md', 'en')).toEqual({ kind: 'skipped', reason: 'type=Menu' })
  })

  it('derives urlname from an english title when the slug is unusable', () => {
    const doc = `---\ntitle: A Fine Post\ntype: Post\ndate: '2024-01-01 00:00:00'\nupdated: '2024-01-01 00:00:00'\n---\n\nEnglish body with plenty of latin characters to detect the language.\n`
    const result = normalizeDoc(doc, 'x.md', 'en')
    expect(result.kind).toBe('post')
    if (result.kind !== 'post') return
    expect(result.filename).toBe('posts/a-fine-post.en.md')
    expect(result.warnings.some((w) => w.includes('urlname derived'))).toBe(true)
  })

  it('records invalid documents instead of throwing', () => {
    const doc = `---\ntitle: Missing date\ntype: Post\nslug: missing-date\n---\n\nBody.\n`
    const result = normalizeDoc(doc, 'bad.md', 'en')
    expect(result.kind).toBe('invalid')
  })

  it('routes type=Page into pages/ with the page schema', () => {
    const doc = `---\ntitle: About\ntype: Page\nslug: about\ndate: '2024-01-01 00:00:00'\nupdated: '2024-05-01 00:00:00'\n---\n\nAbout body in english, long enough for detection to settle down.\n`
    const result = normalizeDoc(doc, 'about.md', 'en')
    expect(result.kind).toBe('page')
    if (result.kind !== 'page') return
    expect(result.filename).toBe('pages/about.en.md')
    expect(result.content).toContain('slug: about')
  })
})

describe('detectLang', () => {
  it('detects chinese, english, and falls back on short text', () => {
    expect(detectLang('这是一段足够长的中文文本，用来判断语言归属问题。', 'en').lang).toBe('zh')
    expect(detectLang('A clearly english sentence with enough letters.', 'zh').lang).toBe('en')
    expect(detectLang('短', 'en')).toEqual({ lang: 'en', detected: false })
  })
})

describe('manifest + atomic switch', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'offprint-sync-'))
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('builds a manifest and switches staging into place, manifest last', async () => {
    const content = join(root, 'content')
    const staging = join(root, 'staging')
    await mkdir(join(content, 'posts'), { recursive: true })
    await writeFile(join(content, 'posts', 'stale.en.md'), 'old')
    await mkdir(join(staging, 'posts'), { recursive: true })
    await writeFile(
      join(staging, 'posts', 'fresh.en.md'),
      `---\ntitle: Fresh\nurlname: fresh\nlang: en\ndate: 2025-01-01\nupdated: 2025-01-02\n---\n\nBody.\n`,
    )

    const manifest = await buildManifest(staging, { name: 'elog', version: 'test' })
    expect(manifest.entries['posts/fresh.en']?.path).toBe('posts/fresh.en.md')
    expect(manifest.entries['posts/fresh.en']?.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(manifest.entries['posts/fresh.en']?.updated).toBe('2025-01-02')

    await atomicSwitch(content, staging, ['posts', 'pages'], manifest)
    const written = JSON.parse(await readFile(join(content, 'manifest.json'), 'utf8'))
    expect(written.entries['posts/fresh.en']).toBeTruthy()
    await expect(readFile(join(content, 'posts', 'stale.en.md'))).rejects.toThrow()
    expect(await readFile(join(content, 'posts', 'fresh.en.md'), 'utf8')).toContain('Fresh')
  })

  it('is idempotent: unchanged content keeps its dates and compares equal', async () => {
    const content = join(root, 'content')
    await mkdir(join(content, 'posts'), { recursive: true })
    await writeFile(
      join(content, 'posts', 'a.en.md'),
      `---\ntitle: A\nurlname: a\nlang: en\ndate: 2025-01-01\nupdated: 2025-01-02\n---\n\nBody.\n`,
    )
    await writeFile(join(content, 'publications.yaml'), '- key: p1\n  title: One\n  year: 2024\n')
    const tool = { name: 'elog', version: 'test' }
    const first = {
      ...(await buildManifest(content, tool)),
      generatedAt: '2020-01-01T00:00:00.000Z',
    }
    first.entries['publications']!.updated = '2020-01-01'

    // Same bytes: YAML keeps the earlier date, and the manifests count as the same content.
    const again = await buildManifest(content, tool, [], first)
    expect(again.entries['publications']?.updated).toBe('2020-01-01')
    expect(sameContent(first, again)).toBe(true)
    expect(sameContent(null, again)).toBe(false)

    // A real edit: the date moves and the content differs.
    await writeFile(join(content, 'publications.yaml'), '- key: p1\n  title: Two\n  year: 2024\n')
    const edited = await buildManifest(content, tool, [], first)
    expect(edited.entries['publications']?.updated).toBe(new Date().toISOString().slice(0, 10))
    expect(sameContent(first, edited)).toBe(false)

    // Errors are part of the content state too.
    const withError = await buildManifest(
      content,
      tool,
      [{ path: 'raw/x.md', issues: ['bad'] }],
      first,
    )
    expect(sameContent(first, withError)).toBe(false)
  })

  it('validateContent reports schema and filename problems', async () => {
    const content = join(root, 'content')
    await mkdir(join(content, 'posts'), { recursive: true })
    await writeFile(
      join(content, 'posts', 'good.en.md'),
      `---\ntitle: Good\nurlname: good\nlang: en\ndate: 2025-01-01\nupdated: 2025-01-02\n---\n\nBody.\n`,
    )
    await writeFile(join(content, 'posts', 'bad.en.md'), `---\ntitle: Bad\n---\n\nBody.\n`)
    await writeFile(
      join(content, 'posts', 'misnamed.en.md'),
      `---\ntitle: M\nurlname: other\nlang: en\ndate: 2025-01-01\nupdated: 2025-01-02\n---\n\nBody.\n`,
    )
    const problems = await validateContent(content)
    expect(problems.map((p) => p.path).sort()).toEqual(['posts/bad.en.md', 'posts/misnamed.en.md'])
  })
})

describe('sync owns posts only', () => {
  it('a posts-only switch leaves author-owned pages untouched', async () => {
    const root = await mkdtemp(join(tmpdir(), 'offprint-adr14-'))
    const content = join(root, 'content')
    const staging = join(root, 'staging')
    await mkdir(join(content, 'pages'), { recursive: true })
    await writeFile(join(content, 'pages', 'about.en.md'), 'AUTHOR OWNED')
    await mkdir(join(staging, 'posts'), { recursive: true })
    await writeFile(join(staging, 'posts', 'p.en.md'), 'from sync')

    const manifest = await buildManifest(staging, { name: 'elog', version: 't' })
    await atomicSwitch(content, staging, ['posts'], manifest)

    expect(await readFile(join(content, 'pages', 'about.en.md'), 'utf8')).toBe('AUTHOR OWNED')
    expect(await readFile(join(content, 'posts', 'p.en.md'), 'utf8')).toBe('from sync')
  })
})

describe('acquireSyncLock (cross-process mutex)', () => {
  it('serializes holders, rejects contenders, and steals stale locks', async () => {
    const { acquireSyncLock } = await import('./lock')
    const { utimes } = await import('node:fs/promises')
    const root = await mkdtemp(join(tmpdir(), 'offprint-lock-'))
    try {
      const release = await acquireSyncLock(root)
      await expect(acquireSyncLock(root)).rejects.toThrow(/another sync is running/)
      await release()

      const again = await acquireSyncLock(root)
      await again()

      // A crashed holder leaves the dir behind; an old mtime marks it stale.
      await acquireSyncLock(root)
      const old = new Date(Date.now() - 60 * 60_000)
      await utimes(join(root, '.sync-lock'), old, old)
      const stolen = await acquireSyncLock(root)
      await stolen()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('stageDocuments', () => {
  it('turns links between synced Notion pages into site routes', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const root = await mkdtemp(join(tmpdir(), 'offprint-links-'))
    const rawDir = join(root, 'raw')
    await mkdir(rawDir)
    const doc = (title: string, id: string, body: string): string =>
      `---\ntitle: ${title}\ntype: Post\nurlname: ${id}\ndate: '2024-01-01 00:00:00'\nupdated: '2024-01-01 00:00:00'\n---\n\n${body}\n`
    const a = '11111111-2222-3333-4444-555555555555'
    const b = '66666666-7777-8888-9999-000000000000'
    await writeFile(
      join(rawDir, 'a.md'),
      doc(
        'Alpha Post',
        a,
        `English body linking to [beta](https://www.notion.so/${b}) and [gone](https://www.notion.so/Old-abcdefabcdefabcdefabcdefabcdefab).`,
      ),
    )
    await writeFile(
      join(rawDir, 'b.md'),
      doc('Beta Post', b, 'English body with plenty of latin characters here.'),
    )
    try {
      await stageDocuments({ rawDir, staging: root, defaultLang: 'en', includePages: false })
      const alpha = await readFile(join(root, 'posts', 'alpha-post.en.md'), 'utf8')
      expect(alpha).toContain('[beta](/blog/beta-post)')
      expect(alpha).toContain('(https://www.notion.so/Old-abcdefabcdefabcdefabcdefabcdefab)')
      expect(warn.mock.calls.some(([m]) => String(m).includes('kept as Notion URLs'))).toBe(true)
    } finally {
      warn.mockRestore()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('reports a second document that resolves to the same file instead of overwriting the first', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const root = await mkdtemp(join(tmpdir(), 'offprint-stage-'))
    const rawDir = join(root, 'raw')
    await mkdir(rawDir)
    const doc = (title: string): string =>
      `---\ntitle: ${title}\ntype: Post\nslug: same-slug\ndate: '2024-01-01 00:00:00'\nupdated: '2024-01-01 00:00:00'\n---\n\nEnglish body with plenty of latin characters to detect the language.\n`
    await writeFile(join(rawDir, 'a.md'), doc('First'))
    await writeFile(join(rawDir, 'b.md'), doc('Second'))
    try {
      const summary = await stageDocuments({
        rawDir,
        staging: root,
        defaultLang: 'en',
        includePages: false,
      })
      expect(summary.posts).toBe(1)
      expect(summary.errors).toHaveLength(1)
      expect(summary.errors[0]?.path).toBe('raw/b.md')
      expect(summary.errors[0]?.issues[0]).toMatch(/duplicate posts\/same-slug\.en\.md/)
      expect(await readFile(join(root, 'posts', 'same-slug.en.md'), 'utf8')).toContain(
        'title: First',
      )
    } finally {
      warn.mockRestore()
      await rm(root, { recursive: true, force: true })
    }
  })
})

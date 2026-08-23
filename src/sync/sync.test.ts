import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { atomicSwitch } from './atomic'
import { detectLang } from './lang-detect'
import { buildManifest } from './manifest'
import { normalizeDoc } from './normalize'
import { validateContent } from './validate'

// A raw elog export in the exact shape observed in P0-9 (NotionNext database).
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

describe('normalizeDoc (CONTENT-CONTRACT §7.1)', () => {
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

describe('ADR-014: sync owns posts only', () => {
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

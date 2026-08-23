import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FsStore } from './fs'

let root: string
let store: FsStore

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'offprint-fs-'))
  store = new FsStore(root)
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('FsStore', () => {
  it('reads existing files and returns null for missing ones', async () => {
    await mkdir(join(root, 'posts'), { recursive: true })
    await writeFile(join(root, 'posts', 'a.en.md'), 'hello')
    expect(await store.read('posts/a.en.md')).toBe('hello')
    expect(await store.read('posts/missing.md')).toBeNull()
  })

  it('lists files under a prefix as root-relative posix paths, recursively', async () => {
    await mkdir(join(root, 'posts', 'nested'), { recursive: true })
    await writeFile(join(root, 'posts', 'b.en.md'), '')
    await writeFile(join(root, 'posts', 'a.en.md'), '')
    await writeFile(join(root, 'posts', 'nested', 'c.en.md'), '')
    expect(await store.list('posts')).toEqual([
      'posts/a.en.md',
      'posts/b.en.md',
      'posts/nested/c.en.md',
    ])
  })

  it('returns an empty list for a missing prefix', async () => {
    expect(await store.list('posts')).toEqual([])
  })

  it('returns null when there is no manifest, and parses a valid one', async () => {
    expect(await store.manifest()).toBeNull()
    const manifest = {
      generatedAt: '2026-08-22T10:00:00Z',
      tool: { name: 'elog', version: '1.0.0' },
      entries: {
        'posts/a.en': { path: 'posts/a.en.md', hash: 'sha256:x', updated: '2026-08-01' },
      },
    }
    await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest))
    const loaded = await store.manifest()
    expect(loaded?.entries['posts/a.en']?.hash).toBe('sha256:x')
  })

  it('rejects a malformed manifest instead of serving it silently', async () => {
    await writeFile(join(root, 'manifest.json'), JSON.stringify({ entries: {} }))
    await expect(store.manifest()).rejects.toThrow(/Invalid manifest/)
  })
})

describe('FsStore.watch (P2-4)', () => {
  it('emits a manifest diff when manifest.json changes', async () => {
    const manifest = (hash: string) => ({
      generatedAt: '2026-08-23T10:00:00Z',
      tool: { name: 'elog', version: 't' },
      entries: { 'posts/a.en': { path: 'posts/a.en.md', hash, updated: '2026-08-01' } },
    })
    await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest('one')))

    const diffs: unknown[] = []
    const stop = store.watch((diff) => diffs.push(diff))
    await new Promise((resolve) => setTimeout(resolve, 400))

    await writeFile(join(root, 'manifest.json'), JSON.stringify(manifest('two')))
    for (let i = 0; i < 60 && diffs.length === 0; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    stop()
    expect(diffs[0]).toEqual({ added: [], changed: ['posts/a.en'], removed: [] })
  })
})

describe('diffManifests', () => {
  it('classifies added, changed, and removed keys', async () => {
    const { diffManifests } = await import('./diff')
    const entry = (hash: string) => ({ path: 'x', hash, updated: '' })
    const before = {
      generatedAt: '',
      tool: { name: '', version: '' },
      entries: { keep: entry('1'), change: entry('1'), drop: entry('1') },
    }
    const after = {
      generatedAt: '',
      tool: { name: '', version: '' },
      entries: { keep: entry('1'), change: entry('2'), add: entry('1') },
    }
    expect(diffManifests(before, after)).toEqual({
      added: ['add'],
      changed: ['change'],
      removed: ['drop'],
    })
    expect(diffManifests(null, after).added.length).toBe(3)
  })
})

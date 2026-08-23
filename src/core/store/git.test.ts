import { afterEach, describe, expect, it, vi } from 'vitest'
import { GitStore } from './git'

function response(status: number, body: string, headers: Record<string, string> = {}): Response {
  return new Response(status === 304 ? null : body, { status, headers })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GitStore (mocked Contents API)', () => {
  it('reads files, caches by ETag, and serves 304s from cache', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(200, 'hello', { etag: '"e1"' }))
      .mockResolvedValueOnce(response(304, ''))
    vi.stubGlobal('fetch', fetchMock)

    const store = new GitStore({ repo: 'o/r', branch: 'main', dir: 'content', token: 'tok' })
    expect(await store.read('posts/a.en.md')).toBe('hello')
    expect(await store.read('posts/a.en.md')).toBe('hello')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.github.com/repos/o/r/contents/content/posts/a.en.md?ref=main')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok')
    const second = fetchMock.mock.calls[1] as [string, RequestInit]
    expect((second[1].headers as Record<string, string>)['If-None-Match']).toBe('"e1"')
  })

  it('returns null on 404 and throws on other failures', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(404, ''))
      .mockResolvedValueOnce(response(500, 'boom'))
    vi.stubGlobal('fetch', fetchMock)
    const store = new GitStore({ repo: 'o/r' })
    expect(await store.read('missing.md')).toBeNull()
    await expect(store.read('broken.md')).rejects.toThrow(/HTTP 500/)
  })

  it('lists files (not directories) as prefixed sorted paths', async () => {
    const listing = JSON.stringify([
      { type: 'file', name: 'b.en.md' },
      { type: 'dir', name: 'nested' },
      { type: 'file', name: 'a.en.md' },
    ])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, listing)))
    const store = new GitStore({ repo: 'o/r' })
    expect(await store.list('posts')).toEqual(['posts/a.en.md', 'posts/b.en.md'])
  })

  it('parses and validates the manifest', async () => {
    const manifest = JSON.stringify({
      generatedAt: '2026-08-23T10:00:00Z',
      tool: { name: 'elog', version: '1' },
      entries: {},
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, manifest, { etag: '"m"' })))
    const store = new GitStore({ repo: 'o/r' })
    expect((await store.manifest())?.tool.name).toBe('elog')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, '{"entries":{}}')))
    const bad = new GitStore({ repo: 'o/r' })
    await expect(bad.manifest()).rejects.toThrow(/Invalid manifest/)
  })
})

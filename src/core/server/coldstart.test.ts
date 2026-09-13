import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'offprint-coldstart-'))
  process.env['CONTENT_DIR'] = root
  // The store singleton and the per-process "ready" latch live in module state.
  vi.resetModules()
})

afterEach(async () => {
  delete process.env['CONTENT_DIR']
  await rm(root, { recursive: true, force: true })
})

async function response(pathname: string): Promise<Response | null> {
  const { coldStartResponse } = await import('./coldstart')
  return coldStartResponse(pathname)
}

describe('coldStartResponse', () => {
  it('serves the syncing page while the content volume is empty', async () => {
    expect((await response('/'))?.status).toBe(503)
  })

  it('treats a hand-written site without posts or manifest as ready', async () => {
    await writeFile(join(root, 'profile.yaml'), 'name: Q\n')
    expect(await response('/')).toBeNull()
  })

  it('treats posts on disk as ready', async () => {
    await mkdir(join(root, 'posts'))
    await writeFile(join(root, 'posts', 'a.en.md'), '---\ntitle: A\n---\n')
    expect(await response('/')).toBeNull()
  })

  it('never blocks the API', async () => {
    expect(await response('/api/health')).toBeNull()
  })
})

import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fsp from 'node:fs/promises'
import { atomicSwitch } from './atomic'

// Spy-mocked so one rename can be made to fail like overlayfs does.
vi.mock('node:fs/promises', { spy: true })

const manifest = {
  generatedAt: '2026-09-10T00:00:00Z',
  tool: { name: 'elog', version: '1' },
  entries: {},
}
let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'offprint-atomic-'))
  await mkdir(join(root, 'content', 'posts'), { recursive: true })
  await writeFile(join(root, 'content', 'posts', 'old.en.md'), 'old')
  await mkdir(join(root, 'staging', 'posts'), { recursive: true })
  await writeFile(join(root, 'staging', 'posts', 'new.en.md'), 'new')
})

afterEach(async () => {
  vi.restoreAllMocks()
  await rm(root, { recursive: true, force: true })
})

describe('atomicSwitch on filesystems that refuse directory renames', () => {
  it('falls back to copy + remove when rename reports EXDEV (overlayfs image layer)', async () => {
    // The spy wraps the real function; reach the unmocked one for the pass-through.
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
    let first = true
    vi.mocked(fsp.rename).mockImplementation(async (from, to) => {
      if (first) {
        first = false
        throw Object.assign(new Error('cross-device link not permitted'), { code: 'EXDEV' })
      }
      return actual.rename(from, to)
    })
    await atomicSwitch(join(root, 'content'), join(root, 'staging'), ['posts'], manifest)
    expect(await readFile(join(root, 'content', 'posts', 'new.en.md'), 'utf8')).toBe('new')
    await expect(readFile(join(root, 'content', 'posts', 'old.en.md'), 'utf8')).rejects.toThrow()
    await expect(
      readFile(join(root, 'content', 'posts.old', 'old.en.md'), 'utf8'),
    ).rejects.toThrow()
    expect(
      JSON.parse(await readFile(join(root, 'content', 'manifest.json'), 'utf8')).tool.name,
    ).toBe('elog')
  })

  it('still rethrows other rename errors', async () => {
    vi.mocked(fsp.rename).mockRejectedValueOnce(
      Object.assign(new Error('boom'), { code: 'EACCES' }),
    )
    await expect(
      atomicSwitch(join(root, 'content'), join(root, 'staging'), ['posts'], manifest),
    ).rejects.toThrow(/boom/)
  })
})

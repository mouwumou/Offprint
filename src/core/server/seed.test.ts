import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

// docker/site-entrypoint.sh seeds the content volume from the image on every
// container start. Exercised here with plain directories: SEED_SRC stands in
// for the image's /app/content, CONTENT_DIR for the volume.
const script = fileURLToPath(new URL('../../../docker/site-entrypoint.sh', import.meta.url))

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'offprint-seed-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function image(name: string, files: Record<string, string>): Promise<string> {
  const dir = join(root, name)
  for (const [path, body] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true })
    await writeFile(join(dir, path), body)
  }
  return dir
}

function seed(src: string, dst: string): void {
  const result = spawnSync('sh', [script, 'true'], {
    env: { ...process.env, SEED_SRC: src, CONTENT_DIR: dst },
  })
  expect(result.status, result.stderr.toString()).toBe(0)
}

describe.skipIf(process.platform === 'win32')('site-entrypoint.sh seeding', () => {
  it('replaces author-owned collections, merges assets, and leaves sync-owned files alone', async () => {
    const volume = join(root, 'volume')
    const first = await image('image-1', {
      'pages/a.en.md': 'a',
      'assets/x.png': 'x',
      'assets/sub/y.png': 'y',
      'profile.yaml': 'name: One\n',
      'posts/p.en.md': 'image p',
      'manifest.json': '{}',
    })
    seed(first, volume)
    expect(await readFile(join(volume, 'pages', 'a.en.md'), 'utf8')).toBe('a')
    expect(existsSync(join(volume, 'assets', 'sub', 'y.png'))).toBe(true)

    // A sync ran in between: posts changed and an image was materialised.
    await writeFile(join(volume, 'posts', 'p.en.md'), 'synced p')
    await writeFile(join(volume, 'posts', 'q.en.md'), 'synced q')
    await writeFile(join(volume, 'assets', 'synced.png'), 'from notion')

    // A new image: page a deleted, page b added, asset y dropped, profile edited.
    const second = await image('image-2', {
      'pages/b.en.md': 'b',
      'assets/x.png': 'x2',
      'profile.yaml': 'name: Two\n',
      'posts/p.en.md': 'image p',
      'manifest.json': '{}',
    })
    seed(second, volume)

    expect(existsSync(join(volume, 'pages', 'a.en.md'))).toBe(false)
    expect(await readFile(join(volume, 'pages', 'b.en.md'), 'utf8')).toBe('b')
    expect(await readFile(join(volume, 'profile.yaml'), 'utf8')).toBe('name: Two\n')
    expect(await readFile(join(volume, 'assets', 'x.png'), 'utf8')).toBe('x2')
    expect(existsSync(join(volume, 'assets', 'sub', 'y.png'))).toBe(false)
    expect(await readFile(join(volume, 'assets', 'synced.png'), 'utf8')).toBe('from notion')
    expect(await readFile(join(volume, 'posts', 'p.en.md'), 'utf8')).toBe('synced p')
    expect(existsSync(join(volume, 'posts', 'q.en.md'))).toBe(true)
  })
})

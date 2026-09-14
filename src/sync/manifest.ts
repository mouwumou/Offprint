import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'
import type { Manifest } from '../core/schema'

const COLLECTION_DIRS = ['posts', 'pages'] as const
const YAML_FILES = ['publications.yaml', 'projects.yaml', 'cv.yaml', 'talks.yaml', 'news.yaml']

async function listMarkdown(root: string, dir: string): Promise<string[]> {
  try {
    return (await readdir(join(root, dir))).filter((name) => name.endsWith('.md')).sort()
  } catch {
    return []
  }
}

/**
 * Manifest for a content directory (docs/CONTENT-CONTRACT.md §8): entry per markdown
 * document keyed `${collection}/${basename-without-ext}` plus the YAML
 * collections, hashes as ETags. `errors` come from the sync run (or a
 * standalone validate pass).
 */
export async function buildManifest(
  root: string,
  tool: { name: string; version: string },
  errors: { path: string; issues: string[] }[] = [],
  previous: Manifest | null = null,
): Promise<Manifest> {
  const entries: Manifest['entries'] = {}
  for (const dir of COLLECTION_DIRS) {
    for (const name of await listMarkdown(root, dir)) {
      const path = `${dir}/${name}`
      const raw = await readFile(join(root, path), 'utf8')
      const { data } = matter(raw)
      const updated = data['updated']
      entries[`${dir}/${name.replace(/\.md$/, '')}`] = {
        path,
        hash: createHash('sha256').update(raw).digest('hex'),
        updated:
          updated instanceof Date
            ? updated.toISOString().slice(0, 10)
            : typeof updated === 'string'
              ? updated
              : '',
      }
    }
  }
  const generatedAt = new Date().toISOString()
  for (const name of YAML_FILES) {
    try {
      const raw = await readFile(join(root, name), 'utf8')
      const key = name.replace(/\.yaml$/, '')
      const hash = createHash('sha256').update(raw).digest('hex')
      // YAML files carry no date of their own: keep the previous manifest's
      // date while the bytes are unchanged, so an untouched file never looks
      // updated (that made every sync a new commit).
      const before = previous?.entries[key]
      entries[key] = {
        path: name,
        hash,
        updated:
          before !== undefined && before.hash === hash ? before.updated : generatedAt.slice(0, 10),
      }
    } catch {
      /* optional collection */
    }
  }
  return { generatedAt, tool, entries, ...(errors.length > 0 ? { errors } : {}) }
}

/**
 * Same content state: identical entries (path, hash, date) and identical
 * errors. `generatedAt` and the tool are deliberately ignored — they describe
 * the run, not the content. Used to make a sync with nothing new a no-op.
 */
export function sameContent(previous: Manifest | null | undefined, next: Manifest): boolean {
  if (!previous) return false
  const canonical = (manifest: Manifest): string =>
    JSON.stringify([
      Object.keys(manifest.entries)
        .sort()
        .map((key) => [key, manifest.entries[key]]),
      manifest.errors ?? [],
    ])
  return canonical(previous) === canonical(next)
}

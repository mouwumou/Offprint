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
 * Manifest for a content directory (CONTENT-CONTRACT §8): entry per markdown
 * document keyed `${collection}/${basename-without-ext}` plus the YAML
 * collections, hashes as ETags. `errors` come from the sync run (or a
 * standalone validate pass).
 */
export async function buildManifest(
  root: string,
  tool: { name: string; version: string },
  errors: { path: string; issues: string[] }[] = [],
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
      entries[name.replace(/\.yaml$/, '')] = {
        path: name,
        hash: createHash('sha256').update(raw).digest('hex'),
        updated: generatedAt.slice(0, 10),
      }
    } catch {
      /* optional collection */
    }
  }
  return { generatedAt, tool, entries, ...(errors.length > 0 ? { errors } : {}) }
}

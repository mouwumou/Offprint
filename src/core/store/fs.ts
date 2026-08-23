import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { z } from 'zod'
import { diffManifests } from './diff'
import { manifestSchema, type ContentStore, type Manifest, type ManifestDiff } from './types'

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  )
}

/**
 * ContentStore over a local directory (CONTENT_DIR). The baseline store for
 * both modes; `watch` arrives with server mode (P2-4).
 */
export class FsStore implements ContentStore {
  constructor(private readonly root: string) {}

  async read(path: string): Promise<string | null> {
    try {
      return await readFile(join(this.root, path), 'utf8')
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  }

  async list(prefix: string): Promise<string[]> {
    try {
      const entries = await readdir(join(this.root, prefix), {
        recursive: true,
        withFileTypes: true,
      })
      return entries
        .filter((entry) => entry.isFile())
        .map((entry) =>
          relative(this.root, join(entry.parentPath, entry.name)).split('\\').join('/'),
        )
        .sort()
    } catch (error) {
      if (isNotFound(error)) return []
      throw error
    }
  }

  async manifest(): Promise<Manifest | null> {
    const raw = await this.read('manifest.json')
    if (raw === null) return null
    const result = manifestSchema.safeParse(JSON.parse(raw))
    if (!result.success) {
      throw new Error(`Invalid manifest.json:\n${z.prettifyError(result.error)}`)
    }
    return result.data
  }

  /**
   * Watch manifest.json (the sync pipeline writes it last, §4) and emit a
   * key-level diff. chokidar loads lazily so a static build never executes —
   * or ships — any watcher code (P2-4).
   */
  watch(onChange: (changed: ManifestDiff) => void): () => void {
    let closed = false
    let watcher: { close(): Promise<void> } | undefined
    let previous: Manifest | null = null

    void (async () => {
      previous = await this.manifest().catch(() => null)
      const { watch } = await import('chokidar')
      if (closed) return
      const handle = async (): Promise<void> => {
        const next = await this.manifest().catch(() => null)
        const diff = diffManifests(previous, next)
        previous = next
        if (diff.added.length + diff.changed.length + diff.removed.length > 0) onChange(diff)
      }
      watcher = watch(join(this.root, 'manifest.json'), {
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
      })
        .on('add', () => void handle())
        .on('change', () => void handle())
        .on('unlink', () => void handle())
    })()

    return () => {
      closed = true
      void watcher?.close()
    }
  }
}

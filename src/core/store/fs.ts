import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { z } from 'zod'
import { manifestSchema, type ContentStore, type Manifest } from './types'

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
}

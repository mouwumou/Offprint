import type { Manifest } from '../schema/manifest'

export { manifestEntrySchema, manifestSchema } from '../schema/manifest'
export type { Manifest, ManifestEntry } from '../schema/manifest'

/**
 * Byte-level content storage (DYNAMIC-PUBLISHING §3.1). Implementations:
 * FsStore (phase 0), GitStore / S3Store (phase 2). Reads and lists only —
 * the semantic layer lives in ContentProvider.
 */
export interface ContentStore {
  /** Text of one file, or null when it does not exist. */
  read(path: string): Promise<string | null>
  /** Relative paths (from the store root) of all files under a collection prefix. */
  list(prefix: string): Promise<string[]>
  /** Parsed manifest.json, or null when it does not exist. */
  manifest(): Promise<Manifest | null>
  /** Subscribe to changes; stores without push support omit this (static mode uses none). */
  watch?(onChange: (changed: ManifestDiff) => void): () => void
}

export interface ManifestDiff {
  added: string[]
  changed: string[]
  removed: string[]
}

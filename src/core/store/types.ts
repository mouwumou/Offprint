import type { Manifest, ManifestDiff } from '../schema/manifest'

export { diffManifests, manifestEntrySchema, manifestSchema } from '../schema/manifest'
export type { Manifest, ManifestDiff, ManifestEntry } from '../schema/manifest'

/**
 * Byte-level content storage (docs/DYNAMIC-PUBLISHING.md §3.1). Implementations:
 * FsStore (a local directory) and GitStore (a GitHub repository). Reads and lists only —
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

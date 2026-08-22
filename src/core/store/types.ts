import { z } from 'zod'

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

export const manifestEntrySchema = z.object({
  /** e.g. posts/geometry-of-uncertainty.en.md */
  path: z.string(),
  /** sha256 of the file content; doubles as the ETag. */
  hash: z.string(),
  /** frontmatter.updated */
  updated: z.string(),
})

export const manifestSchema = z.object({
  generatedAt: z.iso.datetime(),
  tool: z.object({ name: z.string(), version: z.string() }),
  /** Keyed by `${collection}/${slug}`, e.g. posts/geometry-of-uncertainty.en */
  entries: z.record(z.string(), manifestEntrySchema),
  /** Per-file validation failures recorded by sync; they never block other files. */
  errors: z.array(z.object({ path: z.string(), issues: z.array(z.string()) })).optional(),
})

export type Manifest = z.output<typeof manifestSchema>
export type ManifestEntry = z.output<typeof manifestEntrySchema>

export interface ManifestDiff {
  added: string[]
  changed: string[]
  removed: string[]
}

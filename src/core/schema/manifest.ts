import { z } from 'zod'

// Lives in core/schema (not core/store) because src/sync both writes the
// manifest and may only import src/core/schema (ADR-006).

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

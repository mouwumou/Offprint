import type { Manifest } from '../schema/manifest'
import type { ManifestDiff } from './types'

/** Key-level diff between two manifests (either may be null). */
export function diffManifests(previous: Manifest | null, next: Manifest | null): ManifestDiff {
  const before = previous?.entries ?? {}
  const after = next?.entries ?? {}
  const added: string[] = []
  const changed: string[] = []
  const removed: string[] = []
  for (const key of Object.keys(after)) {
    const entry = before[key]
    if (entry === undefined) added.push(key)
    else if (entry.hash !== after[key]?.hash) changed.push(key)
  }
  for (const key of Object.keys(before)) {
    if (after[key] === undefined) removed.push(key)
  }
  return { added, changed, removed }
}

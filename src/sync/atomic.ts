import { rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Manifest } from '../core/schema'

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

/**
 * Atomic switch (DYNAMIC-PUBLISHING §4): move freshly synced collection dirs
 * from staging into the live content dir via renames — readers never observe
 * a half-written collection — and write manifest.json LAST, because the site
 * only watches the manifest.
 */
export async function atomicSwitch(
  contentDir: string,
  stagingDir: string,
  collections: readonly string[],
  manifest: Manifest,
): Promise<void> {
  for (const collection of collections) {
    const fresh = join(stagingDir, collection)
    if (!(await exists(fresh))) continue
    const live = join(contentDir, collection)
    const old = join(contentDir, `${collection}.old`)
    await rm(old, { recursive: true, force: true })
    const hadLive = await exists(live)
    if (hadLive) {
      await rename(live, old)
    }
    try {
      await rename(fresh, live)
    } catch (error) {
      // Roll the previous version back rather than leaving no live dir.
      if (hadLive) await rename(old, live).catch(() => {})
      throw error
    }
    await rm(old, { recursive: true, force: true })
  }
  // Write tmp + rename so a concurrent request-path read (FsStore.manifest
  // JSON.parses with no guard) never sees a half-written file.
  const manifestPath = join(contentDir, 'manifest.json')
  const tmp = `${manifestPath}.tmp`
  await writeFile(tmp, `${JSON.stringify(manifest, null, 2)}\n`)
  await rename(tmp, manifestPath)
}

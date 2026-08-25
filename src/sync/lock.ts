import { mkdir, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

/** A crashed holder is stolen after this long. Full syncs finish in minutes. */
const STALE_MS = 15 * 60_000

/**
 * Cross-process sync mutex: in the compose stack the site container
 * (/api/sync) and the sidecar loop can both run the sync CLI against the
 * same content volume, and the in-process single-flight cannot see across
 * that boundary. mkdir is atomic on every platform we target, so a lock
 * directory inside the content dir (the shared volume) is the lock.
 */
export async function acquireSyncLock(contentDir: string): Promise<() => Promise<void>> {
  const lockDir = join(contentDir, '.sync-lock')
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await mkdir(lockDir)
      return async () => {
        await rm(lockDir, { recursive: true, force: true })
      }
    } catch {
      const info = await stat(lockDir).catch(() => null)
      if (info === null) continue // released between mkdir and stat — retry
      if (Date.now() - info.mtimeMs > STALE_MS) {
        // Steal atomically: rename is a single winner even if two processes
        // both see the stale lock (a plain rm+mkdir would let both proceed).
        // The winner then removes the renamed dir and retries mkdir; the
        // loser's rename fails (ENOENT) and it retries the whole loop.
        const stolen = `${lockDir}.stale-${process.pid}-${info.mtimeMs}`
        try {
          await rename(lockDir, stolen)
        } catch {
          continue // another process won the steal — retry
        }
        await rm(stolen, { recursive: true, force: true })
        continue
      }
      throw new Error(
        'another sync is running (content/.sync-lock is held); retry after it finishes',
      )
    }
  }
  throw new Error('could not acquire the sync lock')
}

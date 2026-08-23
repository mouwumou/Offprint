import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { getProvider } from '../content'
import { createSingleFlight, type SingleFlight } from './guard'

export interface SyncResult {
  ok: boolean
  code: number | null
}

// One single-flight per server process; 60s merge window absorbs webhook
// replays (DYNAMIC-PUBLISHING §6). The child resolves {ok:false} on failure
// rather than rejecting — the predicate keeps failed runs out of the merge
// window and marks them failed on /api/health.
export const syncFlight: SingleFlight<SyncResult> = createSingleFlight<SyncResult>(
  60_000,
  (result) => result.ok,
)

/**
 * Run the sync CLI as a child process (a process boundary, not an import —
 * the ADR-006 core→sync rule stays intact) and drop the provider caches when
 * it succeeds.
 */
export function runSyncProcess(): Promise<SyncResult> {
  return new Promise((resolve) => {
    const tsx = join(process.cwd(), 'node_modules', '.bin', 'tsx')
    const child = spawn(tsx, ['src/sync/cli.ts', 'sync'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'inherit', 'inherit'],
    })
    child.on('close', (code) => {
      void (async () => {
        if (code === 0) await getProvider().revalidate()
        resolve({ ok: code === 0, code })
      })()
    })
    child.on('error', () => resolve({ ok: false, code: null }))
  })
}

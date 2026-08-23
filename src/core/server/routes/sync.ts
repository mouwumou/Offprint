import type { APIRoute } from 'astro'
import { checkSecret, createRateLimiter, json } from '../guard'
import { runSyncProcess, syncFlight } from '../sync-state'

const allow = createRateLimiter(6)

/**
 * POST /api/sync — trigger one sync pass (self-hosted path). Responds 202
 * immediately; progress/outcome surfaces on /api/health. Concurrent and
 * replayed triggers are absorbed by the single-flight merge window (§6).
 */
export const POST: APIRoute = ({ request }) => {
  const denied = checkSecret(request)
  if (denied) return denied
  if (!allow()) return json({ error: 'rate limited' }, 429)

  const outcome = syncFlight.run(runSyncProcess)
  return json({ sync: outcome.status }, outcome.status === 'merged' ? 200 : 202)
}

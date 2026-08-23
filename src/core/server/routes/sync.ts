import type { APIRoute } from 'astro'
import { checkNotionSignature, checkSecret, createRateLimiter, json } from '../guard'
import { runSyncProcess, syncFlight } from '../sync-state'

const allow = createRateLimiter(6)

/**
 * POST /api/sync — trigger one sync pass (self-hosted path). Auth: the shared
 * secret header, or a valid Notion webhook signature when
 * NOTION_WEBHOOK_SECRET is configured (P2-7). Responds 202 immediately;
 * progress/outcome surfaces on /api/health. Concurrent and replayed triggers
 * are absorbed by the single-flight merge window (§6).
 */
export const POST: APIRoute = async ({ request }) => {
  const rawBody = await request.text()

  // Notion's one-time subscription handshake comes BEFORE any secret exists
  // (the verification_token IS the future signing secret), so it cannot be
  // authenticated — surface the token in the logs for the maintainer to
  // paste into the Notion UI and into NOTION_WEBHOOK_SECRET. Nothing else
  // happens on this path.
  try {
    const body = JSON.parse(rawBody) as { verification_token?: string }
    if (body.verification_token) {
      console.log(`[offprint] notion webhook verification_token: ${body.verification_token}`)
      return json({ ok: true })
    }
  } catch {
    /* not JSON — fine */
  }

  const signature = await checkNotionSignature(request, rawBody)
  if (signature === false) return json({ error: 'bad signature' }, 401)
  if (signature === null) {
    const denied = checkSecret(request)
    if (denied) return denied
  }

  if (!allow()) return json({ error: 'rate limited' }, 429)

  const outcome = syncFlight.run(runSyncProcess)
  return json({ sync: outcome.status }, outcome.status === 'merged' ? 200 : 202)
}

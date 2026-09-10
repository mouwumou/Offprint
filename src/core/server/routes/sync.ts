import type { APIRoute } from 'astro'
import { checkNotionSignature, checkSecret, createRateLimiter, json } from '../guard'
import { runSyncProcess, syncFlight } from '../sync-state'

const allow = createRateLimiter(6)

/**
 * POST /api/sync — trigger one sync pass (self-hosted path). Auth: the shared
 * secret header, or a valid Notion webhook signature when
 * NOTION_WEBHOOK_SECRET is configured. Responds 202 immediately;
 * progress/outcome surfaces on /api/health. Concurrent and replayed triggers
 * are absorbed by the single-flight merge window.
 */
// Notion webhook payloads are tiny; anything larger is abuse. Cap the read so
// an anonymous POST can't balloon memory (the route is public in server mode).
const MAX_BODY = 64 * 1024

export const POST: APIRoute = async ({ request }) => {
  // Rate-limit BEFORE any work — including the pre-auth handshake path — so a
  // flood cannot spin the body read or the token log line.
  if (!allow()) return json({ error: 'rate limited' }, 429)

  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY) return json({ error: 'payload too large' }, 413)
  const rawBody = await request.text()
  if (rawBody.length > MAX_BODY) return json({ error: 'payload too large' }, 413)

  // Notion's one-time subscription handshake comes BEFORE any secret exists
  // (the verification_token IS the future signing secret), so it cannot be
  // authenticated — surface the token in the logs for the maintainer to
  // paste into the Notion UI and into NOTION_WEBHOOK_SECRET. Nothing else
  // happens on this path.
  try {
    const body = JSON.parse(rawBody) as { verification_token?: string }
    if (typeof body.verification_token === 'string') {
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

  const outcome = syncFlight.run(runSyncProcess)
  return json({ sync: outcome.status }, outcome.status === 'merged' ? 200 : 202)
}

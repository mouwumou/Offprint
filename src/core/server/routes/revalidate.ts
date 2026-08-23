import type { APIRoute } from 'astro'
import { z } from 'zod'
import { getProvider } from '../../content'
import { checkSecret, createRateLimiter, json } from '../guard'

const bodySchema = z.object({ keys: z.array(z.string()).optional() })
const allow = createRateLimiter(30)

/** POST /api/revalidate — drop provider caches for `keys` (or all). Idempotent. */
export const POST: APIRoute = async ({ request }) => {
  const denied = checkSecret(request)
  if (denied) return denied
  if (!allow()) return json({ error: 'rate limited' }, 429)

  let keys: string[] | undefined
  try {
    const raw = await request.text()
    if (raw.trim().length > 0) {
      const parsed = bodySchema.safeParse(JSON.parse(raw))
      if (!parsed.success) return json({ error: 'body must be { keys?: string[] }' }, 400)
      keys = parsed.data.keys
    }
  } catch {
    return json({ error: 'invalid JSON body' }, 400)
  }

  await getProvider().revalidate(keys)
  return json({ revalidated: keys ?? 'all' })
}

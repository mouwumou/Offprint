import type { APIRoute } from 'astro'
import { getProvider, getStore } from '../../content'
import { json } from '../guard'
import { syncFlight } from '../sync-state'

/** GET /api/health — content version, manifest state, last sync (§3.3). */
export const GET: APIRoute = async () => {
  const manifest = await getStore().manifest()
  const last = syncFlight.last()
  return json({
    status: 'ok',
    version: await getProvider().version(),
    generatedAt: manifest?.generatedAt ?? null,
    entries: manifest ? Object.keys(manifest.entries).length : 0,
    errors: manifest?.errors?.length ?? 0,
    lastSync: last ? { at: new Date(last.at).toISOString(), ok: last.ok } : null,
  })
}

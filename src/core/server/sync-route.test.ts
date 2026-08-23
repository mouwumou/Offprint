import { afterEach, describe, expect, it, vi } from 'vitest'

// The route pulls in sync-state (child-process spawning) — stub it so
// importing the route stays side-effect free in tests.
vi.mock('./sync-state', () => ({
  syncFlight: { run: () => ({ status: 'started' }), last: () => null },
  runSyncProcess: () => Promise.resolve({ ok: true, code: 0 }),
}))

const { POST } = await import('./routes/sync')

function post(body: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/sync', { method: 'POST', body, headers })
}

type Ctx = Parameters<typeof POST>[0]

describe('POST /api/sync', () => {
  afterEach(() => {
    delete process.env['REVALIDATE_SECRET']
    delete process.env['NOTION_WEBHOOK_SECRET']
  })

  it('answers the unauthenticated Notion handshake before any auth check', async () => {
    // The verification_token arrives BEFORE any shared secret exists — the
    // token IS the future signing secret (Notion webhook docs).
    process.env['REVALIDATE_SECRET'] = 'shared'
    const response = await POST({
      request: post('{"verification_token":"tok_123"}'),
    } as Ctx)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('still requires auth for real sync triggers', async () => {
    process.env['REVALIDATE_SECRET'] = 'shared'
    expect((await POST({ request: post('{}') } as Ctx)).status).toBe(401)

    const ok = await POST({
      request: post('{}', { 'x-revalidate-secret': 'shared' }),
    } as Ctx)
    expect(ok.status).toBe(202)
  })
})

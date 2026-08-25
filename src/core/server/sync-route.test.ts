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

  // NOTE: the route's rate limiter (6/min) is module state shared by every
  // test in this file — keep the total request count here at 6 or fewer.
  it('caps the body BEFORE reading it when Content-Length declares too much', async () => {
    process.env['REVALIDATE_SECRET'] = 'shared'
    const response = await POST({
      request: post('{}', { 'content-length': String(1024 * 1024) }),
    } as Ctx)
    expect(response.status).toBe(413)
  })

  it('caps the body by actual size when Content-Length is absent', async () => {
    process.env['REVALIDATE_SECRET'] = 'shared'
    const response = await POST({
      request: post('x'.repeat(64 * 1024 + 1)),
    } as Ctx)
    expect(response.status).toBe(413)
  })
})

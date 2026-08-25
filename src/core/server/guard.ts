import { timingSafeEqual } from 'node:crypto'

// Shared endpoint protection (DYNAMIC-PUBLISHING §3.3): secret auth,
// per-endpoint rate limiting, and a single-flight mutex with a merge window
// for the write endpoints.

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  })
}

/** Write endpoints require the shared secret header (constraint 8). */
export function checkSecret(request: Request): Response | null {
  const secret = process.env['REVALIDATE_SECRET']
  if (!secret) {
    return json({ error: 'REVALIDATE_SECRET is not configured' }, 503)
  }
  const provided = request.headers.get('x-revalidate-secret') ?? ''
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return json({ error: 'unauthorized' }, 401)
  }
  return null
}

/**
 * Notion webhook signature check (P2-7, optional): HMAC-SHA256 of the raw
 * body with NOTION_WEBHOOK_SECRET, sent as `X-Notion-Signature: sha256=<hex>`.
 * Returns null when the header is absent or the secret unconfigured (caller
 * falls back to the shared-secret path).
 */
export async function checkNotionSignature(
  request: Request,
  rawBody: string,
): Promise<boolean | null> {
  const secret = process.env['NOTION_WEBHOOK_SECRET']
  const header = request.headers.get('x-notion-signature')
  if (!secret || !header) return null
  const { createHmac, timingSafeEqual } = await import('node:crypto')
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Sliding-window rate limiter (per process, per endpoint). */
export function createRateLimiter(maxPerMinute: number): () => boolean {
  const stamps: number[] = []
  return () => {
    const now = Date.now()
    while (stamps.length > 0 && now - (stamps[0] as number) > 60_000) stamps.shift()
    if (stamps.length >= maxPerMinute) return false
    stamps.push(now)
    return true
  }
}

export interface SingleFlight<T> {
  /** 'started' | 'running' | 'merged' with the last result when merged. */
  run(task: () => Promise<T>): { status: 'started' | 'running' | 'merged'; last?: T }
  last(): { at: number; ok: boolean; value?: T } | null
}

/**
 * Single-flight with a merge window: concurrent triggers join the running
 * task (202), and triggers arriving within `mergeMs` of a completed run are
 * absorbed instead of restarting elog (webhook replay protection, §6).
 *
 * `isOk` classifies a RESOLVED value as success or failure — tasks like the
 * sync child process resolve `{ok: false}` instead of rejecting. Only
 * successful runs open the merge window; a failure may be retried at once
 * and is reported as failed by last() (surfaced on /api/health).
 */
export function createSingleFlight<T>(
  mergeMs: number,
  isOk: (value: T) => boolean = () => true,
): SingleFlight<T> {
  let running = false
  let last: { at: number; ok: boolean; value?: T } | null = null
  return {
    run(task) {
      if (running) return { status: 'running' }
      if (last !== null && last.ok && Date.now() - last.at < mergeMs) {
        return { status: 'merged', ...(last.value !== undefined ? { last: last.value } : {}) }
      }
      running = true
      void task()
        .then((value) => {
          last = { at: Date.now(), ok: isOk(value), value }
        })
        .catch(() => {
          last = { at: Date.now(), ok: false }
        })
        .finally(() => {
          running = false
        })
      return { status: 'started' }
    },
    last: () => last,
  }
}

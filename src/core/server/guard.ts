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
  if (request.headers.get('x-revalidate-secret') !== secret) {
    return json({ error: 'unauthorized' }, 401)
  }
  return null
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
 */
export function createSingleFlight<T>(mergeMs: number): SingleFlight<T> {
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
          last = { at: Date.now(), ok: true, value }
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

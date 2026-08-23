import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkSecret, createRateLimiter, createSingleFlight } from './guard'

describe('checkSecret', () => {
  const original = process.env['REVALIDATE_SECRET']
  afterEach(() => {
    if (original === undefined) delete process.env['REVALIDATE_SECRET']
    else process.env['REVALIDATE_SECRET'] = original
  })

  it('503s when unconfigured, 401s on mismatch, passes on match', () => {
    delete process.env['REVALIDATE_SECRET']
    expect(checkSecret(new Request('http://x'))?.status).toBe(503)

    process.env['REVALIDATE_SECRET'] = 's3cret'
    expect(checkSecret(new Request('http://x'))?.status).toBe(401)
    expect(
      checkSecret(new Request('http://x', { headers: { 'x-revalidate-secret': 'wrong' } }))?.status,
    ).toBe(401)
    expect(
      checkSecret(new Request('http://x', { headers: { 'x-revalidate-secret': 's3cret' } })),
    ).toBeNull()
  })
})

describe('createRateLimiter', () => {
  it('allows up to the limit per minute, then refuses', () => {
    const allow = createRateLimiter(3)
    expect([allow(), allow(), allow(), allow()]).toEqual([true, true, true, false])
  })
})

describe('createSingleFlight', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('merges triggers while running and inside the merge window', async () => {
    const flight = createSingleFlight<string>(60_000)
    let release!: (value: string) => void
    const task = () => new Promise<string>((resolve) => (release = resolve))

    expect(flight.run(task).status).toBe('started')
    expect(flight.run(task).status).toBe('running')

    release('done')
    await vi.advanceTimersByTimeAsync(0)
    expect(flight.run(task)).toEqual({ status: 'merged', last: 'done' })

    await vi.advanceTimersByTimeAsync(61_000)
    expect(flight.run(task).status).toBe('started')
  })

  it('does not merge after a failed run', async () => {
    const flight = createSingleFlight<string>(60_000)
    expect(flight.run(() => Promise.reject(new Error('boom'))).status).toBe('started')
    await vi.advanceTimersByTimeAsync(0)
    expect(flight.last()?.ok).toBe(false)
    expect(flight.run(() => Promise.resolve('ok')).status).toBe('started')
  })
})

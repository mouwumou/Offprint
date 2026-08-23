// P2-1: after the atomic switch, tell a server-mode site (or Vercel ISR
// path, P2-6) which keys changed. Failure is non-fatal — the manifest watch
// (P2-4) or the next cron pass will still converge.

export async function notifyRevalidate(keys: string[]): Promise<void> {
  const url = process.env['REVALIDATE_URL']
  if (!url) return
  const secret = process.env['REVALIDATE_SECRET'] ?? ''
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': secret,
      },
      body: JSON.stringify(keys.length > 0 ? { keys } : {}),
      signal: AbortSignal.timeout(10_000),
    })
    console.log(`[sync] notified ${url}: ${response.status}`)
  } catch (error) {
    console.warn(`[sync] revalidate notify failed (non-fatal): ${String(error)}`)
  }
}

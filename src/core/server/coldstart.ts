import { getStore } from '../content'
import { useTranslations } from '../i18n'

let contentReady = false

/**
 * §5 cold start: before the very first manifest lands, HTML routes get a 503
 * "content is syncing" page instead of broken pages. Once content is seen,
 * the check short-circuits forever (per process).
 */
export async function coldStartResponse(pathname: string): Promise<Response | null> {
  if (contentReady || pathname.startsWith('/api/')) return null
  const store = getStore()
  const manifest = await store.manifest().catch(() => null)
  // Hand-written content ships without a manifest (CONTENT-CONTRACT §1) —
  // any posts on disk also count as ready.
  if (manifest !== null || (await store.list('posts')).length > 0) {
    contentReady = true
    return null
  }
  const en = useTranslations('en')
  const zh = useTranslations('zh')
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="10" />
    <title>${en('coldstart.title')} · ${zh('coldstart.title')}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; background: #faf8f3; color: #1c1a16;
             display: grid; place-items: center; min-height: 100vh; margin: 0; }
      main { text-align: center; padding: 2rem; }
      h1 { font-weight: 600; font-size: 1.4rem; margin: 0 0 0.75rem; }
      p { color: #6c675c; margin: 0.25rem 0; }
    </style>
  </head>
  <body>
    <main>
      <h1>${en('coldstart.title')} / ${zh('coldstart.title')}</h1>
      <p>${en('coldstart.body')}</p>
      <p>${zh('coldstart.body')}</p>
    </main>
  </body>
</html>
`
  return new Response(html, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '10' },
  })
}

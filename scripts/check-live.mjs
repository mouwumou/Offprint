// Post-deploy check (usage: pnpm check:live https://your.site/ — the exact
// SITE_URL, sub-path included). Content-agnostic: walks the live sitemap,
// fetches every page, and verifies each internal URL a page references stays
// inside the deployment base and resolves. Exit 1 on any failure.
const [siteUrl] = process.argv.slice(2)
if (!siteUrl) {
  console.error('usage: node scripts/check-live.mjs <site url>')
  process.exit(2)
}
const site = new URL(siteUrl)
const origin = site.origin
const BASE = site.pathname.replace(/\/+$/, '')
const text = async (url) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} → ${response.status}`)
  return response.text()
}
const locs = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])

let index
try {
  index = await text(`${origin}${BASE}/sitemap-index.xml`)
} catch (error) {
  console.log(`sitemap-index unreachable: ${error.message}`)
  process.exit(1)
}
const pages = new Set()
for (const sitemap of locs(index)) for (const loc of locs(await text(sitemap))) pages.add(loc)
console.log(`sitemap: ${pages.size} pages, base=${BASE || '(root)'}`)

const status = new Map()
const failures = new Set()
for (const page of pages) {
  const url = new URL(page)
  if (!(url.pathname === BASE || url.pathname.startsWith(`${BASE}/`))) {
    failures.add(`SITEMAP outside base: ${page}`)
  }
  const response = await fetch(page)
  const html = await response.text()
  if (response.status !== 200) {
    failures.add(`PAGE ${page} → ${response.status}`)
    continue
  }
  const refs = new Set()
  for (const m of html.matchAll(/\b(?:href|src|content)="([^"]+)"/g)) refs.add(m[1])
  for (const m of html.matchAll(/url=([^"]+)"/g)) refs.add(m[1])
  for (const raw of refs) {
    if (raw.startsWith('//')) continue
    const path = raw.startsWith('/')
      ? raw
      : raw.startsWith(`${origin}/`)
        ? raw.slice(origin.length)
        : null
    if (path === null) continue
    const clean = path.split('#')[0].split('?')[0]
    if (!(clean === BASE || clean.startsWith(`${BASE}/`))) {
      failures.add(`OUTSIDE ${url.pathname} → ${raw}`)
    }
    if (!status.has(clean)) {
      status.set(clean, (await fetch(origin + clean, { redirect: 'manual' })).status)
    }
    const code = status.get(clean)
    if (!(code >= 200 && code < 400)) failures.add(`BROKEN ${url.pathname} → ${raw} (${code})`)
  }
}
// The search index only exists when the site has a search page
// (modules.blog.search / blog off build neither).
const hasSearch = (await fetch(`${origin}${BASE}/search/`)).status === 200
for (const extra of ['/robots.txt', '/rss.xml', ...(hasSearch ? ['/pagefind/pagefind.js'] : [])]) {
  const code = (await fetch(`${origin}${BASE}${extra}`)).status
  if (code !== 200) failures.add(`MISSING ${BASE}${extra} (${code})`)
}
console.log(`${status.size} distinct internal URLs checked; ${failures.size} failures`)
for (const failure of failures) console.log(`  ${failure}`)
process.exit(failures.size ? 1 : 0)

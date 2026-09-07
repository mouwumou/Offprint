import { execSync, spawn, type ChildProcess } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { discoverRedirects, discoverRoutes } from './lib/routes'

// ADR-023: a site deployed under a sub-path (user.github.io/repo) must carry
// that path on EVERY internal URL — nav, feeds, covers, canonical/hreflang,
// redirect targets, search results — in both runtime modes. Content-agnostic
// crawl: every discovered route is fetched under the base and every internal
// URL it references must (a) start with the base and (b) resolve.

const BASE = '/sub'
const STATIC_PORT = 4601
const SERVER_PORT = 4602
const STATIC_ORIGIN = `http://127.0.0.1:${STATIC_PORT}`
const SERVER_ORIGIN = `http://127.0.0.1:${SERVER_PORT}`
const STATIC_DIR = 'dist-base-static'
const SERVER_DIR = 'dist-base-server'

let staticServer: ChildProcess
let nodeServer: ChildProcess

async function waitFor(url: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      /* not up yet */
    }
    if (attempt > 75) throw new Error(`${url} did not become ready`)
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
}

/** Every URL-bearing attribute value plus meta-refresh targets. */
function referencedUrls(html: string): string[] {
  const urls = new Set<string>()
  for (const match of html.matchAll(/\b(?:href|src|content)="([^"]+)"/g)) urls.add(match[1] ?? '')
  for (const match of html.matchAll(/url=([^"]+)"/g)) urls.add(match[1] ?? '')
  return [...urls].filter((url) => url !== '')
}

/** Root-relative paths and absolute URLs on our own origin; null for the rest. */
function internalPath(url: string, origin: string): string | null {
  if (url.startsWith('//')) return null
  if (url.startsWith('/')) return url
  if (url.startsWith(`${origin}/`)) return url.slice(origin.length)
  return null
}

async function crawlUnderBase(origin: string): Promise<void> {
  const routes = discoverRoutes(STATIC_DIR)
  expect(routes.length).toBeGreaterThan(0)
  const statusByPath = new Map<string, number>()
  for (const route of routes) {
    const response = await fetch(`${origin}${BASE}${route}`)
    expect.soft(response.status, `${BASE}${route}`).toBe(200)
    for (const url of referencedUrls(await response.text())) {
      const path = internalPath(url, origin)
      if (path === null) continue
      const clean = path.split('#')[0]?.split('?')[0] ?? ''
      expect
        .soft(
          clean === BASE || clean.startsWith(`${BASE}/`),
          `${route} references ${url} outside ${BASE}`,
        )
        .toBe(true)
      if (!statusByPath.has(clean)) {
        const target = await fetch(`${origin}${clean}`, { redirect: 'manual' })
        statusByPath.set(clean, target.status)
      }
      const status = statusByPath.get(clean) ?? 0
      expect.soft(status >= 200 && status < 400, `${route} → ${url} responded ${status}`).toBe(true)
    }
  }
}

test.describe('deployment sub-path (ADR-023)', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(360_000)

  test.beforeAll(async () => {
    test.setTimeout(360_000)
    execSync('pnpm build:static', {
      env: { ...process.env, ASTRO_OUT_DIR: STATIC_DIR, SITE_URL: `${STATIC_ORIGIN}${BASE}` },
      stdio: 'pipe',
    })
    execSync('pnpm build:server', {
      env: { ...process.env, ASTRO_OUT_DIR: SERVER_DIR, SITE_URL: `${SERVER_ORIGIN}${BASE}` },
      stdio: 'pipe',
    })
    staticServer = spawn(
      'node',
      ['scripts/serve-dist.mjs', STATIC_DIR, String(STATIC_PORT), BASE],
      {
        stdio: 'pipe',
      },
    )
    nodeServer = spawn('node', [`${SERVER_DIR}/server/entry.mjs`], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: String(SERVER_PORT) },
      stdio: 'pipe',
    })
    await waitFor(`${STATIC_ORIGIN}${BASE}/`)
    await waitFor(`${SERVER_ORIGIN}${BASE}/`)
  })

  test.afterAll(() => {
    staticServer?.kill()
    nodeServer?.kill()
  })

  test('static build: every route serves under the base and links only inside it', async () => {
    await crawlUnderBase(STATIC_ORIGIN)
  })

  test('server mode: same routes, same containment, real redirects carry the base', async () => {
    await crawlUnderBase(SERVER_ORIGIN)
    for (const { route, target } of discoverRedirects(STATIC_DIR)) {
      const response = await fetch(`${SERVER_ORIGIN}${BASE}${route}`, { redirect: 'manual' })
      expect.soft(response.headers.get('location'), `${route} Location`).toBe(target)
      expect.soft(target.startsWith(`${BASE}/`), `${route} target ${target}`).toBe(true)
    }
  })

  test('search results (pagefind) link under the base', async ({ page }) => {
    const post = discoverRoutes(STATIC_DIR).find(
      (route) => /\/blog\/[^/]+\/$/.test(route) && !/\/blog\/(tag|category)\//.test(route),
    )
    test.skip(post === undefined, 'no blog posts in this content')
    const html = readFileSync(join(STATIC_DIR, post ?? '', 'index.html'), 'utf8')
    const title = /<title>([^<·]+)/.exec(html)?.[1]?.trim() ?? ''
    const word = title.split(/\s+/).find((w) => /^[\p{L}\p{N}]{4,}$/u.test(w)) ?? title
    await page.goto(`${STATIC_ORIGIN}${BASE}/search/`)
    await page.locator('input').first().fill(word)
    const first = page.locator('main li a').first()
    await expect(first).toBeVisible({ timeout: 15_000 })
    await expect(first).toHaveAttribute('href', new RegExp(`^${BASE}/`))
    await first.click()
    await expect(page).toHaveURL(new RegExp(`^${STATIC_ORIGIN}${BASE}/`))
    await expect(page.locator('h1').first()).toBeVisible()
  })
})

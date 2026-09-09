import { execSync, spawn, type ChildProcess } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { DUAL_SERVER, DUAL_STATIC } from './lib/paths'
import { discoverRedirects, discoverRoutes } from './lib/routes'

// Constraint 2 / ADR-003: both runtime modes must emit identical HTML for the
// same content. Static pages come from the static build under .offprint/; server
// pages from a running node-adapter process fed the same content directory.
// EVERY discovered HTML route is compared (content-agnostic — the list grows
// with the instance's content instead of naming sample slugs).

const PORT = 4599
const BASE = `http://127.0.0.1:${PORT}`

let server: ChildProcess

function normalize(html: string): string {
  return html.replace(/\s+/g, ' ').replace(/> </g, '><').trim()
}

test.describe('dual-mode HTML parity', () => {
  test.describe.configure({ mode: 'serial' })
  test.setTimeout(240_000)

  // Hooks do not inherit the describe-level setTimeout; without this the two
  // builds below can trip Playwright's default 30s hook budget.
  test.beforeAll(async () => {
    test.setTimeout(240_000)
    execSync('pnpm build:static', {
      env: { ...process.env, ASTRO_OUT_DIR: DUAL_STATIC },
      stdio: 'pipe',
    })
    execSync('pnpm build:server', {
      env: { ...process.env, ASTRO_OUT_DIR: DUAL_SERVER },
      stdio: 'pipe',
    })
    server = spawn('node', [`${DUAL_SERVER}/server/entry.mjs`], {
      env: { ...process.env, HOST: '127.0.0.1', PORT: String(PORT) },
      stdio: 'pipe',
    })
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetch(BASE + '/')
        if (response.ok) break
      } catch {
        /* not up yet */
      }
      if (attempt > 50) throw new Error('server-mode process did not become ready')
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  })

  test.afterAll(() => {
    server?.kill()
  })

  test('static and server render identical HTML for every route', async () => {
    const routes = discoverRoutes(DUAL_STATIC)
    expect(routes.length).toBeGreaterThan(0)

    for (const route of routes) {
      const staticHtml = await readFile(join(DUAL_STATIC, route, 'index.html'), 'utf8')
      const response = await fetch(BASE + route)
      expect.soft(response.status, `${route} status`).toBe(200)
      const serverHtml = await response.text()
      expect.soft(normalize(serverHtml), route).toBe(normalize(staticHtml))
    }
  })

  test('redirects agree across modes: meta-refresh target = server Location', async () => {
    for (const { route, target } of discoverRedirects(DUAL_STATIC)) {
      const response = await fetch(BASE + route, { redirect: 'manual' })
      expect.soft(response.status, `${route} status`).toBeGreaterThanOrEqual(300)
      expect.soft(response.status, `${route} status`).toBeLessThan(400)
      expect.soft(response.headers.get('location'), route).toBe(target)
    }
  })
})

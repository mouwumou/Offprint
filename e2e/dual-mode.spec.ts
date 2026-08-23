import { execSync, spawn, type ChildProcess } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

// Constraint 2 / ADR-003: both runtime modes must emit identical HTML for the
// same content. Static pages come from the dist-static build output; server
// pages from a running node-adapter process fed the same content directory.

const ROUTES = [
  '/',
  '/zh/',
  '/about/',
  '/blog/',
  '/blog/tag/geometry/',
  '/blog/geometry-of-uncertainty/',
  '/zh/blog/publishing-from-notion/',
]
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
      env: { ...process.env, ASTRO_OUT_DIR: 'dist-static' },
      stdio: 'pipe',
    })
    execSync('pnpm build:server', {
      env: { ...process.env, ASTRO_OUT_DIR: 'dist-server' },
      stdio: 'pipe',
    })
    server = spawn('node', ['dist-server/server/entry.mjs'], {
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

  for (const route of ROUTES) {
    test(`static and server render identical HTML for ${route}`, async () => {
      const staticHtml = await readFile(`dist-static${route}index.html`, 'utf8')
      const response = await fetch(BASE + route)
      expect(response.status).toBe(200)
      const serverHtml = await response.text()
      expect(normalize(serverHtml)).toBe(normalize(staticHtml))
    })
  }
})

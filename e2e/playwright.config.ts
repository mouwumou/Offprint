import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { E2E_DIST } from './lib/paths'

// Lives in e2e/ with the specs; paths below are relative to this file, the
// webServer runs from the repo root.
const root = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig({
  testDir: '.',
  outputDir: '../.offprint/e2e/results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    // Dedicated port so orphaned `pnpm preview` (4321) never collides.
    baseURL: 'http://localhost:4331',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // Not `astro preview`: it daemonizes/short-circuits when any instance is
    // already running, so Playwright never owns the process. Dedicated outDir
    // keeps e2e independent of whatever state dist/ is in.
    command: `cross-env ASTRO_OUT_DIR=${E2E_DIST} pnpm build:static && node scripts/serve-dist.mjs ${E2E_DIST} 4331`,
    cwd: root,
    port: 4331,
    reuseExistingServer: !process.env.CI,
  },
})

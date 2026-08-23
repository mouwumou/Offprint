import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
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
    // already running, so Playwright never owns the process.
    command: 'pnpm build:static && node scripts/serve-dist.mjs dist 4331',
    port: 4331,
    reuseExistingServer: !process.env.CI,
  },
})

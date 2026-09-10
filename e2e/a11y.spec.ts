import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { loadSiteConfig } from '../src/core/config/load'
import { discoverRoutes, sampleRoutes } from './lib/routes'
import { E2E_DIST } from './lib/paths'

const siteConfig = loadSiteConfig()

// Axe audit over one representative page per URL shape, discovered
// from the build output (content-agnostic; every language and page type is
// covered whatever the instance's content). Serious and critical violations
// fail the suite.
test('axe: no serious or critical violations on any page type', async ({ page }) => {
  test.setTimeout(180_000)
  const routes = sampleRoutes(discoverRoutes(E2E_DIST), siteConfig.i18n.locales)
  expect(routes.length).toBeGreaterThan(0)

  for (const route of routes) {
    await page.goto(route)
    const results = await new AxeBuilder({ page }).analyze()
    const severe = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    )
    expect
      .soft(
        severe.map((violation) => ({
          route,
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.slice(0, 3).map((node) => node.html.slice(0, 120)),
        })),
        route,
      )
      .toEqual([])
  }
})

import { expect, test } from '@playwright/test'
import siteConfig from '../site.config'
import { selfLabel } from '../src/core/i18n'
import { discoverRoutes, sampleRoutes } from './lib/routes'

// Audit regression: at 375px the inline nav once forced pages to 791px wide.
test.use({ viewport: { width: 375, height: 812 } })

test('no horizontal overflow at 375px on any page type', async ({ page }) => {
  test.setTimeout(120_000)
  const routes = sampleRoutes(discoverRoutes('dist-e2e'), siteConfig.i18n.locales)
  for (const route of routes) {
    await page.goto(route)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect.soft(scrollWidth, route).toBeLessThanOrEqual(375)
  }
})

test('the disclosure drawer carries the nav and language switcher', async ({ page }) => {
  await page.goto('/')
  const drawer = page.locator('header details')
  const links = drawer.locator('a')

  await expect(links.first()).not.toBeVisible()
  await drawer.locator('summary').click()
  await expect(links.first()).toBeVisible()

  const otherLang = siteConfig.i18n.locales.find((locale) => locale !== siteConfig.i18n.default)
  if (otherLang !== undefined && siteConfig.header.languageSwitcher) {
    await expect(
      drawer.getByRole('link', { name: selfLabel(otherLang), exact: true }),
    ).toBeVisible()
  }

  // The first drawer entry navigates (nav links come before the switcher).
  const target = await links.first().getAttribute('href')
  await links.first().click()
  await expect(page).toHaveURL(
    new RegExp(`${(target ?? '/').replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}/?$`),
  )
})

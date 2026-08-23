import { expect, test } from '@playwright/test'

// Audit regression: at 375px the inline nav forced the page to 791px wide.
test.use({ viewport: { width: 375, height: 812 } })

const routes = ['/', '/blog/', '/blog/geometry-of-uncertainty/', '/zh/', '/cv/']

test('no horizontal overflow at 375px', async ({ page }) => {
  for (const route of routes) {
    await page.goto(route)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, route).toBeLessThanOrEqual(375)
  }
})

test('the disclosure drawer carries the nav and language switcher', async ({ page }) => {
  await page.goto('/')
  const drawer = page.locator('header details')
  const writing = drawer.getByRole('link', { name: 'Writing' })

  await expect(writing).not.toBeVisible()
  await drawer.locator('summary').click()
  await expect(writing).toBeVisible()
  await expect(drawer.getByRole('link', { name: '中', exact: true })).toBeVisible()

  await writing.click()
  await expect(page).toHaveURL(/\/blog\/?$/)
})

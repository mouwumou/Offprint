import { expect, test } from '@playwright/test'

test('homepage renders', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Offprint')
})

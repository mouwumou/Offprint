import { expect, test } from '@playwright/test'

test('homepage renders the profile hero', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toHaveText('Mara Ellison Voss')
})

test('zh homepage renders localized sections', async ({ page }) => {
  await page.goto('/zh')
  await expect(page.locator('h1')).toHaveText('Mara Ellison Voss')
  await expect(page.getByRole('heading', { name: '代表作' })).toBeVisible()
})

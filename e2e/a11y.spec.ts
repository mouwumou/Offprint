import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// P3-9: axe audit over the key page types in both languages. Serious and
// critical violations fail the suite.
const PAGES = [
  '/',
  '/zh/',
  '/blog/',
  '/blog/geometry-of-uncertainty/',
  '/zh/blog/publishing-from-notion/',
  '/publications/',
  '/publications/voss2025geometry/',
  '/projects/',
  '/cv/',
  '/search/',
  '/about/',
]

for (const path of PAGES) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page }).analyze()
    const severe = results.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    )
    expect(
      severe.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.slice(0, 3).map((node) => node.html.slice(0, 120)),
      })),
    ).toEqual([])
  })
}

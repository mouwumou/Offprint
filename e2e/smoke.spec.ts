import { expect, test } from '@playwright/test'
import siteConfig from '../site.config'
import { resolveLocalized } from '../src/core/schema/localized'

// Content-agnostic smoke: expectations come from site.config, the same
// source of truth the pages render from — no sample-content strings.
const defaultLang = siteConfig.i18n.default
const otherLang = siteConfig.i18n.locales.find((locale) => locale !== defaultLang)
const name = (lang: string) => resolveLocalized(siteConfig.profile.name, lang, defaultLang) ?? ''

test('homepage renders the profile hero with site chrome', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', defaultLang)
  await expect(page.locator('h1')).toHaveText(name(defaultLang))
  await expect(page.locator('header nav')).toBeVisible()
  if (siteConfig.footer.enabled) await expect(page.locator('footer')).toBeVisible()
})

test('non-default language home is localized', async ({ page }) => {
  test.skip(otherLang === undefined, 'single-language site')
  await page.goto(`/${otherLang}`)
  await expect(page.locator('html')).toHaveAttribute('lang', otherLang ?? '')
  await expect(page.locator('h1')).toHaveText(name(otherLang ?? defaultLang))
})

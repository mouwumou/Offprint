import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import YAML from 'yaml'
import { loadSiteConfig } from '../src/core/config/load'
import { resolveLocalized } from '../src/core/schema/localized'
import { parseProfile } from '../src/core/schema/profile'

const siteConfig = loadSiteConfig()
// The author's name is content (content/profile.yaml), read the
// same way the site does — no sample-content strings in the test.
const profile = parseProfile(YAML.parse(readFileSync('content/profile.yaml', 'utf8')))

// Content-agnostic smoke: expectations come from site.yaml and profile.yaml,
// the same sources of truth the pages render from.
const defaultLang = siteConfig.i18n.default
const otherLang = siteConfig.i18n.locales.find((locale) => locale !== defaultLang)
const name = (lang: string) => resolveLocalized(profile.name, lang, defaultLang) ?? ''

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

test('CV page carries the author name from content/profile.yaml', async ({ page }) => {
  const cv = siteConfig.modules.cv
  test.skip(!cv.enabled || cv.pdf !== undefined, 'no HTML CV page on this site')
  await page.goto('/cv/')
  await expect(page.locator('main')).toContainText(name(defaultLang))
})

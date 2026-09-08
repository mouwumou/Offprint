import type { APIRoute } from 'astro'
import { basePath } from '../core/config/base'
import siteConfig from '../core/config/current'
import { contentHref } from '../core/content/asset-url'

// Crawlers read robots.txt at the ORIGIN root, so this matters for a root
// deployment (custom domain, user.github.io); under a sub-path it is emitted
// for completeness. Points at the sitemap index both modes serve and lists
// the i18n.noindex locales as Disallow (belt and braces with the meta tag).
export const GET: APIRoute = ({ site }) => {
  const base = basePath()
  const sitemap = new URL(`${base}/sitemap-index.xml`, site ?? 'https://example.com')
  const disallow = siteConfig.i18n.noindex.map((locale) => `Disallow: ${base}/${locale}/`)
  const cv = siteConfig.modules.cv
  if (cv.pdf !== undefined && cv.indexable === false)
    disallow.push(`Disallow: ${contentHref(cv.pdf)}`)
  const rules = ['User-agent: *', 'Allow: /', ...disallow].join('\n')
  return new Response(`${rules}\n\nSitemap: ${sitemap.toString()}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

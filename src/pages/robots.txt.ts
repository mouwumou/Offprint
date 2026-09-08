import type { APIRoute } from 'astro'
import { basePath } from '../core/config/base'

// Crawlers read robots.txt at the ORIGIN root, so this matters for a root
// deployment (custom domain, user.github.io); under a sub-path it is emitted
// for completeness. Points at the sitemap index both modes serve.
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL(`${basePath()}/sitemap-index.xml`, site ?? 'https://example.com')
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap.toString()}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

import type { APIRoute } from 'astro'
import siteConfig from '../../config/current'
import { json } from '../guard'
import { searchContent } from '../search-index'

/** GET /api/search?q=…&lang=… (server mode). */
export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q')?.trim() ?? ''
  const lang = url.searchParams.get('lang') ?? siteConfig.i18n.default
  if (query.length === 0) return json({ results: [] })
  if (!siteConfig.i18n.locales.includes(lang)) return json({ error: 'unknown lang' }, 400)
  return json({ results: await searchContent(query, lang) })
}

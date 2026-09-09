import type { APIRoute } from 'astro'
import siteConfig from '../../../../core/config/current'
import { getProvider } from '../../../../core/content'
import { formatDate } from '../../../../core/i18n'
import { renderOgImage } from '../../../../core/seo/og-image'

export async function getStaticPaths() {
  if (!siteConfig.modules.blog.enabled) return []
  const posts = await getProvider().listPosts()
  return posts.map((post) => ({
    params: {
      lang: post.lang === siteConfig.i18n.default ? undefined : post.lang,
      urlname: post.urlname,
    },
  }))
}

// Server-mode cache keyed by route, VALUE carries the content version and is
// replaced on mismatch — so the map is bounded at posts×langs instead of
// accumulating a fresh PNG per version roll (which happens on every sync).
const cache = new Map<string, { version: string; png: Buffer }>()

export const GET: APIRoute = async ({ params }) => {
  const lang = params['lang'] ?? siteConfig.i18n.default
  const urlname = params['urlname'] ?? ''
  // The default language lives at the root; /en/blog/x/og.png must not 200
  // (mirrors the HTML route, avoids a duplicate URL).
  if (
    !siteConfig.modules.blog.enabled ||
    !siteConfig.i18n.locales.includes(lang) ||
    params['lang'] === siteConfig.i18n.default
  ) {
    return new Response(null, { status: 404 })
  }
  const post = await getProvider().getPost(urlname, lang)
  if (!post || post.draft) return new Response(null, { status: 404 })

  const key = `${lang}:${urlname}`
  const version = await getProvider().version()
  let hit = cache.get(key)
  if (hit === undefined || hit.version !== version) {
    const png = await renderOgImage(
      { title: post.title, kicker: post.categories[0], date: formatDate(post.date, lang), lang },
      await getProvider().getProfile(),
    )
    hit = { version, png }
    cache.set(key, hit)
  }
  return new Response(new Uint8Array(hit.png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

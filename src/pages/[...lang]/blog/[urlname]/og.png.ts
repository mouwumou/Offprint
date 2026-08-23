import type { APIRoute } from 'astro'
import siteConfig from '../../../../core/config/current'
import { getProvider } from '../../../../core/content'
import { formatDate } from '../../../../core/i18n'
import { renderOgImage } from '../../../../core/seo/og-image'

export async function getStaticPaths() {
  if (!siteConfig.modules.blog) return []
  const posts = await getProvider().listPosts()
  return posts.map((post) => ({
    params: {
      lang: post.lang === siteConfig.i18n.default ? undefined : post.lang,
      urlname: post.urlname,
    },
  }))
}

// Server-mode cache: content version + route → png.
const cache = new Map<string, Buffer>()

export const GET: APIRoute = async ({ params }) => {
  const lang = params['lang'] ?? siteConfig.i18n.default
  const urlname = params['urlname'] ?? ''
  if (!siteConfig.modules.blog || !siteConfig.i18n.locales.includes(lang)) {
    return new Response(null, { status: 404 })
  }
  const post = await getProvider().getPost(urlname, lang)
  if (!post || post.draft) return new Response(null, { status: 404 })

  const key = `${lang}:${urlname}:${await getProvider().version()}`
  let png = cache.get(key)
  if (png === undefined) {
    png = await renderOgImage({
      title: post.title,
      kicker: post.categories[0],
      date: formatDate(post.date, lang),
      lang,
    })
    cache.set(key, png)
  }
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}

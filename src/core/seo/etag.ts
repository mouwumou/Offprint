import type { APIContext } from 'astro'
import { getProvider } from '../content'

/**
 * Wrap an endpoint body with content-version ETag / 304 handling.
 * The version is the manifest hash, so any content change rolls the tag.
 * Static prerenders simply bake the headers; hosts layer their own caching.
 */
export async function versionedResponse(
  context: APIContext,
  contentType: string,
  build: () => Promise<string | null>,
): Promise<Response> {
  const etag = `"${await getProvider().version()}"`
  if (context.request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } })
  }
  const body = await build()
  if (body === null) return new Response(null, { status: 404 })
  return new Response(body, {
    headers: { 'Content-Type': contentType, ETag: etag },
  })
}

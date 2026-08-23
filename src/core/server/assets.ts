import { readFile } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'

const TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
}

/**
 * Server-mode /assets serving from CONTENT_DIR/assets (the IMAGE_PLATFORM=
 * local flow: sync writes images into the content volume and the site hosts
 * them). Static builds copy the directory into the output instead.
 */
export async function contentAssetResponse(pathname: string): Promise<Response | null> {
  if (!pathname.startsWith('/assets/')) return null
  const root = resolve(process.env['CONTENT_DIR'] ?? 'content', 'assets')
  const file = normalize(join(root, pathname.slice('/assets/'.length)))
  if (!file.startsWith(root)) return new Response(null, { status: 403 })
  try {
    const body = await readFile(file)
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    return new Response(null, { status: 404 })
  }
}

// Minimal static file server for e2e (usage: node scripts/serve-dist.mjs [dir] [port] [base]).
// With a base ('/sub') the build is mounted under that path, like a
// user.github.io/repo deployment: only <base>/… resolves (ADR-023).
// `astro preview` daemonizes / short-circuits when any instance is already
// running, which breaks Playwright's webServer ownership — this stays in the
// foreground and dies with its parent.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'

const root = resolve(process.argv[2] ?? 'dist')
const port = Number(process.argv[3] ?? 4331)
const base = (process.argv[4] ?? '').replace(/\/+$/, '')

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
}

createServer((req, res) => {
  let pathname = new URL(req.url ?? '/', 'http://localhost').pathname
  if (base !== '') {
    if (pathname !== base && !pathname.startsWith(`${base}/`)) {
      res.writeHead(404, { 'content-type': 'text/plain' })
      res.end(`outside base ${base}`)
      return
    }
    pathname = pathname.slice(base.length) || '/'
  }
  let file = normalize(join(root, decodeURIComponent(pathname)))
  if (file !== root && !file.startsWith(root + sep)) {
    res.writeHead(403)
    res.end()
    return
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
  if (!existsSync(file)) {
    // Serve the site's 404 page like GitHub Pages / most static hosts do.
    const notFound = join(root, '404.html')
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    if (existsSync(notFound)) {
      createReadStream(notFound).pipe(res)
    } else {
      res.end('Not Found')
    }
    return
  }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
}).listen(port, () => {
  console.log(`serving ${root} on http://localhost:${port}${base}`)
})

// Self-reap when the spawning process dies (Playwright's tree-kill does not
// reliably reach grandchildren through pnpm's shell chain): once orphaned we
// get re-parented and ppid changes.
const parent = process.ppid
setInterval(() => {
  if (process.ppid !== parent) process.exit(0)
}, 2000)

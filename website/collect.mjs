// Adapts docs/**/*.md for the Starlight site: one H1 becomes the frontmatter
// title, internal .md links become site routes, links that leave docs/ become
// GitHub links. Chinese pages are the root locale; docs/en/** is the English
// locale. Run before `astro build --root website` (pnpm docs:build).
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, posix, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const docsDir = join(root, 'docs')
const outDir = join(here, 'src', 'content', 'docs')
const repoBlob = 'https://github.com/mouwumou/Offprint/blob/main/'
const siteUrl = new URL(process.env.DOCS_SITE_URL ?? 'http://localhost:4321/')
const base = `${siteUrl.pathname.replace(/\/+$/, '')}/docs`

// docs-relative path → route slug (Starlight lowercases nothing by itself).
const SKIP = new Set(['README.md', 'README.zh-CN.md', 'en/README.md'])
function slugOf(docPath) {
  return docPath.replace(/\.md$/, '').toLowerCase()
}

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name !== 'dev') out.push(...walk(full))
    } else if (name.endsWith('.md')) out.push(full)
  }
  return out
}

const pages = walk(docsDir)
  .map((f) => relative(docsDir, f).split('\\').join('/'))
  .filter((p) => !SKIP.has(p))
const known = new Set(pages)

function rewriteLink(target, fromDocPath) {
  if (/^(?:[a-z]+:|\/\/|#)/i.test(target)) return target
  const [path, hash = ''] = target.split('#')
  const anchor = hash ? `#${hash}` : ''
  const resolved = posix.normalize(posix.join(posix.dirname(fromDocPath), path))
  if (resolved.startsWith('..')) {
    // Leaves docs/: point at the file on GitHub.
    return `${repoBlob}${posix.normalize(posix.join('docs', resolved))}${anchor}`
  }
  if (known.has(resolved)) return `${base}/${slugOf(resolved)}/${anchor}`
  if (resolved === 'README.md') return `${base}/`
  if (resolved === 'en/README.md') return `${base}/en/`
  return `${repoBlob}docs/${resolved}${anchor}`
}

function adapt(source, docPath) {
  let body = source
  let title = slugOf(docPath).split('/').pop()
  const h1 = /^# (.+)\n/m.exec(body)
  if (h1) {
    title = h1[1].trim()
    body = body.replace(h1[0], '')
  }
  body = body.replace(/\]\(([^)\s]+)\)/g, (m, t) => `](${rewriteLink(t, docPath)})`)
  const fm = `---\ntitle: ${JSON.stringify(title)}\n---\n\n`
  return fm + body.replace(/^\n+/, '')
}

rmSync(outDir, { recursive: true, force: true })
for (const p of pages) {
  const out = join(outDir, slugOf(p) + '.md')
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, adapt(readFileSync(join(docsDir, p), 'utf8'), p))
}
// Landing pages are authored in website/pages/ (not derived from docs/).
cpSync(join(here, 'pages'), outDir, { recursive: true })
console.log(`[docs] ${pages.length} pages → ${relative(root, outDir)} (base ${base})`)

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { rewriteNotionLinks, routeFor, type RouteMap } from './links'
import { normalizeDoc } from './normalize'

export interface SyncSummary {
  /** false when the run found nothing new and left content/ untouched. */
  changed?: boolean
  posts: number
  pages: number
  skipped: number
  errors: { path: string; issues: string[] }[]
}

/**
 * Normalise every raw export into staging. Errors are isolated per document.
 * Two documents that resolve to the same file (same slug and language) are a
 * content error, not a silent overwrite: the first one is kept and the second
 * is reported like any other invalid document.
 */
export async function stageDocuments(options: {
  rawDir: string
  staging: string
  defaultLang: string
  includePages: boolean
}): Promise<SyncSummary> {
  const { rawDir, staging, defaultLang, includePages } = options
  const summary: SyncSummary = { posts: 0, pages: 0, skipped: 0, errors: [] }
  await mkdir(join(staging, 'posts'), { recursive: true })
  if (includePages) await mkdir(join(staging, 'pages'), { recursive: true })

  const written = new Map<string, string>()
  const routes: RouteMap = new Map()
  for (const name of (await readdir(rawDir)).filter((file) => file.endsWith('.md')).sort()) {
    const raw = await readFile(join(rawDir, name), 'utf8')
    const normalized = normalizeDoc(raw, name, defaultLang)
    if (normalized.kind === 'skipped' || (normalized.kind === 'page' && !includePages)) {
      summary.skipped += 1
      continue
    }
    if (normalized.kind === 'invalid') {
      summary.errors.push({ path: `raw/${name}`, issues: normalized.issues })
      console.warn(`✗ ${name}: ${normalized.issues[0] ?? 'invalid'}`)
      continue
    }
    const earlier = written.get(normalized.filename)
    if (earlier !== undefined) {
      const issue = `duplicate ${normalized.filename}: same slug and language as ${earlier} — that document is kept and this one skipped; give one of them another slug in Notion`
      summary.errors.push({ path: `raw/${name}`, issues: [issue] })
      console.warn(`✗ ${name}: ${issue}`)
      continue
    }
    for (const warning of normalized.warnings) console.warn(`⚠ ${name}: ${warning}`)
    await writeFile(join(staging, normalized.filename), normalized.content)
    written.set(normalized.filename, `raw/${name}`)
    if (normalized.notionId !== undefined) {
      routes.set(
        normalized.notionId,
        routeFor(normalized.kind, normalized.slug, normalized.lang, defaultLang),
      )
    }
    summary[normalized.kind === 'post' ? 'posts' : 'pages'] += 1
  }

  // Second pass, now that every document's route is known: links between
  // Notion pages become site links. A link to a page that is not part of
  // this sync (a draft, a page outside the database) stays on Notion.
  for (const [filename, source] of written) {
    const path = join(staging, filename)
    const { markdown, unresolved } = rewriteNotionLinks(await readFile(path, 'utf8'), routes)
    if (unresolved.length > 0) {
      console.warn(
        `⚠ ${source}: ${unresolved.length} link(s) to Notion pages outside this sync kept as Notion URLs (${unresolved.join(', ')})`,
      )
    }
    if (markdown !== (await readFile(path, 'utf8'))) await writeFile(path, markdown)
  }
  return summary
}

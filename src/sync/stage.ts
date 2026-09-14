import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
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
    summary[normalized.kind === 'post' ? 'posts' : 'pages'] += 1
  }
  return summary
}

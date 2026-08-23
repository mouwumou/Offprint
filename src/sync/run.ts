import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { diffManifests, manifestSchema, type Manifest } from '../core/schema'
import { atomicSwitch } from './atomic'
import { elogConfigSource } from './elog-config'
import { buildManifest } from './manifest'
import { normalizeDoc } from './normalize'
import { notifyRevalidate } from './notify'

export interface SyncSummary {
  posts: number
  pages: number
  skipped: number
  errors: { path: string; issues: string[] }[]
}

function elogVersion(): string {
  try {
    const require = createRequire(import.meta.url)
    return (require('@elog/cli/package.json') as { version: string }).version
  } catch {
    return 'unknown'
  }
}

/**
 * One sync pass (DYNAMIC-PUBLISHING §4, without notify — that lands in P2-1):
 * elog → .staging/raw → normalize (CONTENT-CONTRACT §7.1) → per-document
 * validation (failures recorded, never blocking) → manifest → atomic switch.
 */
export async function runSync(options: {
  contentDir: string
  defaultLang: string
}): Promise<SyncSummary> {
  if (!process.env['NOTION_TOKEN'] || !process.env['NOTION_DB']) {
    throw new Error('NOTION_TOKEN and NOTION_DB must be set (see .env.example)')
  }

  const contentDir = resolve(options.contentDir)
  const staging = join(contentDir, '.staging')
  const rawDir = join(staging, 'raw')
  await rm(staging, { recursive: true, force: true })
  await mkdir(rawDir, { recursive: true })

  // The generated config must live inside the repo so its plugin imports
  // resolve against our node_modules; elog itself runs with cwd=staging so
  // its cache file stays out of the repo. pnpm exec refuses to run outside
  // the workspace, hence the explicit .bin path.
  const repoRoot = process.cwd()
  const configPath = join(repoRoot, '.offprint-elog.config.ts')
  await writeFile(configPath, elogConfigSource('raw'))
  try {
    const elogBin = join(repoRoot, 'node_modules', '.bin', 'elog')
    const result = spawnSync(elogBin, ['sync', '-c', configPath], {
      stdio: 'inherit',
      cwd: staging,
    })
    if (result.status !== 0) {
      throw new Error(`elog sync exited with ${result.status}`)
    }
  } finally {
    await rm(configPath, { force: true })
  }

  // ADR-014: sync owns content/posts only. Notion type=Page routing is an
  // explicit opt-in — by default those docs are skipped and locally edited
  // pages/ are never touched.
  const includePages = process.env['SYNC_PAGES'] === 'true'
  const summary: SyncSummary = { posts: 0, pages: 0, skipped: 0, errors: [] }
  await mkdir(join(staging, 'posts'), { recursive: true })
  if (includePages) await mkdir(join(staging, 'pages'), { recursive: true })

  for (const name of (await readdir(rawDir)).filter((file) => file.endsWith('.md')).sort()) {
    const raw = await readFile(join(rawDir, name), 'utf8')
    const normalized = normalizeDoc(raw, name, options.defaultLang)
    if (normalized.kind === 'skipped' || (normalized.kind === 'page' && !includePages)) {
      summary.skipped += 1
      continue
    }
    if (normalized.kind === 'invalid') {
      summary.errors.push({ path: `raw/${name}`, issues: normalized.issues })
      console.warn(`✗ ${name}: ${normalized.issues[0] ?? 'invalid'}`)
      continue
    }
    for (const warning of normalized.warnings) console.warn(`⚠ ${name}: ${warning}`)
    await writeFile(join(staging, normalized.filename), normalized.content)
    summary[normalized.kind === 'post' ? 'posts' : 'pages'] += 1
  }

  const manifest = await buildManifest(
    staging,
    { name: 'elog', version: elogVersion() },
    summary.errors,
  )
  // Author-owned collections (pages/ unless opted in, plus every YAML) live
  // in the content dir, not staging — merge their entries so the manifest
  // describes the whole content state (ADR-014).
  const liveManifest = await buildManifest(contentDir, manifest.tool)
  for (const [key, entry] of Object.entries(liveManifest.entries)) {
    if (key.startsWith('posts/')) continue
    if (includePages && key.startsWith('pages/')) continue
    manifest.entries[key] = entry
  }

  // Previous manifest → diff for targeted revalidation (P2-1 notify).
  let previous: Manifest | null = null
  try {
    previous = manifestSchema.parse(
      JSON.parse(await readFile(join(contentDir, 'manifest.json'), 'utf8')),
    )
  } catch {
    /* first sync or hand-written content without a manifest */
  }

  await atomicSwitch(contentDir, staging, includePages ? ['posts', 'pages'] : ['posts'], manifest)
  await rm(staging, { recursive: true, force: true })

  const diff = diffManifests(previous, manifest)
  await notifyRevalidate([...diff.added, ...diff.changed, ...diff.removed])
  return summary
}

import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { diffManifests, manifestSchema, type Manifest } from '../core/schema'
import { atomicSwitch } from './atomic'
import { elogConfigSource } from './elog-config'
import { materializeImages } from './images'
import { acquireSyncLock } from './lock'
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
 * One sync pass (docs/DYNAMIC-PUBLISHING.md §4):
 * elog → .staging/raw → normalize (docs/CONTENT-CONTRACT.md §7.1) → per-document
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
  await mkdir(contentDir, { recursive: true })
  // Webhook-triggered syncs (site container) and the sidecar loop share the
  // content volume — serialize across processes, not just in-process.
  const releaseLock = await acquireSyncLock(contentDir)
  const staging = join(contentDir, '.staging')
  try {
    return await syncPass(contentDir, staging, options.defaultLang)
  } finally {
    // Release the lock even if staging cleanup throws (EBUSY/EACCES would
    // otherwise lock out syncs for STALE_MS).
    try {
      await rm(staging, { recursive: true, force: true })
    } finally {
      await releaseLock()
    }
  }
}

async function syncPass(
  contentDir: string,
  staging: string,
  defaultLang: string,
): Promise<SyncSummary> {
  const rawDir = join(staging, 'raw')
  await rm(staging, { recursive: true, force: true })
  await mkdir(rawDir, { recursive: true })

  // The generated config must live inside the repo so its plugin imports
  // resolve against our node_modules; elog itself runs with cwd=staging so
  // its cache file stays out of the repo. pnpm exec refuses to run outside
  // the workspace, hence the explicit .bin path.
  const repoRoot = process.cwd()
  const scratch = join(repoRoot, '.offprint')
  await mkdir(scratch, { recursive: true })
  const configPath = join(scratch, 'elog.config.ts')
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

  // Sync owns content/posts only. Notion type=Page routing is an
  // explicit opt-in — by default those docs are skipped and locally edited
  // pages/ are never touched.
  const includePages = process.env['SYNC_PAGES'] === 'true'
  const summary: SyncSummary = { posts: 0, pages: 0, skipped: 0, errors: [] }
  await mkdir(join(staging, 'posts'), { recursive: true })
  if (includePages) await mkdir(join(staging, 'pages'), { recursive: true })

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
    for (const warning of normalized.warnings) console.warn(`⚠ ${name}: ${warning}`)
    await writeFile(join(staging, normalized.filename), normalized.content)
    summary[normalized.kind === 'post' ? 'posts' : 'pages'] += 1
  }

  // Notion's signed image URLs expire — materialize them into content/assets
  // and rewrite the staged markdown before the manifest hashes it.
  const images = await materializeImages({
    stagingDir: staging,
    contentDir,
    collections: includePages ? ['posts', 'pages'] : ['posts'],
  })
  if (images.downloaded + images.reused + images.failed > 0) {
    console.log(
      `images: ${images.downloaded} downloaded, ${images.reused} reused, ${images.failed} failed`,
    )
  }

  const manifest = await buildManifest(
    staging,
    { name: 'elog', version: elogVersion() },
    summary.errors,
  )
  // Author-owned collections (pages/ unless opted in, plus every YAML) live
  // in the content dir, not staging — merge their entries so the manifest
  // describes the whole content state.
  const liveManifest = await buildManifest(contentDir, manifest.tool)
  for (const [key, entry] of Object.entries(liveManifest.entries)) {
    if (key.startsWith('posts/')) continue
    if (includePages && key.startsWith('pages/')) continue
    manifest.entries[key] = entry
  }

  // Previous manifest → diff for targeted revalidation (notify).
  let previous: Manifest | null = null
  try {
    previous = manifestSchema.parse(
      JSON.parse(await readFile(join(contentDir, 'manifest.json'), 'utf8')),
    )
  } catch {
    /* first sync or hand-written content without a manifest */
  }

  await atomicSwitch(contentDir, staging, includePages ? ['posts', 'pages'] : ['posts'], manifest)

  const diff = diffManifests(previous, manifest)
  const changed = [...diff.added, ...diff.changed, ...diff.removed]
  // An empty diff must NOT notify: notifyRevalidate([]) posts {} which the
  // endpoint reads as "revalidate everything" — the inverse of intent.
  if (changed.length > 0) await notifyRevalidate(changed)
  return summary
}

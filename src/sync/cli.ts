// offprint-sync CLI: `pnpm sync [validate|manifest]` (docs/DYNAMIC-PUBLISHING.md §4).
import { readFile, writeFile } from 'node:fs/promises'

// .env for local runs; explicitly exported variables take precedence.
try {
  process.loadEnvFile()
} catch {
  /* no .env present (CI passes real env) */
}
import { join, resolve } from 'node:path'
import { manifestSchema, type Manifest } from '../core/schema'
import { buildManifest, sameContent } from './manifest'
import { runSync } from './run'
import { validateContent } from './validate'

const contentDir = resolve(process.env['CONTENT_DIR'] ?? 'content')
const defaultLang = process.env['DEFAULT_LANG'] ?? 'en'
const command = process.argv[2] ?? 'sync'

switch (command) {
  case 'sync': {
    const summary = await runSync({ contentDir, defaultLang })
    console.log(
      `synced ${summary.posts} post(s), ${summary.pages} page(s); ` +
        `skipped ${summary.skipped}; ${summary.errors.length} error(s)`,
    )
    if (summary.changed === false) console.log('no changes — nothing written')
    if (summary.errors.length > 0) process.exitCode = 0 // errors recorded, not fatal
    break
  }
  case 'validate': {
    const problems = await validateContent(contentDir)
    for (const problem of problems) {
      console.error(`✗ ${problem.path}`)
      for (const issue of problem.issues) console.error(`  ${issue}`)
    }
    if (problems.length > 0) {
      console.error(`${problems.length} file(s) failed validation`)
      process.exitCode = 1
    } else {
      console.log('content/ is valid')
    }
    break
  }
  case 'manifest': {
    // Hand-written content support (docs/CONTENT-CONTRACT.md §1).
    let previous: Manifest | null = null
    try {
      previous = manifestSchema.parse(
        JSON.parse(await readFile(join(contentDir, 'manifest.json'), 'utf8')),
      )
    } catch {
      /* none yet */
    }
    const manifest = await buildManifest(
      contentDir,
      { name: 'offprint-sync', version: '0.0.0' },
      [],
      previous,
    )
    if (sameContent(previous, manifest)) {
      console.log('manifest.json unchanged')
      break
    }
    await writeFile(join(contentDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    console.log(`manifest.json written (${Object.keys(manifest.entries).length} entries)`)
    break
  }
  default:
    console.error(`unknown command: ${command} (expected sync | validate | manifest)`)
    process.exitCode = 1
}

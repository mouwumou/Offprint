// offprint-sync CLI: `pnpm sync [validate|manifest]` (DYNAMIC-PUBLISHING §4).
import { writeFile } from 'node:fs/promises'

// .env for local runs; explicitly exported variables take precedence.
try {
  process.loadEnvFile()
} catch {
  /* no .env present (CI passes real env) */
}
import { join, resolve } from 'node:path'
import { buildManifest } from './manifest'
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
    if (summary.errors.length > 0) process.exitCode = 0 // errors recorded, not fatal (§4)
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
    // Hand-written content support (CONTENT-CONTRACT §1).
    const manifest = await buildManifest(contentDir, { name: 'offprint-sync', version: '0.0.0' })
    await writeFile(join(contentDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
    console.log(`manifest.json written (${Object.keys(manifest.entries).length} entries)`)
    break
  }
  default:
    console.error(`unknown command: ${command} (expected sync | validate | manifest)`)
    process.exitCode = 1
}

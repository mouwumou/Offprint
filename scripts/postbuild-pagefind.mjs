// Static-mode search index (P2-9): run pagefind over the build output.
// Server mode uses the MiniSearch /api/search endpoint instead.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const outDir = process.env.ASTRO_OUT_DIR ?? 'dist'
// modules.blog.search: false (or blog off) builds no search page — then no
// index either, so the output ships nothing search-related.
if (!existsSync(join(outDir, 'search', 'index.html'))) {
  console.log('[pagefind] no search page in the build (search disabled) — skipping the index')
  process.exit(0)
}
const bin = join(process.cwd(), 'node_modules', '.bin', 'pagefind')
const result = spawnSync(bin, ['--site', outDir], { stdio: 'inherit' })
process.exit(result.status ?? 1)

// Static-mode search index (P2-9): run pagefind over the build output.
// Server mode uses the MiniSearch /api/search endpoint instead.
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const outDir = process.env.ASTRO_OUT_DIR ?? 'dist'
const bin = join(process.cwd(), 'node_modules', '.bin', 'pagefind')
const result = spawnSync(bin, ['--site', outDir], { stdio: 'inherit' })
process.exit(result.status ?? 1)

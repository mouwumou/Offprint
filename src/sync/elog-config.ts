// elog 1.0 plugin-workflow config, generated at sync time from environment
// variables (docs/DYNAMIC-PUBLISHING.md §4) — a token-bearing config never lives in
// the repository. Raw export lands in the staging dir for normalization.
// NOTE: @elog/plugin-to-local joins outputDir onto process.cwd() even when
// absolute — always pass a RELATIVE dir and run elog with cwd=staging.

export function elogConfigSource(rawDir: string): string {
  return `import { defineConfig } from '@elog/cli'
import notion from '@elog/plugin-from-notion'
import toLocal from '@elog/plugin-to-local'

export default defineConfig({
  from: notion({
    token: process.env.NOTION_TOKEN,
    databaseId: process.env.NOTION_DB,
    filter: { property: 'status', select: { equals: 'Published' } },
  }),
  to: toLocal({
    outputDir: ${JSON.stringify(rawDir)},
    // NotionNext databases carry slug; normalization derives urlname later.
    filename: 'slug',
    frontMatter: { enable: true },
  }),
})
`
}

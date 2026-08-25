// Regenerates the JSON Schemas that give site.yaml and content/home.yaml
// editor autocompletion, hover docs, and live squiggles (ADR-021) — the
// yaml-language-server header comment in each file points here. Run after
// changing any config zod schema:  pnpm gen:schema
// The outputs are committed so a fresh clone has completion immediately.
import { mkdirSync, writeFileSync } from 'node:fs'
import { z } from 'zod'
import { buildSiteConfigSchema, homeSchema } from '../src/core/config/schema'

function emit(path: string, schema: z.ZodType, description: string): void {
  const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' })
  const payload = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: description,
    ...json,
  }
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`wrote ${path}`)
}

mkdirSync('schema', { recursive: true })
// site.yaml must not contain `home` (it lives in content/home.yaml).
emit(
  'schema/site-config.schema.json',
  buildSiteConfigSchema().omit({ home: true }),
  'Offprint site.yaml',
)
emit('schema/home.schema.json', homeSchema, 'Offprint content/home.yaml')

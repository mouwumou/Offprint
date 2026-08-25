// Regenerates the JSON Schemas that give site.yaml and content/home.yaml
// editor autocompletion, hover docs, and live squiggles (ADR-021) — the
// yaml-language-server header comment in each file points here. Run after
// changing any config zod schema:  pnpm gen:schema
// The outputs are committed so a fresh clone has completion immediately.
import { mkdirSync, writeFileSync } from 'node:fs'
import { z } from 'zod'
import { buildSiteConfigSchema, homeSchema } from '../src/core/config/schema'
import { listThemes, resolveTheme } from '../src/core/theme/resolve'

/** Editor completion for theme.options: the union of every installed
 * theme's declared options (build-time validation stays exact per active
 * theme; the schema only serves completion — ADR-022). */
function themeOptionsProperties(): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  for (const name of listThemes()) {
    const { manifest } = resolveTheme(name)
    for (const [key, decl] of Object.entries(manifest.options)) {
      properties[key] = {
        type: decl.type,
        ...(decl.enum ? { enum: decl.enum } : {}),
        ...(decl.default !== undefined ? { default: decl.default } : {}),
        description: `[theme: ${name}] ${decl.description ?? ''}`.trim(),
      }
    }
  }
  return properties
}

function emit(path: string, schema: z.ZodType, description: string): void {
  const json = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as {
    properties?: Record<string, { properties?: Record<string, unknown> }>
  }
  const themeNode = json.properties?.['theme']
  if (themeNode?.properties?.['options'] !== undefined) {
    themeNode.properties['options'] = {
      type: 'object',
      description: '当前主题声明的选项（构建时按启用主题精确校验）',
      properties: themeOptionsProperties(),
      additionalProperties: true,
    }
  }
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

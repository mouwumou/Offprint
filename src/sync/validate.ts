import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'
import YAML from 'yaml'
import { z } from 'zod'
import {
  pageFrontmatterSchema,
  postFrontmatterSchema,
  projectsFileSchema,
  publicationsFileSchema,
  resumeSchema,
} from '../core/schema'

export interface ValidationIssue {
  path: string
  issues: string[]
}

async function listMarkdown(root: string, dir: string): Promise<string[]> {
  try {
    return (await readdir(join(root, dir))).filter((name) => name.endsWith('.md')).sort()
  } catch {
    return []
  }
}

/**
 * `pnpm sync validate` — schema-check everything under the content dir
 * (the schema is the validation). Returns per-file issues; the CLI turns them into a
 * non-zero exit for CI (the CI content-validation step).
 */
export async function validateContent(root: string): Promise<ValidationIssue[]> {
  const problems: ValidationIssue[] = []

  const markdownChecks = [
    {
      dir: 'posts',
      schema: postFrontmatterSchema,
      filename: (d: { urlname: string; lang: string }) => `${d.urlname}.${d.lang}.md`,
    },
    {
      dir: 'pages',
      schema: pageFrontmatterSchema,
      filename: (d: { slug: string; lang: string }) => `${d.slug}.${d.lang}.md`,
    },
  ] as const

  for (const check of markdownChecks) {
    for (const name of await listMarkdown(root, check.dir)) {
      const path = `${check.dir}/${name}`
      try {
        const { data } = matter(await readFile(join(root, path), 'utf8'))
        const result = check.schema.safeParse(data)
        if (!result.success) {
          problems.push({ path, issues: z.prettifyError(result.error).split('\n') })
          continue
        }
        const expected = check.filename(result.data as never)
        if (expected !== name) {
          problems.push({ path, issues: [`front-matter implies filename ${expected}`] })
        }
      } catch (error) {
        problems.push({ path, issues: [String(error)] })
      }
    }
  }

  const yamlChecks = [
    { file: 'publications.yaml', schema: publicationsFileSchema },
    { file: 'projects.yaml', schema: projectsFileSchema },
    { file: 'cv.yaml', schema: resumeSchema },
  ] as const

  for (const check of yamlChecks) {
    let raw: string
    try {
      raw = await readFile(join(root, check.file), 'utf8')
    } catch {
      continue // optional collection
    }
    try {
      const result = check.schema.safeParse(YAML.parse(raw))
      if (!result.success) {
        problems.push({ path: check.file, issues: z.prettifyError(result.error).split('\n') })
      }
    } catch (error) {
      problems.push({ path: check.file, issues: [String(error)] })
    }
  }

  return problems
}

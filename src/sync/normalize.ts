import matter from 'gray-matter'
import { z } from 'zod'
import { pageFrontmatterSchema, postFrontmatterSchema } from '../core/schema'
import { detectLang } from './lang-detect'

// docs/CONTENT-CONTRACT.md §7.1: the observed differences between a real (NotionNext-
// style) elog export and the contract, resolved here. Every step is
// deliberately tool-tolerant: missing columns are derived, never
// fatal, and unknown columns pass through.

export type NormalizeResult =
  | {
      kind: 'post' | 'page'
      /** posts/<urlname>.<lang>.md or pages/<slug>.<lang>.md */
      filename: string
      content: string
      warnings: string[]
    }
  | { kind: 'skipped'; reason: string }
  | { kind: 'invalid'; issues: string[] }

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toIsoDate(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'string') {
    // elog emits 'YYYY-MM-DD HH:mm:ss'; also accept plain/ISO dates.
    const match = value.match(/^(\d{4}-\d{2}-\d{2})([ T]|$)/)
    if (match) return match[1]
  }
  return undefined
}

export function normalizeDoc(
  raw: string,
  sourceName: string,
  defaultLang: string,
): NormalizeResult {
  const { data, content: body } = matter(raw)
  const warnings: string[] = []

  const type = typeof data['type'] === 'string' ? data['type'] : 'Post'
  if (type !== 'Post' && type !== 'Page') {
    return { kind: 'skipped', reason: `type=${type}` }
  }

  // Empty strings are absent values (NotionNext exports password: '' etc.).
  const fm: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === '' || value === null || value === undefined) continue
    fm[key] = value
  }
  // Filter/routing columns never reach the front-matter contract.
  delete fm['type']
  delete fm['status']

  // Column renames observed in §7.1. slug OVERRIDES urlname: elog fills
  // urlname with the Notion page UUID, the human slug lives in `slug`.
  if (typeof fm['slug'] === 'string' && /^[a-z0-9-]+$/.test(fm['slug'])) {
    fm['urlname'] = fm['slug']
  }
  delete fm['slug']
  if (fm['category'] !== undefined && fm['categories'] === undefined) {
    fm['categories'] = fm['category']
  }
  delete fm['category']
  if (fm['summary'] !== undefined && fm['description'] === undefined) {
    fm['description'] = fm['summary']
  }
  delete fm['summary']

  // Dates: normalize to YYYY-MM-DD; updated backfills from date with a warning.
  const date = toIsoDate(fm['date'])
  if (date !== undefined) fm['date'] = date
  const updated = toIsoDate(fm['updated'])
  if (updated !== undefined) {
    fm['updated'] = updated
  } else if (date !== undefined) {
    fm['updated'] = date
    warnings.push('updated missing, backfilled from date')
  }

  // urlname: a readable slug wins; elog's own value is the Notion page UUID,
  // kept only when the title cannot be slugified (e.g. pure-CJK titles until
  // the LLM transliteration step exists).
  const title = typeof fm['title'] === 'string' ? fm['title'] : ''
  let urlname = typeof fm['urlname'] === 'string' ? fm['urlname'] : ''
  const isSlug = /^[a-z0-9-]+$/.test(urlname)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(urlname)
  if (!isSlug || isUuid) {
    const fromTitle = slugify(title)
    if (fromTitle.length > 0) {
      urlname = fromTitle
      warnings.push(`urlname derived from title: ${urlname}`)
    } else if (isUuid) {
      warnings.push('kept notion uuid as urlname (title not slugifiable)')
    } else {
      return { kind: 'invalid', issues: [`no usable urlname/slug (title: ${title || sourceName})`] }
    }
  }
  fm['urlname'] = urlname

  // lang: derived when absent.
  if (typeof fm['lang'] !== 'string') {
    const detection = detectLang(`${title}\n${body}`, defaultLang)
    fm['lang'] = detection.lang
    warnings.push(
      detection.detected
        ? `lang detected as ${detection.lang}`
        : `lang defaulted to ${detection.lang}`,
    )
  }
  const lang = fm['lang'] as string

  if (type === 'Page') {
    fm['slug'] = urlname
    delete fm['urlname']
    const result = pageFrontmatterSchema.safeParse(fm)
    if (!result.success) {
      return { kind: 'invalid', issues: z.prettifyError(result.error).split('\n') }
    }
    return {
      kind: 'page',
      filename: `pages/${urlname}.${lang}.md`,
      content: matter.stringify(body, fm),
      warnings,
    }
  }

  const result = postFrontmatterSchema.safeParse(fm)
  if (!result.success) {
    return { kind: 'invalid', issues: z.prettifyError(result.error).split('\n') }
  }
  return {
    kind: 'post',
    filename: `posts/${urlname}.${lang}.md`,
    content: matter.stringify(body, fm),
    warnings,
  }
}

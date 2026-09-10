import rehypeShiki from '@shikijs/rehype'
import { toString as hastToString } from 'hast-util-to-string'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeKatex from 'rehype-katex'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import rehypeStringify from 'rehype-stringify'
import remarkDirective from 'remark-directive'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified, type Processor } from 'unified'
import { visit } from 'unist-util-visit'
import { basePath } from '../config/base'
import { rehypeCitations, type CitationRef } from './citations'
import { offprintDark, offprintLight } from './shiki-themes'

export interface TocEntry {
  depth: number
  id: string
  text: string
}

export interface RenderedMarkdown {
  html: string
  toc: TocEntry[]
  wordCount: number
  readingTimeMinutes: number
  /** Drives conditional KaTeX CSS injection; front-matter `math` can override. */
  hasMath: boolean
}

// Content comes from external tools, so the generated tree is sanitized
// (docs/ARCHITECTURE.md §8) BEFORE KaTeX/Shiki run: their generated classes and inline
// styles are trusted output of our own pipeline, while everything upstream
// passes the whitelist. remark-rehype drops raw HTML already; sanitize is the
// second fence.
const sanitizeSchema: typeof defaultSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // remark-math marks nodes with math-inline / math-display.
    code: [['className', /^language-./, 'math-inline', 'math-display']],
    // Directive containers (:::note / :::theorem …) become classed divs.
    div: [
      ...(defaultSchema.attributes?.['div'] ?? []),
      ['className', /^directive/],
      'dataTitle',
      'dataDirective',
    ],
    span: [...(defaultSchema.attributes?.['span'] ?? []), ['className', /^directive/]],
  },
}

/**
 * remark plugin: map :::name{title="…"} container directives (and their
 * inline/leaf forms) onto classed elements. Styled by base.css (.prose .directive).
 */
function directivesToHtml() {
  return (tree: import('mdast').Root): void => {
    visit(tree, (node) => {
      if (
        node.type === 'containerDirective' ||
        node.type === 'leafDirective' ||
        node.type === 'textDirective'
      ) {
        const directive = node as typeof node & {
          name: string
          attributes?: Record<string, string | null | undefined>
        }
        const data = (directive.data ??= {})
        data.hName = node.type === 'textDirective' ? 'span' : 'div'
        data.hProperties = {
          className: ['directive', `directive-${directive.name}`],
          dataDirective: directive.name,
          ...(directive.attributes?.['title'] ? { dataTitle: directive.attributes['title'] } : {}),
        }
      }
    })
  }
}

export interface Stats {
  wordCount: number
  readingTimeMinutes: number
  hasMath: boolean
}

const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/g

/**
 * Word count (CJK chars count individually, latin by words), reading time
 * (200 wpm latin / 300 cpm CJK), math detection. Code blocks are excluded
 * from the prose statistics.
 */
function countProse(tree: import('mdast').Root): Stats {
  let text = ''
  let hasMath = false
  visit(tree, (node) => {
    if (node.type === 'code') return 'skip'
    if (node.type === 'math' || node.type === 'inlineMath') {
      hasMath = true
      return 'skip'
    }
    if (node.type === 'text' || node.type === 'inlineCode') {
      text += ` ${(node as { value: string }).value}`
    }
    return undefined
  })
  const cjkChars = (text.match(CJK) ?? []).length
  const latinWords = text
    .replace(CJK, ' ')
    .split(/\s+/)
    .filter((word) => /\w/.test(word)).length
  return {
    wordCount: latinWords + cjkChars,
    readingTimeMinutes: Math.max(1, Math.round(latinWords / 200 + cjkChars / 300)),
    hasMath,
  }
}

function collectStats() {
  return (tree: import('mdast').Root, file: { data: Record<string, unknown> }): void => {
    file.data['stats'] = countProse(tree)
  }
}

function createStatsParser() {
  return unified().use(remarkParse).use(remarkGfm).use(remarkMath)
}

let statsParser: ReturnType<typeof createStatsParser> | undefined

/**
 * Prose statistics without rendering — for list rows. Uses the same parser
 * extensions and counting as the full pipeline, so numbers always match the
 * post page.
 */
export function markdownStats(markdown: string): Stats {
  const parser = (statsParser ??= createStatsParser())
  return countProse(parser.parse(markdown))
}

/** rehype plugin: collect h2–h4 into file.data.toc (runs after rehype-slug). */
function collectToc() {
  return (tree: import('hast').Root, file: { data: Record<string, unknown> }): void => {
    const toc: TocEntry[] = []
    visit(tree, 'element', (node) => {
      // The GFM footnote section brings its own hidden "Footnotes" h2 (its id
      // carries sanitize's user-content- clobber prefix).
      const id = node.properties['id']
      if (/^h[2-4]$/.test(node.tagName) && typeof id === 'string' && !id.endsWith('footnote-label')) {
        toc.push({
          depth: Number(node.tagName.charAt(1)),
          id,
          text: hastToString(node),
        })
      }
    })
    file.data['toc'] = toc
  }
}

/**
 * Body links written in the contract's relative `assets/…` form resolve
 * against the page URL — under /blog/x/ they 404. Serve them from the root
 * like covers (assetUrl) already do.
 */
// Content stays deployment-agnostic: authors write `assets/x` or root-relative
// internal links, sync writes `/assets/x` (deep routes need it absolute); the
// deployment sub-path is applied here at render time, never baked into
// content.
function absolutizeAssetPaths() {
  const base = basePath()
  return (tree: import('hast').Root): void => {
    visit(tree, 'element', (node) => {
      for (const key of ['src', 'href'] as const) {
        const value = node.properties?.[key]
        if (typeof value !== 'string') continue
        if (value.startsWith('assets/')) {
          node.properties[key] = `${base}/${value}`
        } else if (base !== '' && value.startsWith('/') && !value.startsWith('//')) {
          // Author-written internal links ('/blog/x') and sync's '/assets/x'.
          node.properties[key] = `${base}${value}`
        }
      }
    })
  }
}

export interface RenderOptions {
  /** Enable [@key] citations; refs precomputed by the caller. */
  citations?: Map<string, CitationRef>
  /** Heading of the appended references section. */
  citationsLabel?: string
}

/**
 * Notion exports (elog) put soft line breaks INSIDE table cells, splitting a
 * GFM row across lines so the table never parses. Outside fenced code, a line
 * that opens a row (`|…`) but does not close it is joined with the following
 * lines until one does.
 */
export function joinBrokenTableRows(markdown: string): string {
  const out: string[] = []
  let fence: string | null = null
  let open: string | null = null
  for (const line of markdown.split('\n')) {
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line)
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1] ?? null
      else if (line.trim().startsWith(fence)) fence = null
    }
    if (fence !== null) {
      out.push(line)
      continue
    }
    const trimmed = line.trim()
    if (open !== null) {
      open = `${open} ${trimmed}`
      if (trimmed.endsWith('|') || trimmed === '') {
        out.push(open)
        open = null
      }
      continue
    }
    if (trimmed.startsWith('|') && !trimmed.endsWith('|') && trimmed.length > 1) {
      open = line
      continue
    }
    out.push(line)
  }
  if (open !== null) out.push(open)
  return out.join('\n')
}

/**
 * remark plugin: a 4-space-indented paragraph is a CommonMark "indented code
 * block", but in a Notion export it is a nested block (children of a
 * paragraph/toggle) whose bold, math and links must still render. Real code
 * always arrives fenced, so indented code nodes are re-parsed as markdown.
 */
function indentedCodeAsProse() {
  const inner = unified().use(remarkParse).use(remarkGfm).use(remarkMath)
  const reparse = (tree: import('mdast').Root | import('mdast').Parent, source: string): void => {
    for (let index = 0; index < tree.children.length; index++) {
      const node = tree.children[index]
      if (node === undefined) continue
      if (node.type === 'code' && !node.lang) {
        const start = node.position?.start.offset
        const head = start === undefined ? '' : source.slice(start, start + 3)
        if (!head.startsWith('```') && !head.startsWith('~~~')) {
          const parsed = inner.parse(node.value) as import('mdast').Root
          reparse(parsed, node.value)
          tree.children.splice(index, 1, ...parsed.children)
          index += parsed.children.length - 1
          continue
        }
      }
      if ('children' in node) reparse(node as import('mdast').Parent, source)
    }
  }
  return (tree: import('mdast').Root, file: { value: unknown }): void => {
    reparse(tree, String(file.value))
  }
}

let processor: Processor | undefined

function buildProcessor(): Processor {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(indentedCodeAsProse)
    .use(remarkDirective)
    .use(directivesToHtml)
    .use(collectStats)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(absolutizeAssetPaths)
    .use(rehypeSlug)
    .use(collectToc)
    .use(rehypeAutolinkHeadings, {
      behavior: 'append',
      properties: { className: ['heading-anchor'], ariaHidden: 'true', tabIndex: -1 },
      content: { type: 'text', value: '#' },
    })
    // Always mounted; a no-op unless vfile.data.citations is set per document.
    .use(rehypeCitations)
    .use(rehypeKatex)
    .use(rehypeShiki, {
      themes: { light: offprintLight, dark: offprintDark },
      defaultColor: 'light',
    })
    .use(rehypeStringify) as unknown as Processor
}

function getProcessor(): Processor {
  processor ??= buildProcessor()
  return processor
}

/** Markdown → HTML + TOC + prose stats (docs/ARCHITECTURE.md §5). Shared by both modes. */
export async function renderMarkdown(
  markdown: string,
  options?: RenderOptions,
): Promise<RenderedMarkdown> {
  markdown = joinBrokenTableRows(markdown)
  const file = await getProcessor().process(
    options?.citations !== undefined
      ? {
          value: markdown,
          data: {
            citations: {
              refs: options.citations,
              label: options.citationsLabel ?? 'References',
            },
          },
        }
      : markdown,
  )
  const stats = file.data['stats'] as Stats
  return {
    html: String(file),
    toc: (file.data['toc'] as TocEntry[] | undefined) ?? [],
    wordCount: stats.wordCount,
    readingTimeMinutes: stats.readingTimeMinutes,
    hasMath: stats.hasMath,
  }
}

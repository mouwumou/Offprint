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
// (ARCHITECTURE §8) BEFORE KaTeX/Shiki run: their generated classes and inline
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
    div: [...(defaultSchema.attributes?.['div'] ?? []), ['className', /^directive/], 'dataTitle'],
    span: [...(defaultSchema.attributes?.['span'] ?? []), ['className', /^directive/]],
  },
}

/**
 * remark plugin: map :::name{title="…"} container directives (and their
 * inline/leaf forms) onto classed elements. Styling lands in P3-3.
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

let processor: Processor | undefined

function getProcessor(): Processor {
  processor ??= unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDirective)
    .use(directivesToHtml)
    .use(collectStats)
    .use(remarkRehype)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeSlug)
    .use(collectToc)
    .use(rehypeAutolinkHeadings, {
      behavior: 'append',
      properties: { className: ['heading-anchor'], ariaHidden: 'true', tabIndex: -1 },
      content: { type: 'text', value: '#' },
    })
    .use(rehypeKatex)
    .use(rehypeShiki, {
      themes: { light: offprintLight, dark: offprintDark },
      defaultColor: 'light',
    })
    .use(rehypeStringify) as unknown as Processor
  return processor
}

/** Markdown → HTML + TOC + prose stats (ARCHITECTURE §5). Shared by both modes. */
export async function renderMarkdown(markdown: string): Promise<RenderedMarkdown> {
  const file = await getProcessor().process(markdown)
  const stats = file.data['stats'] as Stats
  return {
    html: String(file),
    toc: (file.data['toc'] as TocEntry[] | undefined) ?? [],
    wordCount: stats.wordCount,
    readingTimeMinutes: stats.readingTimeMinutes,
    hasMath: stats.hasMath,
  }
}

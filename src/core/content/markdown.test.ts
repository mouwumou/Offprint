import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown'

describe('katex version alignment', () => {
  // The page links the CSS of our direct katex dependency, while rehype-katex
  // emits HTML with its own katex. If the two resolve to different installs,
  // class names drift apart (0.16 strut/base vs 0.18 katex-strut/katex-base)
  // and formula layout collapses silently. Keep them deduped to one copy.
  it('rehype-katex renders with the same katex install whose CSS we ship', () => {
    const rootRequire = createRequire(import.meta.url)
    const rehypeKatexRequire = createRequire(rootRequire.resolve('rehype-katex'))
    expect(rehypeKatexRequire.resolve('katex/dist/katex.min.css')).toBe(
      rootRequire.resolve('katex/dist/katex.min.css'),
    )
  })
})

const fixture = `## Setting the stage

Some *prose* with a [link](https://example.com) and a footnote.[^1]

Inline math $e^{i\\pi} + 1 = 0$ and display math:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
$$

### A table

| left | right |
| ---- | ----- |
| a    | 1     |

\`\`\`ts
// a comment
const answer: number = 42
console.log(\`answer: \${answer}\`)
\`\`\`

:::note{title="Aside"}
Directives become classed divs.
:::

> A quotation.

[^1]: The footnote text.
`

describe('renderMarkdown', () => {
  // First render pays Shiki's theme/grammar init (~2s idle, >5s under load).
  it('renders the full fixture to stable HTML', { timeout: 20_000 }, async () => {
    const result = await renderMarkdown(fixture)
    expect(result.html).toMatchSnapshot()
  })

  it('collects a TOC from h2–h4 with slug ids', async () => {
    const result = await renderMarkdown(fixture)
    expect(result.toc).toEqual([
      { depth: 2, id: 'setting-the-stage', text: 'Setting the stage' },
      { depth: 3, id: 'a-table', text: 'A table' },
    ])
  })

  it('renders KaTeX on the server and reports hasMath', async () => {
    const result = await renderMarkdown(fixture)
    expect(result.hasMath).toBe(true)
    expect(result.html).toContain('class="katex"')
    expect(result.html).not.toContain('$$')

    const plain = await renderMarkdown('Just prose, no formulas.')
    expect(plain.hasMath).toBe(false)
  })

  it('highlights code with the dual offprint themes', async () => {
    const result = await renderMarkdown(fixture)
    expect(result.html).toContain('--shiki-dark')
    // keyword color (claret) from the custom light theme (shiki upcases hex)
    expect(result.html).toMatch(/#6f2232/i)
  })

  it('turns directives into classed divs carrying their title', async () => {
    const result = await renderMarkdown(fixture)
    expect(result.html).toContain('directive-note')
    expect(result.html).toContain('data-title="Aside"')
  })

  it('counts latin words and CJK characters, with a floor of one minute', async () => {
    const latin = await renderMarkdown('one two three four five')
    expect(latin.wordCount).toBe(5)
    expect(latin.readingTimeMinutes).toBe(1)

    const zh = await renderMarkdown('抽印本是一个学术个人网站系统。')
    expect(zh.wordCount).toBe(14)
  })

  it('strips raw HTML and dangerous URLs (sanitize fence)', async () => {
    const result = await renderMarkdown(
      'before\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\nafter',
    )
    expect(result.html).not.toContain('<script')
    expect(result.html).not.toContain('javascript:')
  })

  it('renders GFM tables, task lists, and footnotes', async () => {
    const result = await renderMarkdown(fixture)
    expect(result.html).toContain('<table>')
    expect(result.html).toContain('data-footnotes')
  })
})

describe('citations (P3-2)', () => {
  it('links [@key] to the references section and appends entries in use order', async () => {
    const refs = new Map([
      ['a2025', { key: 'a2025', inline: '(Ada, 2025)', entry: 'Ada, A. (2025). Work.' }],
      ['b2024', { key: 'b2024', inline: '(Bob, 2024)', entry: 'Bob, B. (2024). Other.' }],
    ])
    const result = await renderMarkdown('Cites [@b2024] then [@a2025; @b2024], not `[@a2025]`.', {
      citations: refs,
      citationsLabel: 'References',
      cacheKey: 'test',
    })
    expect(result.html).toContain('<a href="#ref-b2024">(Bob, 2024)</a>')
    expect(result.html).toContain('(Ada, 2025)</a>; <a href="#ref-b2024">')
    expect(result.html).toContain('<h2 id="references">References</h2>')
    // use order: b2024 first
    expect(result.html.indexOf('id="ref-b2024"')).toBeLessThan(result.html.indexOf('id="ref-a2025"'))
    // code spans untouched
    expect(result.html).toContain('[@a2025]</code>')
  })

  it('leaves unknown keys literal and skips the section when nothing is cited', async () => {
    const refs = new Map()
    const result = await renderMarkdown('An unknown [@nope] citation.', {
      citations: refs,
      citationsLabel: 'References',
      cacheKey: 'test2',
    })
    expect(result.html).toContain('[@nope]')
    expect(result.html).not.toContain('id="references"')
  })
})

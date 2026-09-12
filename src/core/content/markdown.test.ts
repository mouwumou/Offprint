import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { joinBrokenTableRows, renderMarkdown } from './markdown'

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

    const zh = await renderMarkdown('这个站是一个学术个人网站系统。')
    expect(zh.wordCount).toBe(14)
  })

  it('strips raw HTML and dangerous URLs (sanitize fence)', async () => {
    const result = await renderMarkdown(
      'before\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\nafter',
    )
    expect(result.html).not.toContain('<script')
    expect(result.html).not.toContain('javascript:')
  })

  it('absolutizes relative assets/ links so deep routes resolve them', async () => {
    const result = await renderMarkdown('![cover](assets/foo.png) and [data](assets/data.pdf)')
    expect(result.html).toContain('src="/assets/foo.png"')
    expect(result.html).toContain('href="/assets/data.pdf"')
    const absolute = await renderMarkdown('![x](https://example.com/assets/keep.png)')
    expect(absolute.html).toContain('https://example.com/assets/keep.png')
  })

  it('renders GFM tables, task lists, and footnotes', async () => {
    const result = await renderMarkdown(fixture)
    expect(result.html).toContain('<table>')
    expect(result.html).toContain('data-footnotes')
  })
})

describe('citations', () => {
  it('links [@key] to the references section and appends entries in use order', async () => {
    const refs = new Map([
      ['a2025', { key: 'a2025', inline: '(Ada, 2025)', entry: 'Ada, A. (2025). Work.' }],
      ['b2024', { key: 'b2024', inline: '(Bob, 2024)', entry: 'Bob, B. (2024). Other.' }],
    ])
    const result = await renderMarkdown('Cites [@b2024] then [@a2025; @b2024], not `[@a2025]`.', {
      citations: refs,
      citationsLabel: 'References',
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
    })
    expect(result.html).toContain('[@nope]')
    expect(result.html).not.toContain('id="references"')
  })

  it('never reuses one document\'s refs for the next (audit regression)', async () => {
    // Same lang + content version → the old processor cache baked the first
    // post's private references in and served them to the second.
    const first = await renderMarkdown('See [@mine].', {
      citations: new Map([
        ['mine', { key: 'mine', inline: '(Mine, 2025)', entry: 'Mine (2025).' }],
      ]),
      citationsLabel: 'References',
    })
    expect(first.html).toContain('(Mine, 2025)')

    const second = await renderMarkdown('See [@mine] and [@other].', {
      citations: new Map([
        ['other', { key: 'other', inline: '(Other, 2024)', entry: 'Other (2024).' }],
      ]),
      citationsLabel: 'References',
    })
    expect(second.html).toContain('(Other, 2024)')
    expect(second.html).not.toContain('(Mine, 2025)')
    expect(second.html).toContain('[@mine]')

    // And a document without citations renders through the same processor.
    const plain = await renderMarkdown('No citations at [@all] here.')
    expect(plain.html).toContain('[@all]')
    expect(plain.html).not.toContain('id="references"')
  })
})

describe('Notion export tolerance', () => {
  it('renders 4-space-indented paragraphs as prose, not code', async () => {
    const md = 'Intro paragraph.\n\n    第一，**高频词不一定重要**。公式 $k_1$ 在此。\n\n    第二段。\n'
    const { html } = await renderMarkdown(md)
    expect(html).toContain('<strong>高频词不一定重要</strong>')
    expect(html).toContain('katex')
    expect(html).not.toContain('<pre>')
  })

  it('keeps fenced code blocks as code', async () => {
    const { html } = await renderMarkdown('```\n**not bold**\n```\n')
    expect(html).toContain('<pre')
    expect(html).not.toContain('<strong>')
  })

  it('joins table rows that a cell line break split apart', async () => {
    const md = '| $n_{layer}$ | 层数\nnumber of layers |\n| --- | --- |\n| $d_{model}$ | 残差流\ndimension |\n'
    expect(joinBrokenTableRows(md)).toBe('| $n_{layer}$ | 层数 number of layers |\n| --- | --- |\n| $d_{model}$ | 残差流 dimension |\n')
    const { html } = await renderMarkdown(md)
    expect(html).toContain('<table>')
    expect(html).toContain('层数 number of layers')
  })

  it('leaves pipes inside fenced code alone', () => {
    const md = '```\n| a\n| b\n```\n'
    expect(joinBrokenTableRows(md)).toBe(md)
  })
})

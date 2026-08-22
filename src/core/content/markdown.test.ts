import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown'

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
  it('renders the full fixture to stable HTML', async () => {
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

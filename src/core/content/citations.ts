import type { Element, Root, Text } from 'hast'
import { visit } from 'unist-util-visit'

export interface CitationRef {
  key: string
  /** In-text label, e.g. (Voss et al., 2025). */
  inline: string
  /** Reference-list entry (APA text). */
  entry: string
}

const PATTERN = /\[@([a-zA-Z0-9-]+)(?:;\s*@[a-zA-Z0-9-]+)*\]/g

function span(children: (Element | Text)[]): Element {
  return { type: 'element', tagName: 'span', properties: { className: ['citation'] }, children }
}

export interface CitationContext {
  refs: Map<string, CitationRef>
  label: string
}

/**
 * rehype plugin (P3-2): replace pandoc-style [@key] / [@a; @b] citations with
 * linked in-text labels and append a references section for the keys actually
 * used. All strings are precomputed server-side (citation-js), the plugin is
 * pure tree surgery. The refs arrive per document on vfile.data — baking
 * them into the plugin (and thus the cached processor) leaked one post's
 * private references into the next.
 */
export function rehypeCitations() {
  return (tree: Root, file: { data: Record<string, unknown> }): void => {
    const options = file.data['citations'] as CitationContext | undefined
    if (options === undefined) return
    const used: CitationRef[] = []
    const use = (key: string): CitationRef | undefined => {
      const ref = options.refs.get(key)
      if (ref && !used.some((entry) => entry.key === key)) used.push(ref)
      return ref
    }

    visit(tree, 'text', (node: Text, index, parent) => {
      if (parent === undefined || index === undefined || parent.type !== 'element') return
      if (parent.tagName === 'code' || parent.tagName === 'pre') return
      const value = node.value
      if (!PATTERN.test(value)) {
        PATTERN.lastIndex = 0
        return
      }
      PATTERN.lastIndex = 0

      const out: (Element | Text)[] = []
      let cursor = 0
      for (const match of value.matchAll(PATTERN)) {
        const start = match.index
        if (start > cursor) out.push({ type: 'text', value: value.slice(cursor, start) })
        const keys = [...match[0].matchAll(/@([a-zA-Z0-9-]+)/g)].map((m) => m[1] as string)
        const links: (Element | Text)[] = []
        for (const [i, key] of keys.entries()) {
          const ref = use(key)
          if (i > 0) links.push({ type: 'text', value: '; ' })
          if (ref) {
            links.push({
              type: 'element',
              tagName: 'a',
              properties: { href: `#ref-${key}` },
              children: [{ type: 'text', value: ref.inline }],
            })
          } else {
            links.push({ type: 'text', value: `[@${key}]` })
          }
        }
        out.push(span(links))
        cursor = start + match[0].length
      }
      if (cursor < value.length) out.push({ type: 'text', value: value.slice(cursor) })
      parent.children.splice(index, 1, ...out)
      return index + out.length
    })

    if (used.length === 0) return
    tree.children.push(
      {
        type: 'element',
        tagName: 'section',
        properties: { className: ['references'] },
        children: [
          {
            type: 'element',
            tagName: 'h2',
            properties: { id: 'references' },
            children: [{ type: 'text', value: options.label }],
          },
          {
            type: 'element',
            tagName: 'ol',
            properties: {},
            children: used.map((ref) => ({
              type: 'element',
              tagName: 'li',
              properties: { id: `ref-${ref.key}` },
              children: [{ type: 'text', value: ref.entry }],
            })),
          },
        ],
      } satisfies Element,
    )
  }
}

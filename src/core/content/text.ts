/**
 * Rough markdown → plain text, for search excerpts and meta descriptions.
 * Drops what is noise in a one-line summary (code, math, images, list and
 * table punctuation, directives, footnote marks) and keeps link text.
 */
export function plainText(markdown: string): string {
  return (
    markdown
      .replace(/```[\s\S]*?```/g, ' ')
      // Math renders as KaTeX on the page; in a summary it is just source noise.
      .replace(/\$\$[\s\S]*?\$\$/g, ' ')
      .replace(/\$[^$\n]+\$/g, ' ')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[\^[^\]]+\]/g, '')
      .replace(/<[^>\n]+>/g, ' ')
      .replace(/^:{3,}[^\n]*$/gm, ' ')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, '')
      .replace(/^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/gm, ' ')
      .replace(/\|/g, ' ')
      .replace(/[*_>~]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

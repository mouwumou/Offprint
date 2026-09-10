export interface AuthorSegment {
  name: string
  /** True when the name matches one of profile.nameVariants — render bold. */
  self: boolean
}

function normalize(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase()
}

/** Mark the site owner in a byline for highlighting (docs/CONTENT-CONTRACT.md §3). */
export function markAuthors(authors: readonly string[], variants: readonly string[]): AuthorSegment[] {
  const own = new Set(variants.map(normalize))
  return authors.map((name) => ({ name, self: own.has(normalize(name)) }))
}

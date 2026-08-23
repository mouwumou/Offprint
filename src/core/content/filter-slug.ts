/**
 * URL segment for a tag/category filter route (/blog/tag/<slug>). Filter
 * state lives in the path, not a query string: a static build cannot vary on
 * queries, and ADR-003 demands both modes render one URL identically.
 * Unicode (中文 tags) passes through — URLs encode it transparently.
 */
export function filterSlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-')
}

/** Find the original tag/category a URL segment refers to. */
export function fromFilterSlug(values: readonly string[], slug: string): string | undefined {
  return values.find((value) => filterSlug(value) === slug)
}

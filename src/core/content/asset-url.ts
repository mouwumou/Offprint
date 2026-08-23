/** Contract covers are either absolute URLs or assets/ paths served at /assets. */
export function assetUrl(source: string): string {
  return source.startsWith('assets/') ? `/${source}` : source
}

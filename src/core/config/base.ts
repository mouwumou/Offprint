/**
 * Deployment sub-path support (ADR-023). A site served under a path —
 * `https://user.github.io/repo/` — needs every internal URL prefixed with
 * that path. There is ONE source: SITE_URL's pathname. astro.config derives
 * Astro's `base` from it; Astro then bakes the value into
 * import.meta.env.BASE_URL in every bundle (pages, islands, server runtime);
 * this module normalises it to '' (origin root) or '/repo' (no trailing
 * slash) so `${basePath()}/blog` composes without double slashes.
 */

/** Sub-path of an absolute site URL: '' for the root, '/repo' otherwise. */
export function basePathFromSiteUrl(siteUrl: string): string {
  let url: URL
  try {
    url = new URL(siteUrl)
  } catch {
    throw new Error(`SITE_URL must be an absolute URL (got "${siteUrl}")`)
  }
  return normalizeBase(url.pathname)
}

/** '' for '/' (or empty), otherwise the path without trailing slashes. */
export function normalizeBase(raw: string): string {
  return raw.replace(/\/+$/, '')
}

/**
 * Root-relative internal hrefs ('/blog/x') get the sub-path; anything else
 * (absolute URLs, protocol-relative, mailto:, '#anchor', relative) passes
 * through. Apply exactly once, at the boundary where CONTENT-authored values
 * (news links, profile links, YAML fields) become rendered hrefs.
 */
export function withBase(href: string): string {
  return href.startsWith('/') && !href.startsWith('//') ? `${basePath()}${href}` : href
}

/** The build's sub-path, normalised; '' when deployed at the origin root. */
export function basePath(): string {
  // Exact `import.meta.env.BASE_URL` on purpose: Vite replaces that
  // expression with the literal at build time. Touching the env OBJECT
  // instead made Astro inline the whole env table into the client bundle —
  // including build-mode keys — so the island hashes, and with them the
  // HTML, differed between static and server builds (dual-mode parity).
  try {
    return normalizeBase(import.meta.env.BASE_URL)
  } catch {
    // Plain Node (astro.config, integration hooks): no import.meta.env.
    return ''
  }
}

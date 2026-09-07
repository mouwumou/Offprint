import { basePath, withBase } from '../config/base'

/**
 * A content-authored URL as it must be rendered (ADR-023): `assets/x` is
 * served at <base>/assets/x; a root-relative internal link gets the
 * deployment sub-path; absolute URLs, mailto:, anchors pass through. Content
 * never carries the sub-path itself — it stays portable between deployments.
 */
export function contentHref(source: string): string {
  return source.startsWith('assets/') ? `${basePath()}/${source}` : withBase(source)
}

/** Covers/thumbnails: same rule, older name kept for its call sites. */
export const assetUrl = contentHref

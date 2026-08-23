// KaTeX styles inlined (removes a render-blocking request) with
// font-display:swap injected — math text paints in fallback instead of
// blocking LCP for seconds on throttled connections (P3-9).
import raw from 'katex/dist/katex.min.css?inline'

export const katexCss: string = raw.replaceAll('@font-face{', '@font-face{font-display:swap;')

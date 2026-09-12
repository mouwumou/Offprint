import type { SiteConfig } from '../config/schema'

export interface AnalyticsScript {
  src: string
  attrs: Record<string, string | boolean>
}

/** The <script> tags a site.yaml `analytics` block asks for, in order. */
export function analyticsScripts(analytics: SiteConfig['analytics']): AnalyticsScript[] {
  const out: AnalyticsScript[] = []
  if (analytics.umami) {
    out.push({
      src: analytics.umami.src,
      attrs: { defer: true, 'data-website-id': analytics.umami.websiteId },
    })
  }
  if (analytics.plausible) {
    out.push({
      src: analytics.plausible.src,
      attrs: { defer: true, 'data-domain': analytics.plausible.domain },
    })
  }
  if (analytics.goatcounter) {
    out.push({
      src: analytics.goatcounter.src,
      attrs: {
        async: true,
        'data-goatcounter': `https://${analytics.goatcounter.code}.goatcounter.com/count`,
      },
    })
  }
  return out
}

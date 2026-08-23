// Hand-rolled RSS 2.0 / Atom / JSON Feed builders — three small templates
// beat a dependency. Endpoints call these in both runtime modes (static:
// prerendered files; server: per request, P2-8 adds ETags).

export interface FeedItem {
  title: string
  url: string
  date: Date
  description?: string | undefined
  categories?: string[]
}

export interface FeedMeta {
  title: string
  description: string
  siteUrl: string
  feedUrl: string
  lang: string
}

function escapeXml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function buildRss(meta: FeedMeta, items: FeedItem[]): string {
  const entries = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
      <pubDate>${item.date.toUTCString()}</pubDate>${
        item.description ? `\n      <description>${escapeXml(item.description)}</description>` : ''
      }${(item.categories ?? []).map((c) => `\n      <category>${escapeXml(c)}</category>`).join('')}
    </item>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(meta.title)}</title>
    <link>${escapeXml(meta.siteUrl)}</link>
    <description>${escapeXml(meta.description)}</description>
    <language>${escapeXml(meta.lang)}</language>
    <atom:link href="${escapeXml(meta.feedUrl)}" rel="self" type="application/rss+xml"/>
${entries}
  </channel>
</rss>
`
}

export function buildAtom(meta: FeedMeta, items: FeedItem[]): string {
  const updated = items[0]?.date ?? new Date(0)
  const entries = items
    .map(
      (item) => `  <entry>
    <title>${escapeXml(item.title)}</title>
    <link href="${escapeXml(item.url)}"/>
    <id>${escapeXml(item.url)}</id>
    <updated>${item.date.toISOString()}</updated>${
      item.description ? `\n    <summary>${escapeXml(item.description)}</summary>` : ''
    }
  </entry>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${escapeXml(meta.lang)}">
  <title>${escapeXml(meta.title)}</title>
  <subtitle>${escapeXml(meta.description)}</subtitle>
  <link href="${escapeXml(meta.siteUrl)}"/>
  <link href="${escapeXml(meta.feedUrl)}" rel="self"/>
  <id>${escapeXml(meta.siteUrl)}</id>
  <updated>${updated.toISOString()}</updated>
${entries}
</feed>
`
}

export function buildJsonFeed(meta: FeedMeta, items: FeedItem[]): string {
  return `${JSON.stringify(
    {
      version: 'https://jsonfeed.org/version/1.1',
      title: meta.title,
      description: meta.description,
      home_page_url: meta.siteUrl,
      feed_url: meta.feedUrl,
      language: meta.lang,
      items: items.map((item) => ({
        id: item.url,
        url: item.url,
        title: item.title,
        date_published: item.date.toISOString(),
        ...(item.description ? { summary: item.description } : {}),
        ...(item.categories?.length ? { tags: item.categories } : {}),
      })),
    },
    null,
    2,
  )}\n`
}

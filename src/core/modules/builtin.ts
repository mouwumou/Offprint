import { z } from 'zod'
import { moduleToggleWith, moduleToggleWithColophon, registerModule } from './registry'

// The five built-in modules, registered on first import (config/schema.ts
// imports this file for its side effect). Their routes remain file-based
// under src/pages, gated on modules.<id>.enabled; third-party module routes
// go through the integration's injectRoute (ADR-019, P5-1e).

registerModule({
  id: 'blog',
  configSchema: moduleToggleWithColophon,
  enabledByDefault: true,
  nav: { path: '/blog', labelKey: 'nav.writing' },
  copy: { titleKey: 'blog.title', descriptionKey: 'blog.description' },
  collections: ['posts'],
})

registerModule({
  id: 'pages',
  enabledByDefault: true,
  // Standalone pages join the nav individually (nav:true front matter),
  // not as a module landing link.
  nav: null,
  collections: ['pages'],
})

registerModule({
  id: 'publications',
  // Newest year first always; `order` decides the sequence inside a year:
  // file (as curated in publications.yaml), key, or title.
  configSchema: moduleToggleWith({ order: z.enum(['file', 'key', 'title']).optional() }),
  enabledByDefault: true,
  nav: { path: '/publications', labelKey: 'nav.publications' },
  copy: { titleKey: 'pub.title', descriptionKey: 'pub.description' },
  collections: ['publications.yaml'],
})

registerModule({
  id: 'projects',
  enabledByDefault: true,
  nav: { path: '/projects', labelKey: 'nav.projects' },
  copy: { titleKey: 'projects.title', descriptionKey: 'projects.description' },
  collections: ['projects.yaml'],
})

registerModule({
  id: 'news',
  enabledByDefault: true,
  // Homepage section only in v1 — no archive route, no nav entry.
  nav: null,
  collections: ['news.yaml'],
})

registerModule({
  id: 'cv',
  // cv: { pdf: assets/cv.pdf } links the nav straight to the file and drops
  // the HTML page; indexable: false keeps crawlers off it via robots.txt.
  configSchema: moduleToggleWith({
    pdf: z.string().min(1).optional(),
    indexable: z.boolean().optional(),
  }),
  enabledByDefault: true,
  nav: { path: '/cv', labelKey: 'nav.cv' },
  copy: { titleKey: 'cv.title' },
  collections: ['cv.yaml'],
})

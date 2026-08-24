import { moduleToggleWithColophon, registerModule } from './registry'

// The five built-in modules, registered on first import (config/schema.ts
// imports this file for its side effect). Their routes remain file-based
// under src/pages, gated on modules.<id>.enabled; third-party module routes
// go through the integration's injectRoute (ADR-019, P5-1e).

registerModule({
  id: 'blog',
  configSchema: moduleToggleWithColophon,
  enabledByDefault: true,
  nav: { path: '/blog', labelKey: 'nav.writing' },
  copy: { title: 'blog.title', description: 'blog.description' },
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
  enabledByDefault: true,
  nav: { path: '/publications', labelKey: 'nav.publications' },
  copy: { title: 'pub.title', description: 'pub.description' },
  collections: ['publications.yaml'],
})

registerModule({
  id: 'projects',
  enabledByDefault: true,
  nav: { path: '/projects', labelKey: 'nav.projects' },
  copy: { title: 'projects.title', description: 'projects.description' },
  collections: ['projects.yaml'],
})

registerModule({
  id: 'cv',
  enabledByDefault: true,
  nav: { path: '/cv', labelKey: 'nav.cv' },
  copy: { title: 'cv.title' },
  collections: ['cv.yaml'],
})

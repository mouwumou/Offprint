// Lighthouse CI thresholds (docs/ARCHITECTURE.md §6: ≥ 95). Runs against the static
// build output; `pnpm lhci` locally (after an e2e run builds .offprint/e2e/dist) or the
// CI job. The URL list is discovered from the build (deep tests are
// content-agnostic) — the root, each top-level index, and one collection
// entry per top-level section.
/* eslint-disable @typescript-eslint/no-require-imports -- lhci loads this file as CommonJS */
const { readdirSync, readFileSync, statSync, existsSync } = require('node:fs')
const { join } = require('node:path')
const { homedir } = require('node:os')

const path = require('node:path')
// Absolute so lhci's cwd never matters; the e2e run builds this directory.
const DIST = path.resolve(__dirname, '..', '.offprint/e2e/dist')

// Point chrome-launcher at Playwright's Linux Chromium. Under WSL it would
// otherwise launch the WINDOWS Chrome, whose DevTools port lives on the
// Windows side — unreachable from WSL in NAT networking mode (and Windows
// Chrome cannot interpret our /tmp profile path either). The Linux binary
// shares our network namespace and matches the CI runners.
if (!process.env.CHROME_PATH) {
  const cache = join(homedir(), '.cache', 'ms-playwright')
  if (existsSync(cache)) {
    const dir = readdirSync(cache)
      .filter((name) => /^chromium-\d+$/.test(name))
      .sort()
      .pop()
    const candidate =
      dir &&
      ['chrome-linux64', 'chrome-linux']
        .map((sub) => join(cache, dir, sub, 'chrome'))
        .find((path) => existsSync(path))
    if (candidate && existsSync(candidate)) process.env.CHROME_PATH = candidate
  }
}

function discoverUrls() {
  if (!existsSync(DIST)) return ['http://localhost/index.html']
  const routes = []
  const walk = (dir, prefix) => {
    for (const name of readdirSync(dir)) {
      if (prefix === '/' && name === 'pagefind') continue
      const path = join(dir, name)
      if (statSync(path).isDirectory()) walk(path, `${prefix}${name}/`)
      else if (name === 'index.html') {
        // Skip the meta-refresh stubs redirects.yaml builds into.
        const head = readFileSync(path, 'utf8').slice(0, 512)
        if (!head.includes('http-equiv="refresh"')) routes.push(prefix)
      }
    }
  }
  walk(DIST, '/')
  routes.sort()

  const picked = new Set(['/'])
  for (const route of routes) {
    const segments = route.split('/').filter(Boolean)
    const hasChildren = routes.some((other) => other !== route && other.startsWith(route))
    // Section indexes (blog/, publications/, a language root) — standalone
    // top-level pages share the article layout a deep entry already covers.
    if (segments.length === 1 && hasChildren) picked.add(route)
  }
  // One deep entry per top-level section (e.g. a post, a publication).
  const deepSeen = new Set()
  for (const route of routes) {
    const segments = route.split('/').filter(Boolean)
    if (segments.length === 2 && !deepSeen.has(segments[0])) {
      deepSeen.add(segments[0])
      picked.add(route)
    }
  }
  return [...picked].sort().map((route) => `http://localhost${route}index.html`)
}

module.exports = {
  ci: {
    collect: {
      staticDistDir: DIST,
      url: discoverUrls(),
      numberOfRuns: 3,
      settings: {
        // Desktop preset: the emulated-mobile lab is too noisy for a hard CI
        // gate (same page swings 1.4-3.1s FCP run to run); the metrics that
        // matter (TBT 0ms, CLS ~0, no blocking requests) hold on mobile too.
        preset: 'desktop',
        // chrome-launcher on WSL otherwise creates a literal 'C:\Users\…'
        // profile dir inside the repo — pin it to the system tmpdir.
        // --no-sandbox: GitHub's ubuntu-24.04 runners restrict unprivileged user
        // namespaces (AppArmor), so Chromium's sandbox cannot start there; the
        // page under test is our own build output. --disable-dev-shm-usage: the
        // runner's /dev/shm is small. Both are inert on a developer machine.
        chromeFlags:
          '--headless=new --no-sandbox --disable-dev-shm-usage --user-data-dir=/tmp/lhci-chrome-profile',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: path.resolve(__dirname, '..', '.offprint/lighthouse/reports'),
    },
  },
}

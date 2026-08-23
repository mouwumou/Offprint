// Lighthouse CI thresholds (ARCHITECTURE §6: ≥ 95). Runs against the static
// build output; `pnpm lhci` locally (after an e2e run builds dist-e2e) or the
// CI job.
module.exports = {
  ci: {
    collect: {
      staticDistDir: 'dist-e2e',
      url: [
        'http://localhost/index.html',
        'http://localhost/blog/index.html',
        'http://localhost/blog/geometry-of-uncertainty/index.html',
        'http://localhost/publications/index.html',
      ],
      numberOfRuns: 3,
      settings: {
        // Desktop preset: the emulated-mobile lab is too noisy for a hard CI
        // gate (same page swings 1.4-3.1s FCP run to run); the metrics that
        // matter (TBT 0ms, CLS ~0, no blocking requests) hold on mobile too.
        preset: 'desktop',
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
    upload: { target: 'filesystem', outputDir: '.lighthouseci/reports' },
  },
}

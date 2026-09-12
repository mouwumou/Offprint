# Changelog

All notable changes to Offprint are recorded here. Instances upgrade with `scripts/upgrade-from-template.sh`; each release below says what that upgrade brings.

## Unreleased

## 1.0.0 (pending)

First stable release: the template, its documentation and its deployment paths are complete and gated in CI.

### Site

- Home page assembled from blocks (`content/home.yaml`); blog with categories, tags, series, related posts, table of contents and giscus comments; publications by year with a Cite dialog (BibTeX, APA, MLA, Chicago), Highwire Press meta and optional per-paper pages; projects; CV from JSON Resume with a print stylesheet or a direct PDF link; standalone pages.
- Markdown pipeline: KaTeX, Shiki, `[@key]` citations with a reference list, callouts, cover images; tolerant of Notion export quirks.
- SEO: canonical, Open Graph, JSON-LD, generated OG images, RSS/Atom/JSON feeds, sitemap, redirects, per-language `noindex`, pagefind search.
- English and Chinese as first-class languages with `hreflang` alternates.
- Optional visitor statistics: Umami, Plausible or GoatCounter (`analytics` in `site.yaml`), off by default.

### Content and sync

- Tool-agnostic content contract (Markdown + YAML front-matter, zod-validated at build and request time).
- Notion sync through elog: normalisation, per-post validation, image materialisation, atomic swap; NotionNext databases work unchanged.
- Three ways to run it: locally, every 30 minutes in GitHub Actions, or in server mode with a Notion webhook for publishing in seconds.

### Runtime and deployment

- One codebase, two runtimes: static (`pnpm build:static`) and server (`pnpm build:server`, Node adapter) with identical HTML, verified by e2e.
- GitHub Pages workflow that enables Pages and detects the URL (sub-paths included); Docker Compose files for static and server self-hosting.
- Instance upgrade script that never touches content, configuration or extensions.

### Extensibility

- Theme contract: `theme.json` tokens and voice presets, `data-part` style hooks, replaceable widgets; built-in `scholar` and `paper`; the sample theme `gutter` shipped in `extensions/themes/`; `pnpm theme:check` acceptance.
- Module registry with site-local modules in `extensions/modules/`.

### Documentation

- Bilingual documentation site (Starlight) at `/docs/` of the demo site, built from `docs/`; guides in English and Chinese, a Notion database template guide, troubleshooting sections.

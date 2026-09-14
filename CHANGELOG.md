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
- Three ways to run it: locally, hourly in GitHub Actions (a one-query pre-check skips quiet hours), or in server mode with a Notion webhook for publishing in seconds.

### Runtime and deployment

- One codebase, two runtimes: static (`pnpm build:static`) and server (`pnpm build:server`, Node adapter) with identical HTML, verified by e2e.
- GitHub Pages workflow that enables Pages and detects the URL (sub-paths included); Docker Compose files for static and server self-hosting.
- Instance upgrade script that never touches content, configuration or extensions.

### Extensibility

- Theme contract: `theme.json` tokens and voice presets, `data-part` style hooks, replaceable widgets; built-in `scholar` and `paper`; the sample theme `gutter` shipped in `extensions/themes/`; `pnpm theme:check` acceptance.
- Module registry with site-local modules in `extensions/modules/`.

### Documentation

- Bilingual documentation site (Starlight) at `/docs/` of the demo site, built from `docs/`; guides in English and Chinese, a Notion database template guide, troubleshooting sections.

### Fixed (pre-release audit)

- Sync: two Notion documents resolving to the same slug and language are reported as an error and the first is kept, instead of the second silently overwriting it.
- Server mode: the webhook endpoint reads its body as a stream and stops at 64 KiB, so requests without `Content-Length` can no longer buffer past the cap.
- Server mode: a hand-written site with no posts and no manifest (blog switched off) is ready immediately instead of serving the "syncing" page forever.
- Docker: container start seeds `pages/` and the YAML files by replacement, so deletions in the repository reach the content volume; `assets/` drops only files the image seeded earlier and no longer ships.
- Markdown: GFM tables that omit the trailing pipe render as tables again; only rows whose continuation follows on the next line are joined.
- Config: `i18n.noindex` refuses the default language with a clear message; hiding it used to empty the server-mode sitemap while the static sitemap ignored it.
- Server mode: the content version now includes `profile.yaml`, so feed ETags and cached OG images refresh after a profile edit between syncs.
- Sync is idempotent: a run that finds nothing new writes no file (the manifest's timestamp used to change every time, turning every scheduled run into a commit and a deployment); YAML entries keep their date until their bytes change.
- The static Docker loop skips the build when the content matches the current release.
- Landing and tag/category pages always carry a meta description: the author's when set, otherwise a neutral "<title> by <name>" (a bare title had cost the Lighthouse SEO score).
- KaTeX no longer warns about CJK characters inside math or `\\` line breaks in display mode; other strict-mode warnings still reach the build log.
- Module landing pages default to a bare title (Writing / Publications / Projects, 文章 / 论文 / 项目) with no introduction; the sample-voiced sentences and the "N posts and counting" line are gone from the defaults (the demo keeps its own through `site.yaml`), and `modules.<id>.description: false` switches an introduction off explicitly.
- The profile photo path goes through the same URL rule as every other content field: a repository-local `assets/…` photo now renders on `/zh/` and under a deployment sub-path, in the page, the Open Graph image and the JSON-LD (it was written verbatim, so `/zh/assets/photo.png` 404ed).
- The profile photo is no longer forced into a square (bio header) or 4:5 (hero): it keeps its own proportions between 4:3 and 5:7 and is cropped only beyond that range; themes can widen the range through two CSS variables.
- Actions sync runs hourly instead of every 30 minutes, asks Notion first whether anything was edited and skips quiet hours in seconds, rebases before pushing (a race with the author's own push failed the run), and summarises the change in the commit message.

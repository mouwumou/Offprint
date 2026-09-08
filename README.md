# Offprint

> Offprint (抽印本) — an open-source, pluggable, easy-to-deploy academic personal website: homepage, blog, publications, projects and CV in one site.

[中文说明](README.zh-CN.md)

[![Use this template](https://img.shields.io/badge/GitHub-Use_this_template-2ea44f?logo=github)](https://github.com/mouwumou/Offprint/generate)

Offprint does two things most static site generators do not:

- **Write elsewhere, publish here.** Blog posts are written in Notion (or any tool that can emit the documented markdown contract), converted by [elog](https://elog.1874.cool), and consumed by the site. The site depends on no editor and never calls Notion at runtime.
- **One codebase, two runtimes.** The same template compiles to a fully static site (GitHub Pages, any static host) or runs server-rendered in a container (Docker on a VPS, Cloudflare Containers — any host with a real runtime and a persistent volume), where "publish in Notion" goes live within seconds. Both modes emit identical HTML.

Academic details are defaults, not add-ons:

- Bilingual routing and content fields (English / Chinese), default language at the root path;
- publication list with a Cite dialog (BibTeX / APA / MLA / Chicago) and Highwire Press meta tags for Google Scholar;
- KaTeX math, Shiki code highlighting, in-text citations with a reference list;
- a CV page driven by JSON Resume, with PDF export;
- canonical / OpenGraph / JSON-LD, RSS / Atom / JSON feeds, sitemap, generated OG images;
- site search (pagefind), light/dark theme, giscus comments, legacy-URL redirects;
- zero JavaScript by default — only truly interactive parts (theme toggle, Cite, search) ship scripts.

Themes, page widgets and modules are pluggable: two built-in themes (`scholar`, the academic default, and `paper`, a magazine feel), third-party themes drop into `extensions/`, and every knob lives in one `site.yaml`.

## Quick start

```bash
pnpm install
pnpm dev            # http://localhost:4321 with the sample content
pnpm build:static   # fully static build → dist/
```

Change three things and it is your site: `site.yaml` (who you are, which modules, which theme), the `content/` directory (publications, projects, CV, standalone pages, home-page layout), and the blog (drop markdown into `content/posts/`, or connect Notion). Step-by-step in [docs/guide/getting-started.md](docs/guide/getting-started.md).

## Use as a template

This repository is a **public template** (ADR-017): it ships sample content, builds self-sufficiently, and its CI and demo deploy use only `GITHUB_TOKEN` — **it holds no secrets and never will**. Your site is an **instance repository** generated from it: click "Use this template" above (cleaner than a fork — no development history).

Everything an instance may need, all in your own repository's Settings, all optional:

| Kind | Name | When |
| --- | --- | --- |
| Variable | `SITE_URL` | Detected automatically on GitHub Pages (sub-paths like `user.github.io/repo` included); set it on other platforms |
| Variable | `SYNC_ENABLED=true` | To let Actions sync from Notion every 30 minutes |
| Secret | `NOTION_TOKEN`, `NOTION_DB` | Same |

With nothing set, a push yields a GitHub Pages static site; the sync workflow shows as skipped. Self-hosted secrets (Docker, static or server mode) live only in a local `.env` on the server.

## Documentation

Start at [docs/README.md](docs/README.md). The guides are currently written in Chinese: [getting started](docs/guide/getting-started.md) · [configuration](docs/guide/configuration.md) · [Notion sync](docs/guide/sync.md) · [deployment](docs/guide/deployment.md) · [theming](docs/THEMING.md) · [content contract](docs/CONTENT-CONTRACT.md). Design documents (architecture, ADRs, the publishing chain) share the same index; `site.yaml` and `.env.example` carry inline comments.

## Status

All core features are complete and gated by dual-mode HTML parity e2e, a sub-path deployment e2e, accessibility (axe) and Lighthouse thresholds; the open-source release is being finalised. Task list in [docs/dev/ROADMAP.md](docs/dev/ROADMAP.md).

## Contributing & security

Issues and pull requests are welcome, in English or Chinese — see [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and the code constraints. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), not in a public issue.

## License

MIT.

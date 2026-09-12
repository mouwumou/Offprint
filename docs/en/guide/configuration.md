# Configuration

Offprint is configured through **text files** only: no interactive wizard, no admin panel. Three layers, each with one job:

| Layer | File | Governs |
| --- | --- | --- |
| Site | `site.yaml` at the root | What the site **looks like**: modules, navigation, header and footer, theme, languages, comments, analytics, redirects |
| Content | `content/` | **Who you are** in `content/profile.yaml`; **what the pages show**: publications, projects, CV, standalone pages, news; **how the home page is laid out** in `content/home.yaml` |
| Extensions | `extensions/` | Third-party themes and widgets **installed** into the site (read-only; every knob goes back into `site.yaml`) |

Secrets are not configuration; they live in `.env` only (see [deployment.md](deployment.md)).

## Editor completion and validation

Both YAML files start with a `# yaml-language-server: $schema=…` line. With a YAML language service (the Red Hat YAML extension in VS Code is enough) you get key completion, type hints and inline errors. The schema files live in `schema/` and are generated from the zod definitions; contributors who change a config schema regenerate them with `pnpm gen:schema`.

Every key is validated strictly at build time: **a misspelled key or a wrong type fails the build and names the location** instead of being silently ignored. That is deliberate: a typo in a config file should not become a section that quietly disappears from the live site.

Bilingual fields accept two spellings:

```yaml
title: Hello                      # shared by both languages
title: { en: Hello, zh: 你好 }     # one per language
```

## `site.yaml` section by section

The file itself carries a comment and an example for every section. This walkthrough only says which question each section answers; the full key list is in the file and in the schema completion, not repeated here.

- **`seo`**: `person: false` stops the schema.org Person block on the home page (the author data itself is in `content/profile.yaml`, see [CONTENT-CONTRACT.md §6](../../CONTENT-CONTRACT.md), Chinese).
- **`modules`**: which parts the site has. Five switches: `blog`, `pages`, `publications`, `projects`, `cv`; `false` removes the routes, the navigation entry and the bundle. Writing an object overrides the landing-page copy. `blog: { colophon: {…}, related: false, search: false }`: `colophon` shows a "colophon" box after each post only when given bilingual text (none by default); `related: false` hides the related-posts block; `search: false` removes site search entirely (no search page, no index, no header button; `header.search: false` only hides the button). `publications: { order: file }` sets the order within a year: `file` (the order in `publications.yaml`, the default, which is how first-author papers go first), `key` or `title`; years always run newest first. `publications: { detail: false }` skips per-paper pages: titles become plain text and each entry's link row (arXiv, code, video…) is all the navigation there is, as on most academic home pages; the Cite dialog and the Highwire meta tags Google Scholar reads disappear with those pages. `cv: { indexable: false }` keeps the HTML CV out of search engines (robots noindex, no sitemap or hreflang entry, robots.txt Disallow); `cv: { pdf: assets/cv.pdf, indexable: false }` points the navigation straight at a PDF file, generates no HTML page, and disallows the file.
- **`nav`**: the navigation bar. Absent, it is generated (home, enabled modules, then standalone pages with `nav: true`); present, it is used exactly as written, with modules, standalone pages or arbitrary links as entries.
- **`layout.width`**: site-wide column width, `narrow` (academic, the default) or `wide` (pairs with the paper theme). Uniform across the site, header and footer included.
- **`header` / `footer`**: the chrome switches: the two title lines, search, theme toggle, language switcher, RSS. `footer.colophon` shows a credit line only when given text; by default only the © year appears. The template never signs your site. The default academic form is a plain navigation row, since the name is already in the home-page body.
- **`theme`**: appearance. `name` selects a theme (built-in `scholar` by default, `paper`, or one installed in `extensions/themes/`; the template ships the sample `gutter`), `accent` changes only the primary colour, `tokens` overrides design variables one by one, `typography.proseSize` sets the body font size (default `1.0625rem`, that is 17px; Chinese text often prefers `1rem`), and `options` holds the options the theme itself declares. To install a third-party theme, put its directory into `extensions/themes/` and point `theme.name` at it; what a theme can change and how to make one is in [THEMING.md](../THEMING.md).
- **`i18n`**: the default language lives at the root path; the others get a prefix such as `/zh`. `noindex: [zh]` keeps those languages **out of search engines**: their pages emit robots noindex, stay out of the sitemap, are not offered as hreflang alternates of other languages, and are disallowed in robots.txt; the pages themselves stay reachable. This stops well-behaved crawlers, not determined scrapers.
- **`comments`**: giscus, enabled only once all four parameters are set.
- **`analytics`**: visitor statistics, off by default. Pick one of three privacy-friendly services: `umami: { websiteId }` (Umami Cloud by default, add `src` for a self-hosted instance), `plausible: { domain }` (plausible.io by default, add `src` for self-hosted), or `goatcounter: { code }`. The script is injected in production builds only, so `pnpm dev` never reports visits; this is the one opt-in exception to the zero-JS default.
- **`redirects`**: old paths to new ones. Static mode generates meta-refresh pages, server mode returns real 3xx responses.

## The `content/` directory

| File / directory | Content | Written by |
| --- | --- | --- |
| `profile.yaml` | Who you are: name, title, affiliation, photo, bio, links; every part of the site reads it. Fields and where they appear: [CONTENT-CONTRACT.md §6](../../CONTENT-CONTRACT.md) (Chinese) | you |
| `home.yaml` | The home page's blocks and their order, top to bottom; delete it to get the built-in default | you |
| `publications.yaml` | Publication list (the Cite dialog and Highwire meta tags are generated from it) | you |
| `projects.yaml` | Project list | you |
| `cv.yaml` | The CV, JSON Resume plus bilingual and teaching extensions; drives the CV page and the PDF export | you |
| `news.yaml` | Home-page news items (optional) | you |
| `pages/*.md` | Standalone pages (about, now…), Markdown with front-matter | you |
| `posts/*.md` | Blog posts | **the sync pipeline only**; do not edit by hand once sync is on. How to set up the Notion database: [notion-template.md](notion-template.md) |
| `assets/` | Images and other static files, referenced as `assets/…` | you; sync also materialises Notion images here |
| `manifest.json` | Sync output; the update signal in server mode | the sync pipeline only |

Every field is specified in [CONTENT-CONTRACT.md](../../CONTENT-CONTRACT.md) (Chinese); `pnpm sync validate` validates the content without syncing.

### Home-page layout: `home.yaml`

The home page is a column of "blocks"; their order is the display order, and each can take options:

```yaml
sections:
  - type: bio-header            # name + small photo + bio + quick links
  - type: news                  # news items, count: 5
  - type: publication-list      # publication entries, selectedOnly: true for the selected ones
  - type: recent-posts          # recent posts, count: 3
```

The available block types are listed in the comment at the top of the file (`hero`, `about`, `prose`, `selected-publications`, `projects` and so on), and completion shows each block's options. The default layout is the compact academic one; the `paper` theme with `hero` plus `selected-publications` gives a magazine-style home page.

## Environment variables

Only three kinds of things are environment variables rather than `site.yaml` keys: the runtime mode (`RUNTIME_MODE`), the deployment address (`SITE_URL`, which is also a repository variable in GitHub Actions), and every secret. All of them are listed, with comments, in `.env.example`.

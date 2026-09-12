# Making a theme

A theme is a directory: `theme.json` (required), `theme.css` (optional), `widgets/` (optional). It can do three things, each deeper than the last:

| Layer | Through | Can change |
| --- | --- | --- |
| 1. Skin | `theme.json` | Colours, radius, font stacks, body font size, voice presets, the theme's own options |
| 2. Styles | `theme.css` + **style hooks** | Any style of any widget, layout included; the hooks are stable `data-part` names and preset classes, not utility class names |
| 3. Widgets | `widgets/<name>.astro` | Replace a whole widget (home-page sections, publication row, post row, site header and footer) with the same props as the built-in |

The sample theme **`extensions/themes/gutter/`** ships with the template, demonstrates all three layers, and comes with a per-file [README](https://github.com/mouwumou/Offprint/blob/main/extensions/themes/gutter/README.md); the fastest way to your own theme is to copy it (§1).

There is exactly one acceptance test: `pnpm theme:check <name> [dir]` copies the repository, installs your theme, and runs both builds and the whole e2e suite (dual-mode HTML parity, accessibility, phone viewport, sub-path). The template repository's CI runs it for the built-in `paper` and the sample `gutter` on every push; an instance repository generated from the template skips those two runs (it only verifies the theme it enables), so run it locally to accept a custom theme.

## 1. Directories and installation

```
extensions/themes/<name>/   # installed themes (read-only: an upgrade replaces the whole directory)
extensions/themes/gutter/   # the shipped sample theme (copy it to start; do not edit it in place)
src/core/themes/<name>/     # built-in themes (contributed to the template by pull request)
```

On a name clash `extensions/` wins. There is no registry and no enum: **a directory that validates is a legal theme.** `theme: { name: <name> }` in `site.yaml` enables it; an unresolvable name fails the build and lists the available themes.

**Read-only principle**: users never edit a theme directory. Every knob is in `site.yaml`: `theme.accent` / `theme.tokens` / `theme.typography` (generic overrides) and `theme.options` (the theme's own options); to change one widget, drop a file of the same name into `extensions/widgets/` and it wins.

### Starting from the sample theme

```bash
cp -r extensions/themes/gutter extensions/themes/mine   # 1. copy
sed -i 's/"name": "gutter"/"name": "mine"/' extensions/themes/mine/theme.json   # 2. directory name and `name` must match
#    3. site.yaml → theme: { name: mine }; change colours, fonts, voice; delete the layers you do not need
pnpm theme:check mine                                   # 4. accept
```

Older instances (generated before the sample existed) copy `extensions/themes/gutter/` from the template repository's `main` branch; the upgrade script never touches `extensions/`.

## 2. theme.json

```json
{
  "name": "<name>",
  "voice": { "labels": "plain", "photo": "plain", "density": "compact" },
  "typography": { "proseSize": "1.0625rem" },
  "options": {},
  "tokens": {
    "light": { "background": "#ffffff", "...": "all 15 tokens required" },
    "dark": { "...": "same" }
  },
  "fonts": { "sans": "…", "serif": "…", "mono": "…" }
}
```

- **tokens** (15, `TOKEN_NAMES` in `src/core/theme/contract.ts`): `background` `foreground` `card` `card-foreground` `primary` `primary-foreground` `secondary` `secondary-foreground` `muted` `muted-foreground` `accent` `accent-foreground` `border` `ring` `radius`. Both light and dark must be complete; one missing or one extra is a build error. BaseLayout injects them as `:root{…}.dark{…}` variables, so do not redefine them in CSS.
- **fonts**: complete `font-family` stacks, **with CJK fallbacks**. Font files are loaded from theme.css (`@import '@fontsource/...'`).
- **typography.proseSize**: base font size of article bodies, default `1.0625rem`; users can override it in site.yaml.
- **voice** (presets, optional): `labels: plain | mono-caps` (ordinary type versus letterspaced uppercase mono for labels, navigation and kickers), `density: compact | airy` (academic density versus magazine air), `photo: plain | grayscale-hover`. The three values are stamped on `<html>` (`data-labels` / `data-density` / `data-photo`) and the core's preset styles switch on them, see §3; theme.css may override any preset rule.
- **options**: the **declaration** of the theme's own options. Users give values in site.yaml `theme.options`, the build validates them against the declaration, and `pnpm gen:schema` folds them into editor completion:

```json
"options": {
  "sidebar": { "type": "string", "enum": ["left", "right"], "default": "right", "description": "Sidebar position" },
  "showAffiliations": { "type": "boolean", "default": true }
}
```

Widgets read the resolved values through `themeOptions` (`src/core/theme/current.ts`). The sample theme declares one option, `showAffiliation`, and its footer widget uses it to decide whether the affiliation appears; declaration, value and read side by side make the mechanism obvious.

## 3. theme.css and the style hooks

theme.css is injected into every page by the build and sits **outside every cascade layer**; the core's base styles and the Tailwind utilities are inside layers, so ordinary selectors in theme.css win without extra specificity or `!important`.

Theme CSS uses only two kinds of selector. Both are part of the contract and kept stable by the core (renaming one takes an ADR):

**(a) `data-part` hooks** on every widget root and key child:

| Area | Hooks |
| --- | --- |
| Chrome | `site` `main` `site-header` `brand` `nav` `nav-item` `nav-search` `lang-switch` `theme-toggle` `nav-drawer` `site-footer` `footer-name` `footer-affiliation` `footer-links` `footer-colophon` |
| Home sections | `section` (with `data-section="<section type>"`) `section-label` `section-title` `section-more`; `bio-header` `bio-name` `bio-subtitle` `bio-tagline` `bio-text` `bio-photo` `bio-links`; `hero-name` `hero-photo`; `news-list` `news-item` |
| List page heads | `page-head` `page-kicker` `page-title` `page-lede` |
| Publications | `pub-year-group` (with `data-year`) `pub-year` `pub-list` `pub-row` (with `data-key`) `pub-thumb` `pub-title` `pub-meta` `pub-venue`; detail page `pub-detail` `pub-back` `pub-head` `pub-abstract` |
| Posts | list `post-list` `post-filter` `post-updated` `post-row` (with `data-urlname`) `post-meta` `post-category` `post-lang` `post-title` `post-description` `post-tags`; article `post` `post-back` `post-head` `post-kicker` `post-lede` `post-cover` `post-body` `post-colophon` `post-series` `post-related` `post-toc` |
| Standalone pages | `page` `page-head` `page-title` `page-body` |

`<html>` additionally carries `data-theme-name`, `data-labels`, `data-density` and `data-photo`.

**(b) preset classes**: wherever the core switches a style by voice it uses a semantic class rather than a utility, and you can redefine it by class. Page rhythm: `page-top` `article-top` `page-head` `section-gap` `list-tools` `post-row-pad` `site-footer--stack` `site-footer__body` `article-toc`; headings: `page-title` `page-lede` `article-head` `article-title` `article-lede` `kicker`; label register: `ui-label` `ui-meta` `ui-caption` `ui-heading` `ui-heading-sm` `section-label`.

Do not rely on Tailwind utility class names (`mt-4`, `text-sm`…): they change with the implementation and are not part of the contract.

A real example: the sample theme `gutter` turns the publications page into a résumé-style layout, year in a left column and hairlines between entries, through hooks alone:

```css
[data-part='pub-year-group'] { display: grid; grid-template-columns: 5.5rem 1fr; column-gap: 1.25rem; }
[data-part='pub-year-group'] > [data-part='pub-year'] { border: 0; padding: .95rem 0 0; font-size: 1rem; color: var(--muted-foreground); }
[data-part='pub-year-group'] [data-part='pub-row'] { padding: .95rem 0; border-top: 1px solid var(--border); }
```

The full file is `extensions/themes/gutter/theme.css`; its header comment lists the two kinds of selector a theme may use.

## 4. widgets/: widgets carried by the theme

`widgets/<name>.astro` replaces the built-in widget of the same name. The lookup chain is **site overrides (`extensions/widgets/`) > the enabled theme's `widgets/` > built-in**. The file name must be one of the names below; anything else fails the build and lists the legal names.

| Widget | Built-in implementation (the props contract) | Used where |
| --- | --- | --- |
| `bio-header` `hero` `about` `news` `publication-list` `selected-publications` `recent-posts` `projects` `prose` | `src/core/components/home/<matching file>.astro` | Home-page sections (`content/home.yaml`) |
| `publication-row` | `src/core/components/PublicationRow.astro`: `{ publication, lang, href?, thumbnail?, cite?, as? }` | Every entry on the publications page, and the home-page publication list |
| `post-row` | `src/core/components/PostRow.astro`: `{ post, lang, href, variant: 'full' \| 'compact', minutes? }` | The post list page and the home-page recent posts |
| `site-header` | `src/core/components/Header.astro`: `{ lang, alternates }` | Every page |
| `site-footer` | `src/core/components/Footer.astro`: `{ lang }` | Every page |

Data inside a widget always comes through `getProvider()` (posts, publications, projects, CV, and the author profile via `getProvider().getProfile()`); `siteConfig` holds only structure and switches. Import the core by relative path from the theme directory (`../../../../src/core/...`); the complete example is `extensions/themes/gutter/widgets/site-footer.astro` (reads an option, fetches the profile through the provider, keeps the hooks).

## 5. Acceptance

```bash
pnpm theme:check <name>                 # a built-in theme, or one installed in extensions/themes/ (the sample gutter included)
pnpm theme:check <name> path/to/theme   # a directory not installed yet: copied to extensions/themes/<name> first
```

The script copies the repository to `.offprint/theme-check/<name>/`, installs the theme, points site.yaml at it, then runs `build:static`, `build:server` and `pnpm e2e`. The most common failures are **axe colour contrast** (`muted-foreground` and `primary` must both pass AA against `background`) and a forgotten dark-mode value.

## 6. Distribution

| Form | Today |
| --- | --- |
| Site-owned | `extensions/themes/<name>/` (example: `gutter`) |
| Contributed to the template | A pull request adding `src/core/themes/<name>/`; CI runs theme:check automatically |
| npm package | Planned: `offprint-theme-<name>`, with node_modules joining the lookup chain |

## 7. Not yet available

- `shiki`: per-theme code-highlighting themes (currently one site-wide pair).
- More widgets: the post header and the CV sections are not widgets yet; use the hooks for now.

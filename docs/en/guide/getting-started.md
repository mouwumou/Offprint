# Getting started: from template to live site

Three paths; pick one. None needs a secret: the template ships sample content and builds as generated.

## Path A: GitHub Pages, nothing to install

1. On the repository page click **Use this template → Create a new repository**. It is cleaner than a fork and carries none of the template's development history. A private repository can publish Pages on paid GitHub plans; the site is public, the source is not.
2. Configure nothing. After a push to `main`, the `Deploy to GitHub Pages` workflow enables Pages for the repository and publishes. GitHub makes the first push for you when it generates the repository, so two or three minutes of waiting is usually all it takes. Progress is on the repository's **Actions** tab.
3. The site lives at `https://<you>.github.io/<repo>/`. The workflow reads the address itself and passes it as `SITE_URL`; the sub-path becomes the deployment prefix, and every internal link, feed, sitemap entry and search result carries it automatically.

A successful first deploy looks like this: `Deploy to GitHub Pages` is green on the Actions tab, and the site shows the home page of the sample person, "Mara Ellison Voss".

Custom domain: enter it under **Settings → Pages → Custom domain** and set the DNS records GitHub asks for. From the next run the workflow picks up the domain, the prefix disappears, and no file needs to change. The `SITE_URL` repository variable is only for forcing an address.

## Path B: self-hosted with Docker

Same repository, two Compose files at the root: `compose.static.yaml` serves the static build and re-syncs on a schedule; `compose.server.yaml` runs server mode with publishing in seconds.

```bash
cp .env.example .env                                  # SITE_URL; add NOTION_TOKEN and NOTION_DB to sync from Notion
docker compose -f compose.static.yaml up -d --build   # or compose.server.yaml
```

Steps and the trade-offs between the two modes are in [deployment.md](deployment.md). The images run on any container platform with a persistent volume: a VPS, Cloudflare Containers, and the like.

## Path C: on your machine

Needs Node 22 or newer and pnpm. `corepack enable` provides pnpm; the version is pinned in `packageManager` in `package.json`.

```bash
pnpm install
pnpm dev            # http://localhost:4321, hot reload on every save
pnpm build:static   # output in dist/; node scripts/serve-dist.mjs dist 4331 serves it locally
```

## Make it yours

Change three things. Each shows up in `pnpm dev` as soon as you save, and Pages redeploys after a push.

1. **`content/profile.yaml`**: who you are. Name, title, affiliation, photo, bio, links; only the name is required. This one file changes the home page, the footer, the CV header and the structured data to your name.
2. **`site.yaml`**: what the site looks like. Modules, navigation, theme, languages, comments, analytics, redirects. Every key carries an inline comment; with an editor set up you also get completion and inline errors, see [configuration.md](configuration.md).
3. **The rest of `content/`**: what the pages show. Publications in `publications.yaml`, projects in `projects.yaml`, the CV in `cv.yaml`, news in `news.yaml`, standalone pages in `pages/*.md`, the home-page layout in `home.yaml`. What each file is: [content/README.md](../../../content/README.md); the field reference: [CONTENT-CONTRACT.md](../../CONTENT-CONTRACT.md) (Chinese).

The blog can be written two ways: drop Markdown in the documented format into `content/posts/`, or connect Notion so that pressing publish is all it takes. Connecting Notion starts at [notion-template.md](notion-template.md); how the sync runs is in [sync.md](sync.md). Once sync is on, `content/posts/` belongs to it; do not edit those files by hand.

Every content file is validated against a schema at build time: a misspelled field produces an error that names the place, not a page that quietly went wrong.

### Shipped with the template, not needed by an instance

These directories come along when the repository is generated. Keeping them is harmless; deleting them does not affect the build:

- `website/`: source of the documentation site the template repository publishes.
- `extensions/themes/gutter/`: the sample theme; copy it when you start your own, see [THEMING.md](../THEMING.md).
- `.github/screenshots/`: screenshots for the template's README.

## Next

- A different look → [THEMING.md](../THEMING.md): two built-in themes, scholar and paper, tokens overridable one by one; `extensions/themes/gutter` is the shipped sample theme, copy it to start your own.
- Notion → [notion-template.md](notion-template.md) and [sync.md](sync.md).
- Self-hosting, or publishing in seconds → the two Docker sections of [deployment.md](deployment.md).
- Visitor statistics → the `analytics` block of `site.yaml`; Umami, Plausible and GoatCounter are supported, see [configuration.md](configuration.md).

## Common problems

**404 after the push.** Look at the Actions tab: if `Deploy to GitHub Pages` did not run, the push was not to `main`; if it failed, open it and read the red step. A first deployment can take a few minutes to reach the Pages CDN.

**Broken styles or links under a sub-path.** The `SITE_URL` used at build time differs from the real address. The address the workflow reads is normally right; if you set the `SITE_URL` repository variable by hand, make sure it matches the address shown on the Pages settings page exactly, sub-path included.

**Content changed, the site did not.** Pages redeploys only after a push to `main`; a change in Notion waits for the sync workflow to run and commit, see [sync.md](sync.md).

**`Sync from Notion` shows as skipped on the Actions tab.** Expected: without the `SYNC_ENABLED` variable it does nothing.

## Later: keeping up with template releases

An instance repository has none of the template's git history, so upgrades go through a script. From the instance root:

```bash
bash scripts/upgrade-from-template.sh /path/to/Offprint   # a checkout of the template's main branch
pnpm install --frozen-lockfile && pnpm sync validate && pnpm build:static
```

It overwrites only **paths the template owns**: `src/`, `scripts/`, `docs/`, the workflows, `package.json` and so on. It never touches your `site.yaml`, `content/`, `extensions/`, README or CLAUDE.md. Glance at `git status`, and once the build passes, commit and push. If the repository syncs from Notion, run `git pull --rebase` first, since the sync workflow commits content on its own. What each version changed is on the repository's Releases page.

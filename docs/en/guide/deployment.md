# Deployment

Choose the runtime mode first, then the platform.

| | static (default, the baseline) | server (optional) |
| --- | --- | --- |
| Output | Plain HTML/CSS in `dist/` | A Node process (Astro node adapter) |
| Publishing latency | Next sync plus build (minutes) | Seconds (revalidate / webhook) |
| Running cost | Zero: any static host | One long-running process plus a content volume |
| Fits | The vast majority of personal sites | Publishing that goes live immediately, or runtime features |

Both modes produce **identical HTML** (CI compares every page), share the same content directory and configuration, and can be switched at any time.

## Where secrets go

- GitHub Actions: only in **your own instance repository's** Settings → Secrets / Variables;
- self-hosting: `.env` at the repository root (`.env.example` lists every variable and says who reads it; `.gitignore` and `.dockerignore` both exclude it);
- never in the repository, never in an image.

## GitHub Pages (static, the default path)

After generating the repository there is nothing to configure: a push to `main` triggers `Deploy to GitHub Pages`, which enables Pages for the repository and publishes. The workflow reads the site address from the Pages settings (`https://<you>.github.io/<repo>/`, or the custom domain you configured) and passes it as `SITE_URL`; the `SITE_URL` repository variable is only needed to override it.

**Sub-paths**: a project page's default address is a sub-path deployment. The build derives Astro's `base` from the path of `SITE_URL`, and internal links, feeds, the sitemap and search results all carry the prefix automatically. With a custom domain the address returns to the domain root and the prefix disappears by itself.

**Custom domain**: enter the domain under **Settings → Pages → Custom domain**, add the DNS records GitHub shows (a CNAME for a subdomain, A/AAAA records for an apex domain), and tick Enforce HTTPS. The next workflow run picks up the domain as the address; no CNAME file and no repository change are needed.

**Private repositories**: paid GitHub plans publish Pages from private repositories; the site is public, the source is not. Free plans need a public repository.

**The template's own repository** additionally publishes the documentation site (the `website/` directory) under `/docs/` of the same site. That step runs only in the template repository; instances neither run it nor need `website/`.

## Docker: static, self-hosted

`compose.static.yaml` at the repository root, two services: `web` (Caddy serving the build) and `sync` (polling every `SYNC_INTERVAL` seconds: sync → build → atomic swap of the output directory). Without Notion credentials it degrades to building the content committed in the repository.

```bash
cp .env.example .env          # fill in SITE_URL, NOTION_TOKEN, NOTION_DB
docker compose -f compose.static.yaml config | grep NOTION_DB   # confirm .env was read (your database id should appear)
docker compose -f compose.static.yaml up -d --build
```

The Compose files sit at the root on purpose: Compose reads `.env` only from the directory of the Compose file, so with both at the root, `pnpm sync` and Docker use the same file.

## Docker: server mode, self-hosted

`compose.server.yaml` at the repository root, three parts: `site` (the Node process, `RUNTIME_MODE=server`), `sync` (syncs on a schedule and then notifies `site` at `/api/revalidate`), and the shared content volume `content`.

```bash
cp .env.example .env          # also add REVALIDATE_SECRET (`openssl rand -hex 32`), optionally NOTION_WEBHOOK_SECRET
docker compose -f compose.server.yaml config | grep REVALIDATE_SECRET   # confirm .env was read
docker compose -f compose.server.yaml up -d --build
```

The runtime mode is baked into the output at build time (`pnpm build:server`), so the process needs no `RUNTIME_MODE` at start. On a cold start with an empty content volume the site serves a bilingual "content is syncing" page (503) and recovers once the first sync lands. Then point the Notion webhook at `https://<your domain>/api/sync` for publishing in seconds (the handshake is described in [sync.md](sync.md)).

The same image runs on any container platform with a persistent volume and a long-running process (a VPS, Cloudflare Containers, Fly.io and the like; only Docker locally and on a remote test machine have been verified one by one). **Serverless platforms are not supported**: no persistent disk, function timeouts and independent instances leave no room for server mode's content volume, sync subprocess and in-process cache.

Put `/api/*` behind additional protection at the reverse proxy, and use `GET /api/health` as the liveness probe; it reports the current content version, the result of the last sync and the error count. If `SITE_URL` carries a sub-path, these endpoints live under it too (`/<base>/api/…`), and `REVALIDATE_URL` and the Notion webhook address must include it.

Both Compose setups were verified with real Notion credentials from a cold start to the first post going live: the static set syncs, builds and swaps atomically before Caddy serves it; in the server set the post is reachable after the first sync, `/api/health` reports the content version, and `/api/revalidate` and `/api/sync` admit the secret and answer 401 without it. Developers without Docker can skip both sections entirely.

## Other static hosts

`dist/` is plain files; any static host takes it (Cloudflare Pages, Netlify, Vercel and others): build command `pnpm build` (includes the search index), output directory `dist`, and `SITE_URL` set to the final address. This project **ships no platform-specific configuration**.

## Verifying a deployment

```bash
pnpm check:live https://your.site/     # exactly SITE_URL, sub-path included
```

It starts from the live sitemap, fetches every page, checks that every internal link a page references stays inside the deployment prefix and resolves, and confirms that robots.txt and the feeds exist (plus the search index when site search is on). It is content-agnostic, so any instance can run it; the template's own demo is accepted this way.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| The home page opens, other pages 404 or lose their styles | `SITE_URL` at build time differs from the real address, usually a hand-set repository variable with the wrong sub-path; delete the variable so the workflow reads the address itself, or make it match the Pages settings page exactly |
| The old address stops working after a custom domain | Expected; GitHub does not forward `user.github.io/repo` to the new domain. Update external links to the domain |
| Docker does not read `.env` | Compose reads `.env` only from the Compose file's directory; both Compose files are at the repository root, so `.env` must be too. `docker compose -f … config` shows whether the variables expanded |
| Server mode keeps showing "syncing" | The first sync never landed: read `docker compose logs sync`; usually Notion credentials or a database not shared with the integration |
| Lighthouse or `check:live` fails on a self-hosted site | The reverse proxy does not forward static paths such as `/pagefind/` and `/rss.xml`, or it cached an old version |

# Writing in Notion and syncing

Offprint never reads Notion at run time. Blog posts travel this way:

```
Notion database ──elog export──▶ normalise + validate ──▶ content/posts/*.md + manifest.json ──▶ site build / request-time read
```

The content contract is **tool-agnostic**: anything that can produce Markdown in the format defined by [CONTENT-CONTRACT.md](../../CONTENT-CONTRACT.md) (Chinese) can be a content source; [elog](https://elog.1874.cool) is the reference implementation. You can also skip Notion entirely and put files in that format into `content/posts/`.

## Preparing the Notion side

The database's property definitions, how to create one or duplicate the template, and how to reuse a NotionNext database are all in [notion-template.md](notion-template.md). When you are done with that page you have three things:

1. the integration token, starting with `secret_`;
2. the database id, the 32 hexadecimal characters in its URL;
3. the database shared with that integration.

## Running a sync locally

```bash
cp .env.example .env         # fill in NOTION_TOKEN and NOTION_DB; .env is gitignored
pnpm sync                    # export → normalise → validate → write manifest → swap into content/ atomically
pnpm sync validate           # validate content/ only, no network
pnpm dev                     # look at the result
```

What the sync does and does not do:

- **Writes only `content/posts/`.** `pages/` and the `*.yaml` files are yours; sync never touches them. To also sync Notion rows with `type = Page` into `content/pages/`, set `SYNC_PAGES=true`.
- **Validates each post, isolates errors.** A non-conforming post is logged and skipped; the rest publish as usual. Errors are printed, and in server mode they also appear at `/api/health`.
- **Materialises images.** Notion-hosted images are signed URLs that expire within hours. By default (`IMAGE_PLATFORM=local`) they are downloaded into `content/assets/` and the links rewritten; the same image is deduplicated by a stable path, so repeated syncs do not download again. Downloads have a 30-second timeout and a 25 MB limit; a failure keeps the original link and never blocks the sync. An external cover URL that no longer resolves is dropped with a warning and the post falls back to the generated OG image.
- **Swaps atomically.** New content is fully processed in a temporary directory and switched in as one step, with `manifest.json` written last; readers never see a half-finished state.
- **The sync log is worth a look.** Detected languages, slugs derived from titles and skipped rows are all printed as warnings. An unexpected URL or language on the site is usually explained there.

## Automatic sync in GitHub Actions (static sites)

In the **instance** repository (not the template), add the variable `SYNC_ENABLED=true` under **Settings → Variables** and the secrets `NOTION_TOKEN` and `NOTION_DB`. The `Sync from Notion` workflow then runs every 30 minutes, and on demand from the Actions tab: fetch → sync → commit `content/` if anything changed → trigger the Pages deployment. From pressing publish to the live site is usually under five minutes.

Without that variable the workflow shows as skipped; the template repository itself is in that state. With automatic sync on, run `git pull --rebase` before pushing from your machine, because the workflow commits content on its own.

## Publishing in seconds (server mode)

A static site's latency is "next sync plus build", typically minutes. For seconds, self-host in server mode, see the Docker server section of [deployment.md](deployment.md). Two triggers exist:

- **Schedule**: the sync container syncs every `SYNC_INTERVAL` seconds and then calls the site's `/api/revalidate`; the site re-reads only the entries that changed.
- **Webhook**: Notion's webhook hits the site's `POST /api/sync`, and the site runs a sync itself. On first subscription Notion sends a `verification_token`; the site prints it to its log, you paste it into the Notion settings and into `NOTION_WEBHOOK_SECRET`, and every later request is checked against its HMAC signature. Without a webhook secret, `/api/sync` also accepts manual triggers carrying the header `x-revalidate-secret: <REVALIDATE_SECRET>`.

`/api/sync` is rate-limited (6 per minute), caps request bodies at 64 KB and its subprocess at 15 minutes; concurrent or replayed triggers are merged into one run. Status is at `GET /api/health`.

Design details (endpoints, the atomic swap, cache invalidation granularity) are in [DYNAMIC-PUBLISHING.md](../../DYNAMIC-PUBLISHING.md) (Chinese).

## Troubleshooting

| Symptom | Where to look |
| --- | --- |
| `pnpm sync` reports 401 / not found | The database is not shared with the integration, or `NOTION_DB` is wrong; see the table in [notion-template.md](notion-template.md) |
| Sync succeeds but publishes nothing | No row has `status = Published` |
| Wrong language or URL on a post | The warnings in the sync log; fill in `lang` or `slug` on that row |
| Actions sync succeeded but the site is stale | No deployment is triggered when content is unchanged; if it changed, check that `Deploy to GitHub Pages` ran afterwards |
| Server-mode webhook does nothing | `/api/health` shows the last sync; make sure `NOTION_WEBHOOK_SECRET` matches the Notion settings, the site log records signature failures |

# The Notion database template

Sync reads exactly one Notion database with a fixed set of properties. This page defines that database in full: build it by hand, duplicate the public template, or plug in the NotionNext database you already have. All three sync the same way.

<!-- TODO: add the "duplicate template" link once the public template is published -->

## Properties

| Property | Type | Required | Purpose |
| --- | --- | --- | --- |
| `Name` | Title | yes | Post title |
| `status` | Select: `Published` / `Draft` | yes | Only `Published` rows are synced; any other value counts as a draft |
| `type` | Select: `Post` / `Page` | no | Defaults to `Post`. `Page` marks standalone pages such as About or Now; they are synced into `content/pages/` only when `SYNC_PAGES=true` |
| `slug` | Text | recommended | The URL segment of the post: lowercase letters, digits and hyphens only. Derived from the title when empty; a title with no Latin characters cannot be derived and falls back to the Notion page id, which is ugly, so fill it in for Chinese posts |
| `date` | Date | yes | Publication date; sorting, archives and feeds use it |
| `category` | Select | no | One category per post |
| `tags` | Multi-select | no | Tags |
| `summary` | Text | no | The one-line description on list pages and the meta description. Without it, the first 160 characters of the body are used |
| `lang` | Select: `en` / `zh` | no | Language. Detected from title and body when empty; the result is printed in the sync log |
| `series` | Text | no | Series name; posts in the same series link to each other |
| `top` | Checkbox | no | Pin to the top |

Not properties, but used:

- **Page cover**: a post with a cover gets it as the article header image and OG image. Notion-hosted image links expire within hours, so sync downloads them into `content/assets/`; the post no longer depends on Notion afterwards.
- **Last edited time**: becomes `updated` automatically.
- **Body**: headings, lists, quotes, code, math, tables, images and callouts are converted to Markdown. Four-space indentation of Notion child blocks and line breaks inside table cells are two common export quirks; the renderer tolerates both.

Properties the sync does not know are kept verbatim under `extra` in the front-matter; they never cause an error.

## Building a new one

1. Create a full-page database, name the title property `Name`, and add the properties from the table. Option values must match exactly: `Published`, `Post`, `Page`, `en`, `zh`.
2. Add two or three sample rows: an English post, a Chinese post, and an About page with `type = Page`. Give each a `slug` and a `date`, and set `status` to `Published`.
3. Under Notion's *Settings → Connections* create an integration and copy its token, which starts with `secret_`.
4. Back on the database page open `···` → *Connections* and select that integration. **Without this step the sync gets a 401 or an empty result.**
5. The database id is the 32 hexadecimal characters after `notion.so/` and before `?` in the URL. Put it and the token into `.env` and run `pnpm sync`.

To turn it into a public template others can duplicate with one click: on the database page choose *Share → Publish*, enable *Allow duplicate as template*, and share the resulting link. Whoever duplicates it only has steps 3, 4 and 5 left.

## Reusing a NotionNext database

Offprint's property names are NotionNext's property names, on purpose: `slug`, `category`, `summary`, `type` and `status` are all recognised as they are, and nothing needs renaming. The differences are few:

- Rows whose `type` is `Menu`, `SubMenu`, `Config` or `Notice` are NotionNext's site configuration; sync ignores them.
- The `password` and `icon` properties are ignored; password-protected posts are outside Offprint's scope.
- NotionNext has no `lang` property; automatic detection works without one, but if you write in both languages, adding it is recommended.
- Site configuration no longer lives in Notion; all of it is in the repository's `site.yaml`.

The maintainer's own site was migrated exactly this way: the database from the NotionNext days was connected unchanged, not a single post edited.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| 401 or "object not found" | The database is not shared with the integration, or `NOTION_DB` is not a database id |
| Sync succeeds but publishes nothing | No row has `status = Published`, or the value is spelled differently |
| A post's URL is a long id | That row has no `slug`, and the title cannot be turned into one |
| Images missing | Image materialisation was off (`IMAGE_PLATFORM=local` is the default) or a download timed out; check the warnings in the sync log |
| A Chinese post shows up in the English list | Language detection guessed wrong; fill in `lang` on that row |

How the sync runs, scheduled syncs in GitHub Actions and publishing in seconds in server mode are in [sync.md](sync.md).

---
title: Publishing this blog from Notion with elog
urlname: publishing-from-notion
date: 2025-04-28
updated: 2025-05-03
description: The exact pipeline behind this site — a Notion database, elog, and a front-matter contract I fully control.
categories: Engineering
tags:
  - elog
  - notion
  - tooling
  - web
cover: assets/cover-notion.png
lang: en
---

I did not want a blog that was a folder of hand-written markdown, and I did not
want a black-box CMS either. I wanted to *write in Notion* — where my reading
notes and half-formed ideas already live — and have the published result land in
a format **I** define, in a repo **I** own.

That is exactly the seam [elog](https://elog.1874.cool) is built for.

## The shape of the pipeline

elog is a build-time tool. It reads documents from a writing platform (Notion,
in my case), converts them to markdown, and writes them into a target
directory. It does *not* run a server, and it does *not* impose a theme. The
flow is:

```text
Notion database  ──elog──▶  content/posts/*.md  ──build──▶  this site
```

The critical detail: elog emits a folder of markdown files with
[gray-matter](https://github.com/jonschlinkert/gray-matter) front matter, and
**nothing else** — no index, no manifest. Discovery is left to the consumer.
That is not a limitation; it is the contract. It means my site decides what a
post *is*.

## The front-matter contract

Every Notion database column becomes a front-matter key. I expose exactly the
fields this site knows how to render:

```yaml
---
title: The geometry of uncertainty in population codes
urlname: geometry-of-uncertainty
date: 2025-06-14
updated: 2025-07-02
description: Why uncertainty lives on curved manifolds.
categories: Research notes
tags:
  - neuroscience
  - geometry
top: true
---
```

`title`, `urlname`, `date`, and `updated` are always written by elog. The rest
are optional Notion columns. My loader reads the folder, parses the front
matter, and builds the index at compile time — so a new post is just a new
file.

## The elog config

The whole thing is one config file. The `write` block points at Notion; the
`deploy` block points at this repo's content directory:

```javascript
module.exports = {
  write: {
    platform: "notion",
    notion: {
      token: process.env.NOTION_TOKEN,
      databaseId: process.env.NOTION_DB,
      filter: { property: "status", select: { equals: "Published" } },
    },
  },
  deploy: {
    platform: "local",
    local: {
      outputDir: "./content/posts",
      filename: "urlname",
      format: "matter-markdown",
    },
  },
  image: { enable: true, platform: "github" },
}
```

`filename: "urlname"` is what keeps my URLs stable and human — the file is named
after the slug, not the title, so renaming a post in Notion never breaks a link.

## The last mile: CI

A GitHub Action runs `elog sync` on a schedule (and on demand via a Notion
webhook), commits any changed markdown, and lets the normal deploy take over.
Writing a post is now indistinguishable from editing a Notion page — and yet the
published artifact is plain markdown I can grep, diff, and migrate forever.

That combination — *frictionless input, fully-owned output* — is the whole
reason this site exists.

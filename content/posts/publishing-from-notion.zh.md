---
title: 用 elog 从 Notion 发布这个博客
urlname: publishing-from-notion
date: 2025-04-28
updated: 2025-05-03
description: 这个站点背后的完整链路 —— 一个 Notion 数据库、elog，以及一份完全由我掌控的 front-matter 契约。
categories: 工程
tags:
  - elog
  - notion
  - 工具链
cover: https://images.unsplash.com/photo-1517842645767-c639042777db?w=1600&h=900&fit=crop&auto=format
lang: zh
---

我不想要一个由手写 markdown 文件夹组成的博客，也不想要一个黑盒 CMS。我想*在
Notion 里写作* —— 我的读书笔记和尚未成形的想法本来就住在那里 —— 同时让发布出来
的结果落在**我**定义的格式里、放在**我**拥有的仓库中。

这正是 [elog](https://elog.1874.cool) 所填补的那道缝。

## 链路的形状

elog 是一个构建期工具。它从写作平台（在我这里是 Notion）读取文档，转换成
markdown，写入目标目录。它*不*运行服务器，也*不*强加主题。流程是：

```text
Notion 数据库  ──elog──▶  content/posts/*.md  ──构建──▶  这个站点
```

关键细节在于：elog 产出的只是一个带
[gray-matter](https://github.com/jonschlinkert/gray-matter) front matter 的
markdown 文件夹，**仅此而已** —— 没有索引，没有 manifest。发现内容是消费方的
职责。这不是局限，而是契约本身：它意味着由我的站点来决定一篇文章*是什么*。

## front-matter 契约

Notion 数据库的每一列都会变成一个 front-matter 键。我只暴露站点知道如何渲染的
字段：

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

`title`、`urlname`、`date`、`updated` 由 elog 保证写入，其余是可选的 Notion
列。加载器读取整个文件夹、解析 front matter、在编译期建立索引 —— 新文章就只是
一个新文件。

## elog 配置

整套东西就是一个配置文件。`write` 块指向 Notion，`deploy` 块指向仓库的内容目
录：

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

`filename: "urlname"` 让 URL 保持稳定且可读 —— 文件以 slug 而非标题命名，在
Notion 里改标题永远不会弄断链接。

## 最后一公里：CI

一个 GitHub Action 定时（也可由 Notion webhook 按需触发）运行 `elog sync`，提
交变更的 markdown，剩下的交给常规部署。写一篇文章从此与编辑一个 Notion 页面无
异 —— 而发布产物仍是纯 markdown，永远可以 grep、diff 和迁移。

*无摩擦的输入，完全自有的输出* —— 这个组合就是这个站点存在的全部理由。

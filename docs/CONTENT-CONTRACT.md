# 内容契约

> 工具无关（ADR-002）。任何能产出下列格式的工具都是合法内容源；elog 是参考实现，其字段映射见 §7。
> 所有 schema 在 `src/core/schema/` 用 zod 定义，本文与代码不一致时以代码为准并回来改本文。

## 1. 目录约定（`content/`）

```
content/
├─ posts/<urlname>.<lang>.md   # 博客；同一 urlname 的不同语言是同一篇文章的译本
├─ pages/<slug>.<lang>.md      # 独立页面（About、Now…），Notion 中 type=Page
├─ publications.yaml           # 出版物（Notion 数据库导出，ADR-008）
├─ projects.yaml
├─ cv.yaml                     # JSON Resume schema（YAML 写法）
├─ talks.yaml  news.yaml       # 可选模块
├─ assets/                     # 本地托管的图片/PDF
└─ manifest.json               # 由 sync 生成；手写内容时可由 `pnpm sync manifest` 生成
```

## 2. posts（markdown + YAML front-matter）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | string | ✅ | |
| `urlname` | slug | ✅ | `/[lang/]blog/:urlname`，文件名为 `<urlname>.<lang>.md`；`^[a-z0-9-]+$`；译本共用同一 urlname |
| `date` | ISO date | ✅ | 首次发布 |
| `updated` | ISO date | ✅ | 最后编辑；缺省时 sync 以 `date` 填充并告警 |
| `description` | string | | 列表与 meta description |
| `categories` | string \| string[] | | 第一个作为 kicker |
| `tags` | string[] | | |
| `cover` | url | | 需为图床或 `assets/` 路径 |
| `lang` | `en` \| `zh` \| … | ✅ | 必填（ADR-007）；sync 缺省时回填默认语言并告警 |
| `series` | string | | 系列名，同系列文章互链 |
| `top` | boolean | | 置顶 |
| `draft` | boolean | | 保留文件但不入索引、不进 feed |
| `cite` | boolean | | 显示"Cite this post"；默认 true |
| `doi` | string | | 若通过 Zenodo 等获得 DOI |
| `canonical` | url | | 转载时指向原文 |
| `math` | boolean | | 可省略；管线会自动检测 |
| 其他 | any | | 透传，页面可通过 `frontmatter.extra` 读取 |

正文：GFM；`$…$` / `$$…$$` 公式；围栏代码块；脚注 `[^1]`；引用 `[@key]`（对应 `publications.yaml` 的 `key` 或文内 `references` 字段）；指令块 `:::theorem{title="…"}`、`:::note`、`:::warning`。

## 3. publications（YAML，来自 Notion 数据库）

Notion 里维护一个 publications 数据库，sync 导出为 `publications.yaml`（数组）。阶段 1 仅首页 Selected work 使用；阶段 3 加独立页与 Cite。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `key` | slug | ✅ | 稳定标识（如 `mou2025geometry`），也用于 Cite 的 BibTeX key |
| `title` | string \| `{en,zh}` | ✅ | |
| `authors` | string[] | ✅ | 按署名顺序；与 `profile.nameVariants` 匹配的加粗 |
| `year` | number | ✅ | |
| `venue` | string | ✅ | 期刊/会议名 |
| `type` | `journal` \| `conference` \| `preprint` \| `workshop` \| `thesis` | ✅ | |
| `selected` | boolean | | 进入首页 Selected work |
| `doi`、`arxiv` | string | | 自动生成链接 |
| `pdf`、`code`、`data`、`slides`、`poster`、`video`、`website` | url | | |
| `award` | string | | 如 "Best Paper" |
| `abstract` | string | | |
| `bibtex` | string | | 可选：手填的 BibTeX；缺省时阶段 3 由上述字段生成 |

BibTeX 文件导入作为可选 loader 留给模板用户（阶段 5）。

## 4. projects（YAML）

```yaml
- name: manifold-lab
  blurb: 一句话
  description: 一段话
  tags: [Python, JAX]
  year: "2023–now"
  status: active | maintained | archived
  href: https://…
  repo: https://github.com/…      # 构建期可选拉取 stars
  image: assets/manifold-lab.png
```

## 5. cv（JSON Resume）

遵循 https://jsonresume.org/schema，YAML 书写。扩展字段：`publicationsFromSite: true`（CV 的出版物段直接复用 §3）；所有文本字段允许 `{en, zh}`、`teaching[]`、`awards[]` 已在标准中。

## 6. profile（`site.config.ts`）

`name`（`{en,zh}` 允许）、`nameVariants`（所有语言的署名写法，用于作者高亮）、`role`、`field`、`affiliation`、`location`、`email`、`photo`、`tagline`、`bio[]`、`interests[]`、`links[]`（`label`、`href`、`kind: scholar|orcid|github|…`）。`orcid` 与 `scholar` 单独字段以便输出 JSON-LD `sameAs` 与 Highwire meta。

## 6a. pages（独立页面）

front-matter：`title`、`slug`、`lang`（必填）、`updated`、`nav`（boolean，是否进导航）、`order`。正文同 posts。

## 7. elog 映射（参考实现）

posts 数据库（借鉴 NotionNext 的 `type` 列思路，一个数据库同时承载文章与独立页面）：

| Notion 列 | 契约字段 | 备注 |
| --- | --- | --- |
| Title | `title` | |
| type（select：Post / Page） | 决定写入 `posts/` 或 `pages/` | 缺省视为 Post |
| lang（select：en / zh） | `lang` | 必填 |
| urlname（text） | `urlname` | 缺省时 sync 由标题 slug 化并写回告警 |
| date | `date` | elog 默认写 |
| updated | `updated` | elog 默认写 |
| status（select = Published） | 过滤条件 | 不进 frontmatter |
| categories / tags（multi-select） | 同名 | |
| cover | `cover` | elog 图床重写 |
| series / top / draft | 同名 | 可选列 |

publications 数据库：列名与 §3 字段同名；`authors` 为 multi-select 或逗号分隔文本；`selected` 为 checkbox。sync 用第二个 elog 配置（或直接用 Notion 官方 API）导出为 YAML。

sync 的归一化步骤：日期格式统一为 `YYYY-MM-DD`；`categories` 规范为数组；`urlname` 校验 slug；`lang` 缺省回填并告警；未知列进入 `extra`。

## 8. manifest.json

```json
{
  "generatedAt": "2026-08-22T10:00:00Z",
  "tool": { "name": "elog", "version": "x.y.z" },
  "entries": {
    "posts/geometry-of-uncertainty.en": { "path": "posts/geometry-of-uncertainty.en.md", "hash": "sha256:…", "updated": "2025-07-02" }
  },
  "errors": [{ "path": "posts/bad.md", "issues": ["date: required"] }]
}
```

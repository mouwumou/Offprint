# 内容契约

> 工具无关（ADR-002）。任何能产出下列格式的工具都是合法内容源；elog 是参考实现，其字段映射见 §7。
> 所有 schema 在 `src/core/schema/` 用 zod 定义，本文与代码不一致时以代码为准并回来改本文。

## 1. 目录约定（`content/`）与归属（ADR-014）

**博客环**（sync 独占写入）：`posts/`。**站点环**（作者仓库本地编辑，sync 永不触碰）：`profile.yaml`、`pages/`、`publications.yaml`、`projects.yaml`、`cv.yaml`、`talks.yaml`、`news.yaml`、`assets/` 中的站点资源。Notion `type=Page` 仅在 `SYNC_PAGES=true` 时写入 `pages/`（默认关闭）。

```
content/
├─ posts/<urlname>.<lang>.md   # 博客；同一 urlname 的不同语言是同一篇文章的译本
├─ pages/<slug>.<lang>.md      # 独立页面（About、Now…），Notion 中 type=Page
├─ profile.yaml                # 你是谁：姓名、职衔、bio、链接（§6，ADR-028）
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
| `description` | string | | 列表摘要与 meta description；缺省时 meta description 取正文前 160 字（去掉公式、列表符号、表格竖线），列表里的摘要不兜底 |
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
| `thumbnail` | string | | 列表条目缩略图：`assets/…` 路径或绝对 URL |
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

遵循 https://jsonresume.org/schema，YAML 书写。`basics`（姓名、头衔、邮箱、地点）可省略——以 `content/profile.yaml` 为准，写了则按 CV 逐字段覆盖（ADR-028）。扩展字段：`publicationsFromSite: true`（CV 的出版物段直接复用 §3）；所有文本字段允许 `{en, zh}`、`teaching[]`、`awards[]` 已在标准中。

## 5b. news（`content/news.yaml`，可选）

首页"近况"块的数据（批次 A / ADR-019 注册模块 news）。数组，每条：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `date` | ISO 日期 | ✓ | 显示与排序（新在前） |
| `text` | string 或 `{en, zh}` | ✓ | 一句话 |
| `href` | string | | 站内路径（`/blog/…`）或完整 URL |

文件缺失 = 首页不渲染 news 块。v1 无归档页（维护者决定）。

## 6. profile（`content/profile.yaml`，ADR-028）

你是谁。这是内容，不是配置：只有 `name` 必填，其余不填就不显示；各处渲染都经 `ContentProvider.getProfile()` 取。`cv.yaml` 的 `basics` 与之重叠的字段（姓名、头衔、邮箱、地点）以本文件为准，`basics` 仅作按 CV 覆盖。

| 字段 | 类型 | 显示在哪 |
| --- | --- | --- |
| `name` | LocalizedString（必填） | `<title>` 后缀、站名、页脚、feed 作者、结构化数据 |
| `nameVariants` | string[] | 出版物作者行里加粗你自己（各语言的署名写法） |
| `role` | LocalizedString | CV 页标题下、paper 主题首页大头区、结构化数据 `jobTitle`（scholar 首页不显示） |
| `field` | LocalizedString | 开了站名时的头部副标题、paper 大头区、分享图 |
| `affiliation` | LocalizedString | 页脚、paper 大头区、结构化数据 `affiliation`（scholar 首页不显示） |
| `location` | LocalizedString | CV 页、paper 大头区 |
| `email` | email | 首页快捷链接、CV 页、paper 大头区、结构化数据 |
| `photo` | `assets/…` 或 URL | 首页头像、paper 大头图、`og:image` |
| `tagline` | LocalizedString | paper 大头区、feed 描述、首页分享描述 |
| `bio` | LocalizedString[] | 首页头部段落、about 块 |
| `interests` | LocalizedString[] | about 块标签、结构化数据 `knowsAbout` |
| `orcid` / `scholar` | string | 结构化数据 `sameAs`（页面上的可见链接放 `links`） |
| `links` | `{ label, href, kind? }[]` | 首页快捷链接、页脚、paper 大头区、结构化数据 `sameAs` |

呈现可以逐个关：首页头部从 `content/home.yaml` 的 sections 里删掉 `bio-header`，页脚 `footer.enabled: false`，站名 `header.title: false`，结构化数据 `seo.person: false`。文件本身不能没有——站名与署名都需要 `name`。

## 6a. pages（独立页面）

front-matter：`title`、`slug`、`lang`（必填）、`updated`、`nav`（boolean，是否进导航）、`order`。正文同 posts。

## 7. elog 映射（参考实现）

posts 数据库（借鉴 NotionNext 的 `type` 列思路，一个数据库同时承载文章与独立页面）：

| Notion 列 | 契约字段 | 备注 |
| --- | --- | --- |
| Title | `title` | |
| type（select：Post / Page） | 决定写入 `posts/` 或 `pages/` | 缺省视为 Post |
| lang（select：en / zh） | `lang` | 可选列；缺省由 sync 语言探测回填（ADR-013），物化产物中仍必填 |
| urlname（text） | `urlname` | 可选列；有 `slug` 列则映射，缺省由标题 slug 化并告警（ADR-013） |
| date | `date` | elog 默认写 |
| updated | `updated` | elog 默认写 |
| status（select = Published） | 过滤条件 | 不进 frontmatter |
| categories / tags（multi-select） | 同名 | |
| cover | `cover` | elog 图床重写 |
| series / top / draft | 同名 | 可选列 |

~~publications 数据库~~：已取消（ADR-014 修订 ADR-008）——出版物在仓库直接编辑 `publications.yaml`，不再经 Notion。

sync 的归一化步骤：日期格式统一为 `YYYY-MM-DD`；`categories` 规范为数组；`urlname` 校验 slug；`lang` 缺省回填并告警；未知列进入 `extra`。

### 7.1 实测差异记录（P0-9，2026-08-23）

实测环境：elog **1.0.0-beta.2** —— 已改为插件式工作流（`@elog/cli` + `@elog/plugin-from-notion` + `@elog/plugin-to-local`，CLI 参数 `-c/-e`），**0.x 的 write/deploy 配置不再兼容**；`databaseId` 仍可用（内部换取第一个 data source id，对应 Notion 2025-09 的 data source API）。测试库为维护者现有 NotionNext 模板库（列：title / slug / date / type / category / tags / summary / status / password / icon，无 lang / urlname / updated / cover 列）。

elog 会自动补齐的字段（无需数据库列）：

- `updated`：取页面 last_edited_time；
- `cover`：取 Notion 页面封面（数据库无 cover 列亦可）。真实上传的封面是 S3 签名 URL（约 1 小时过期），图床或 `local` 转存必须开启；
- `urlname`：elog 写入的是 **Notion 页面 UUID**，不是人类可读 slug —— 契约的 `urlname` 须由 sync 从 `slug` 列映射覆盖。

与契约的差异及 P1-13 sync 归一化清单：

| 实测观察 | 契约期望 | sync 对策 |
| --- | --- | --- |
| `date`/`updated` 为 `'2021-11-05 08:00:00'`（空格分隔，非 ISO） | ISO date | 归一化为 `YYYY-MM-DD`；core schema 拒绝该格式，归一化必须发生在 sync 层 |
| 无 `lang` 列 | `lang` 必填 | sync 做语言探测回填（ADR-013，维护者不在 Notion 加列；LLM 翻译管线另行设计） |
| `slug` 列（NotionNext 命名） | `urlname` | 改名映射并覆盖 elog 的 UUID 值；缺 slug 的行按标题 slug 化并告警 |
| `category` 单值 select | `categories` | 改名；单值归一化 schema 已兼容 |
| `summary` 列 | `description` | 改名映射 |
| `status=Published` 过滤后仍混入 `type=Menu/SubMenu/Config/Notice` 行（slug 为 `#`、`-archive`、外链 URL 等，缺 slug 的产出 `未命名文档_<uuid>.md`） | 仅 Post / Page | Notion filter 加 type 复合条件，或 sync 按 type 分流丢弃非 Post/Page 行 |
| `password: ''`、`icon: ''` 空字符串 | 未定义字段透传 `extra` | 空串视为缺省剔除；非空则进 `extra` |
| `type`/`status` 出现在 front-matter | 不进 front-matter | 分流/过滤后剔除（`@elog/plugin-to-local` 的 `frontMatter.exclude` 可在导出期完成） |

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

## 8. 渲染容错（ADR-026）

契约要求标准 CommonMark + GFM，但 Notion 一类编辑器的导出会带两种"合法却不是作者本意"的结构，渲染管线对它们做定向容错：

- **四空格缩进的段落**（Notion 子块的导出形态）按普通 markdown 重新解析，而不是当缩进代码块：粗体、行内公式、链接照常渲染。真正的代码请用 ``` 围栏，围栏块不受影响。
- **表格单元格内的换行**把一行拆成多行时，同步产物里的该行会在渲染前重新拼接（以空格连接），表格照常解析。

- **没有 `description` 的文章**：meta description 从正文摘取前 160 字（`plainText()`：去代码、公式、图片、列表与表格标点、脚注标记），页面上的摘要行仍只在显式填写时出现。

同步期还会检查外链封面：`cover` 指向的外部 URL 若不可达或不是图片（如 NotionNext 遗留的 `source.unsplash.com/random`），会被剔除并给出警告，文章回落到自动生成的 OG 图；`notion.so/<uuid>` 这类**页面**链接不再被当作图片资产去下载。


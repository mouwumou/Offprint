# Notion 数据库模板

同步只认一个 Notion 数据库，列名固定。这一页给出这个数据库的完整定义：照着建，或者复制公开模板，或者直接沿用你手上的 NotionNext 数据库。三种来源同步起来没有区别。

<!-- TODO: 公开模板发布后，在这里加"复制模板"链接 -->

## 列定义

| 列 | 类型 | 必填 | 作用 |
| --- | --- | --- | --- |
| `Name` | 标题 | 是 | 文章标题 |
| `status` | 单选：`Published` / `Draft` | 是 | 只有 `Published` 会被同步；其余值都当草稿 |
| `type` | 单选：`Post` / `Page` | 否 | 缺省 `Post`。`Page` 是 About、Now 这类独立页面，只在 `SYNC_PAGES=true` 时同步进 `content/pages/` |
| `slug` | 文本 | 建议填 | 文章的 URL 片段，只允许小写字母、数字和连字符。留空时从标题派生；纯中文标题派生不出来，就会退回 Notion 页面 id，很难看，所以中文文章务必填 |
| `date` | 日期 | 是 | 发布日期；排序、归档、feed 都用它 |
| `category` | 单选 | 否 | 分类，一篇一个 |
| `tags` | 多选 | 否 | 标签 |
| `summary` | 文本 | 否 | 摘要：列表页的一句话介绍和 meta description。不填时从正文摘前 160 字 |
| `lang` | 单选：`en` / `zh` | 否 | 语言。不填时由标题和正文自动判断，判断结果会打在同步日志里 |
| `series` | 文本 | 否 | 系列名；同名文章互相链接 |
| `top` | 复选框 | 否 | 置顶 |

不是列但会被用到：

- **页面封面**：设了封面的文章，封面会成为文章头图和 OG 图。Notion 托管的图片链接几小时就过期，同步会把它下载进 `content/assets/`，之后不再依赖 Notion。
- **最后编辑时间**：自动成为 `updated`。
- **正文**：标题、列表、引用、代码、公式、表格、图片、提示框都会被转成 Markdown。Notion 子块的四空格缩进和表格单元格里的换行是两种常见的导出瑕疵，渲染时会被容错处理。

同步不认识的列会原样保留在 front-matter 的 `extra` 里，不会报错。

## 建一个新的

1. 新建一个全页面数据库，把标题列命名为 `Name`，按上表加列。选项值要一字不差：`Published`、`Post`、`Page`、`en`、`zh`。
2. 建两三行示例：一篇英文文章、一篇中文文章、一个 `type = Page` 的 About。每行填好 `slug` 和 `date`，`status` 设为 `Published`。
3. 在 Notion 的 *Settings → Connections* 建一个 integration，拿到 `secret_` 开头的 token。
4. 回到数据库页面，右上角 `···` → *Connections* → 选中这个 integration。**没有这一步同步会得到 401 或空结果。**
5. 数据库 id 是 URL 里 `notion.so/` 之后、`?` 之前的 32 位十六进制串。把它和 token 填进 `.env`，跑 `pnpm sync`。

想把它变成别人也能一键复制的公开模板：数据库页面 *Share → Publish*，打开 *Allow duplicate as template*，得到的链接就是模板地址。复制模板的人只需再做第 3、4、5 步。

## 沿用 NotionNext 的数据库

Offprint 的列名就是 NotionNext 的列名，这是有意为之：`slug`、`category`、`summary`、`type`、`status` 全部直接识别，不用改任何一列。差别只有几处：

- `type` 为 `Menu`、`SubMenu`、`Config`、`Notice` 的行是 NotionNext 的站点配置，同步会忽略它们。
- `password`、`icon` 列被忽略；文章密码保护不在 Offprint 的范围内。
- NotionNext 没有 `lang` 列，靠自动判断也能工作；混合中英文写作的话，建议加上这一列。
- 站点配置不再放在 Notion 里，全部在仓库的 `site.yaml`。

维护者自己的站点就是这样迁移的：原样接上 NotionNext 时期的数据库，一篇没改。

## 排错

| 现象 | 原因 |
| --- | --- |
| 401 或 "object not found" | 数据库没有分享给 integration，或 `NOTION_DB` 不是数据库 id |
| 同步成功但一篇都没有 | 没有任何一行 `status = Published`，或 `status` 列的值拼写不同 |
| 文章 URL 是一串 id | 该行没填 `slug`，且标题无法派生出 slug |
| 图片不显示 | 同步时没有开图片物化（`IMAGE_PLATFORM=local` 是默认值），或下载超时；看同步日志里的 warning |
| 中文文章出现在英文列表 | 自动语言判断错了，给这一行填 `lang` |

同步的运行方式、GitHub Actions 定时同步与 server 模式的秒级发布，见 [sync.md](sync.md)。

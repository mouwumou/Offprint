# 配置体系

Offprint 的配置只经**文本文件**，没有交互式向导，也没有后台。三层，各管一件事：

| 层 | 文件 | 管什么 |
| --- | --- | --- |
| 站点 | 根目录 `site.yaml` | 站点**长什么样**：个人资料、模块开关、导航、头尾、主题、语言、评论、跳转 |
| 内容 | `content/` | **你是谁**在 `content/profile.yaml`；页面里**显示什么**：出版物、项目、CV、独立页面、近况；首页**怎么排**在 `content/home.yaml` |
| 扩展 | `extensions/` | **装进来**的第三方主题与部件（只读安装，可调项全部回到 `site.yaml` 配） |

密钥不属于配置，只走 `.env`（见 [deployment.md](deployment.md)）。

## 编辑器补全与校验

两个 YAML 文件头一行都带 `# yaml-language-server: $schema=…`，装了 YAML 语言服务（VS Code 的 Red Hat YAML 插件即可）就有键名补全、类型提示与内联报错。Schema 文件在 `schema/`，由 zod 定义生成——改了配置 schema 的贡献者需要 `pnpm gen:schema` 重新生成。

所有键在构建时严格校验：**拼错键、类型不对会直接报错并指出位置**，不会静默忽略。这是刻意的——配置文件里的一个错字不该变成线上悄悄消失的一段。

双语字段两种写法都合法：

```yaml
title: Hello                      # 两种语言共用
title: { en: Hello, zh: 你好 }     # 分别指定
```

## `site.yaml` 分节走读

文件本身每一节都有中文注释与示例，这里只说各节回答什么问题；键的完整清单以文件与 schema 补全为准，不在此处重复。

- **`seo`** —— `person: false` 不在首页输出 schema.org Person（作者信息本身在 `content/profile.yaml`，见 [docs/CONTENT-CONTRACT.md §6](../CONTENT-CONTRACT.md)）。
- **`modules`** —— 站点有哪些部分。`blog` / `pages` / `publications` / `projects` / `cv` 五个开关；`false` 意味着路由、导航、打包一起消失。写成对象可覆盖落地页文案。`blog: { colophon: {…}, related: false, search: false }`：`colophon` 给一段双语文字才会在文末出现"后记"框（默认没有）；`related: false` 隐藏"相关文章"块；`search: false` 整个去掉站内搜索（不生成搜索页、不建索引、头部按钮消失；`header.search: false` 只是藏按钮）。`publications: { order: file }` 决定同一年内的顺序：`file`（按 `publications.yaml` 里写的顺序，默认——一作论文排前就靠它）、`key`、`title`；年份始终从新到旧。`publications: { detail: false }` 不生成单篇论文页：标题为纯文字，每篇的链接行（arXiv / code / video…）就是全部导航，和多数学术主页一样；单篇页面上的 Cite 弹窗与 Google Scholar 用的 Highwire meta 随之不再有。`cv: { indexable: false }` 让 HTML 简历页不进搜索引擎（robots noindex、不进 sitemap 与 hreflang、robots.txt Disallow）；`cv: { pdf: assets/cv.pdf, indexable: false }` 则让导航直接指向 PDF 文件、不生成 HTML 页，并 Disallow 该文件。
- **`nav`** —— 导航栏。不写则自动生成（首页 + 开着的模块 + `nav: true` 的独立页面）；写了就完全按列表来，条目可以是模块、独立页面或任意链接。
- **`layout.width`** —— 全站栏宽，`narrow`（学术窄栏，默认）或 `wide`（配 paper 主题）。全站统一，含导航与页脚。
- **`header` / `footer`** —— 头尾开关：站名两行、搜索、主题切换、语言切换、RSS；`footer.colophon` 给文字才显示署名行，默认只有 © 年份——模板不会在你的站上给自己署名。默认学术形态是纯导航行（名字已在首页正文里）。
- **`theme`** —— 外观。`name` 选主题（内置 `scholar` 默认、`paper`，或 `extensions/themes/` 里装的），`accent` 只换主色，`tokens` 逐个覆盖设计变量，`typography.proseSize` 定正文字号（默认 `1.0625rem` 即 17px；中文偏好 `1rem`），`options` 是该主题自己声明的选项。详见 [THEMING.md](../THEMING.md)。
- **`i18n`** —— 默认语言走根路径，其余带 `/zh` 一类前缀。`noindex: [zh]` 让某些语言**不进搜索引擎**：这些页面输出 robots noindex、不进 sitemap、不作为其他语言的 hreflang、robots.txt 里 Disallow；页面本身照常可访问。这挡得住守规矩的爬虫，挡不住存心抓取的。
- **`comments`** —— giscus，四个参数配齐才开启。
- **`redirects`** —— 旧路径到新路径的跳转，static 模式生成 meta-refresh 页，server 模式返回真实 3xx。

## `content/` 目录

| 文件 / 目录 | 内容 | 谁写 |
| --- | --- | --- |
| `profile.yaml` | 你是谁：姓名、职衔、机构、头像、bio、链接；站点各处都从这里取，字段与显示位置见 [docs/CONTENT-CONTRACT.md §6](../CONTENT-CONTRACT.md) | 你 |
| `home.yaml` | 首页从上到下的块与顺序；删掉即用内置默认 | 你 |
| `publications.yaml` | 出版物列表（Cite 弹窗、Highwire meta 由此生成） | 你 |
| `projects.yaml` | 项目列表 | 你 |
| `cv.yaml` | CV，JSON Resume 格式加双语/教学等扩展；驱动 CV 页与 PDF 导出 | 你 |
| `news.yaml` | 首页"近况"条目（可选） | 你 |
| `pages/*.md` | 独立页面（about、now…），markdown + front-matter | 你 |
| `posts/*.md` | 博客文章 | **同步管线独占**——开了同步后不要手改 |
| `assets/` | 图片等静态资源，站内以 `assets/…` 引用 | 你；同步也会把 Notion 图片物化进来 |
| `manifest.json` | 同步产物，server 模式的更新信号 | 同步管线独占 |

每个字段的规范见 [CONTENT-CONTRACT.md](../CONTENT-CONTRACT.md)；`pnpm sync validate` 可以只校验内容而不做同步。

### 首页排布 `home.yaml`

首页是一列"块"，顺序即显示顺序，每块可带选项：

```yaml
sections:
  - type: bio-header            # 名字 + 小头像 + bio + 快捷链接
  - type: news                  # 近况，count: 5
  - type: publication-list      # 论文条目，selectedOnly: true 只显精选
  - type: recent-posts          # 近期文章，count: 3
```

可用的块类型都列在文件头部注释里（`hero`、`about`、`prose`、`selected-publications`、`projects` 等），补全也会给出每块的选项。默认排布是学术紧凑型；`paper` 主题配 `hero` + `selected-publications` 会得到杂志式首页。

## 环境变量

只有三类东西走环境变量而不是 `site.yaml`：运行模式（`RUNTIME_MODE`）、部署地址（`SITE_URL`，同时也是 GitHub Actions 里的仓库变量）、以及一切密钥。全部列在 `.env.example`，带注释。

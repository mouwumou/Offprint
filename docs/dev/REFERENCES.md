# 参考项目

> **开发过程文档**：项目从 0 到 1 的工作文件，服务维护者与贡献者，随开发滚动更新。使用文档见 [docs/guide/](../guide/)。

> ADR-012。每个项目列出"借鉴什么 / 回避什么"。开发时遇到"这个功能别人怎么做的"先查这里，再去看源码。

## NotionNext — https://github.com/tangly1024/NotionNext

Next.js + Tailwind 的 Notion 博客系统，中文社区最流行的 Notion 建站方案，20+ 内置主题，Vercel 一键部署。

**借鉴**
- **Notion 侧的使用体验是产品的一半。** 用户复制一个模板数据库就能开始；数据库用 `type` 列区分 Post / Page / Menu / Config，`status` 列控制可见，`slug` 列控制 URL。Offprint 的 Notion 模板也应一键复制、列名与契约同名、带示例行。
- **`type = Page`** 让 About / Now / 任意独立页面也在 Notion 里维护 —— 已采纳进契约（`pages/`）。
- **`type = Config`** 允许在 Notion 里覆盖站点配置。我们不照搬（配置应在仓库里有类型校验），但可以在阶段 3 允许 Notion 覆盖少量运营性字段（公告、首页 tagline）。
- **部署文档的形态**："20 分钟上线"式的分步指南 + 常见问题，面向非开发者。阶段 4 文档站对标这个标准。
- **评论/统计/订阅的可插拔集成**（giscus、Twikoo、Umami 等）全部是配置开关。
- **主题切换**是其流行的主要原因之一；Offprint 阶段 5 的主题包机制可参考其 `themes/<name>` 目录约定，但我们只维护一个高质量学术主题，不追求数量。

**回避**
- **运行时直接读 Notion**（通过 `notion-client` / react-notion-x 走非官方 API）。后果：Notion 接口变动或限流直接导致站点故障；首屏依赖 Notion 响应；内容不可版本化。Offprint 一律先物化为文件（CLAUDE.md 约束 3）。
- **渲染 Notion 块树而非 markdown**：与 Notion 绑定过深，其他内容源无法接入，也不利于学术排版（公式、引用）的精细控制。
- **配置分散**：几百个 `blog.config.js` 字段 + 环境变量 + Notion Config 行三处来源，fork 用户难以把握。Offprint 只有 `site.yaml` 一处且有 zod 校验（ADR-021）。
- **大而全的主题目录**导致核心与主题耦合、升级困难。

## al-folio — https://github.com/alshedivat/al-folio

Jekyll 学术主页模板，GitHub 上学术个人站的事实标准。

**借鉴**（作为"专业性"的功能基准）
- 出版物：按年分组、作者高亮、每条的 PDF/Code/Slides/Poster/Video 按钮、Altmetric/Dimensions 徽章、`selected` 标记、Cite 弹窗。
- `news` 模块（短讯流）、`teaching`、`talks`、`projects` 卡片、CV 页由 JSON/YAML 驱动。
- Google Scholar meta 标签、ORCID 等身份链接的位置与样式。
- 极低的 fork 门槛：改一个 `_config.yml` 就能跑。

**回避**
- 纯静态、无动态发布；Liquid 模板难扩展；Ruby 环境对新手不友好。
- 出版物只认 BibTeX（我们以 Notion 为源，bib 为可选 loader）。

## elog — https://elog.1874.cool

Notion / 语雀 / 飞书 / FlowUs → markdown 的同步工具，Offprint 的参考内容源实现。

**借鉴 / 依赖**
- `matter-markdown` 输出格式、`filename: urlname`、增量缓存 `elog.cache.json`、图床重写（GitHub / 七牛 / OSS / COS / R2 / 本地）。
- 其 Hexo / Hugo / VitePress 适配文档展示了"约定 front-matter"的常见字段，契约尽量与之兼容，降低迁移成本。

**注意**
- 单人维护项目，API 与配置格式可能变化：所有 elog 调用集中在 `src/sync/elog-config.ts` 与 `run.ts`，升级时只改这两处。
- 它不产生索引/manifest —— 由 sync 负责。
- 出版物数据库是表格而非文章，elog 的文章导出并不贴合；sync 可直接用 Notion 官方 API 读数据库导出 YAML（CONTENT-CONTRACT §7）。

## 其他

- **Hugo Blox / academicpages**：模块化学术站的另两个参照，功能清单与 al-folio 重叠。
- **Astro 官方博客模板 / astro-paper / astro-citeproc 等生态**：实现阶段查阅具体的 remark/rehype 与 Pagefind 接法。

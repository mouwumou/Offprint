# 架构决策记录（ADR）

格式：编号、状态（已定 / 待敲定 / 已废弃）、背景、决定、后果。新决策追加在末尾，不改旧条目（改用"已废弃 → 见 ADR-x"）。

---

## ADR-001 项目名与包命名 — 已定

**背景**：需要一个学术语境、简短、npm 可用的名字。
**决定**：项目名 **Offprint**（中文：抽印本）。仓库 `offprint`；npm scope `@offprint`：`@offprint/core`、`@offprint/sync`；CLI `create-offprint`；同步命令 `offprint-sync`。
**后果**：npm 上 `offprint` 未被占用（2026-08-22 核查）；GitHub 存在同名小组织，不影响。

## ADR-002 内容契约工具无关 — 已定

**背景**：elog 是单人维护项目，不应成为单点依赖。
**决定**：契约定义为"markdown + YAML front-matter + 约定字段"，见 `CONTENT-CONTRACT.md`。elog 只是第一个参考实现，所有 elog 专属代码限制在 `src/sync`（拆包后为 `packages/sync`）。
**后果**：notion-to-md、Obsidian、手写 md 都可作为内容源；sync 层需做字段归一化。

## ADR-003 双运行模式共用一套模板 — 已定

**背景**：自用需要"发布即生效 + SEO"，公开模板需要纯静态；三类部署目标都要支持。
**决定**：`RUNTIME_MODE=static | server`，**static 是默认与基线，server 是可选运行时**（2026-08-22 与维护者确认）。页面只依赖 `ContentProvider`；static 模式构建期调用 provider 喂 loader，server 模式请求期调用。CI 双模式构建 + HTML 快照比对。
**理由**：两种模式输出相同 HTML；static 加"同步后自动重建"已覆盖"Notion 点发布即上线"的核心体验，且无常驻进程、无端点、错误在构建期暴露、可部署到 GH Pages。server 用一个常驻进程的全部成本（运维、安全面、可复现性、首字节）换取秒级发布与运行时功能（草稿预览、评论、按访客切换），详见 `PLANNING.md` §3.3 对比表。
**后果**：阶段 1 只交付 static（含自托管自动重建）；阶段 2 交付 server 作为产品能力；维护者自己的站先跑 static。必须维护 provider 抽象层；禁止页面直接使用框架的集合 API；server 关闭后站点须退化为 static 且行为一致。

## ADR-004 动态模式不引入数据库 — 已定

**背景**：见 `DYNAMIC-PUBLISHING.md`。
**决定**：内容存储抽象为 `ContentStore`（`fs` / `git` / `s3`）；自托管用共享 volume + sidecar 同步；Serverless 用 git/s3 + revalidate 端点。`manifest.json` 作为变更与 ETag 的唯一来源。
**后果**：无数据库运维；搜索在 server 模式下改用内存索引（MiniSearch）。

## ADR-005 前端框架 — 已定（Astro）

**背景**：`PLANNING.md` §2 的对比分析。
**决定**：Astro 5+，React islands 复用原型交互组件，Tailwind 4（2026-08-22 确认）。
**后果**：adapter 矩阵 `@astrojs/node`（Docker）/ `vercel` / `netlify` / `cloudflare`；static 模式直出 `dist/`。P0-11（Next.js spike）取消。

## ADR-006 仓库形态 — 已定（单包起步）

**决定**：单个 Astro 项目起步（2026-08-22 确认）。在 `src/` 内按未来包边界划目录：`src/core/`（schema、store、content、seo、theme、components）、`src/sync/`（elog 封装）、站点内容在 `content/`、配置 `site.config.ts`。`src/core` 与 `src/sync` 之间只允许通过 `src/core/schema` 互相依赖。
**后果**：阶段 4 拆成 `@offprint/core` / `@offprint/sync` / 模板仓库时只需移动目录，不改导入路径以外的代码；此前不得出现跨边界的随意 import（eslint `no-restricted-imports` 守住）。

## ADR-007 国际化 — 已定（中英双语）

**决定**：站点中英双语（2026-08-22 确认），阶段 1 即实现基础 i18n。
**设计**：
- 路由：默认语言在根路径，另一语言加前缀（`/zh/blog/…`）；默认语言由 `site.config.i18n.default` 决定（维护者已指定 **en**，2026-08-22）。
- 文章：Notion 里每种语言一页，`lang` 列（select：`en` / `zh`）必填；同一篇文章的两种语言共用同一个 `urlname`，站点据此自动互链并输出 `hreflang`。只有一种语言时，另一语言的列表显示该文并标注语言，不做机器翻译。
- UI 字符串：`src/core/i18n/{en,zh}.ts`，可插拔的模板用户可增删语言。
- profile / CV / projects：配置与 YAML 中允许字段为 `{ en: …, zh: … }` 或单字符串（视为所有语言共用）。
- 搜索索引与 feed 按语言分别生成。
**后果**：posts schema 的 `lang` 从可选改为必填（sync 缺省时回填默认语言并告警）；ROADMAP 的 i18n 任务从阶段 3 提前到阶段 1。

## ADR-008 出版物数据来源 — 已定（Notion，阶段 1 不做独立模块）

**决定**（2026-08-22 确认）：不引入 BibTeX。出版物跟随 Notion：在 Notion 里维护一个 publications 数据库，由 sync 经 elog 导出为 `content/publications.yaml`（每条一个对象，字段见 CONTENT-CONTRACT §3）。阶段 1 只在首页渲染 Selected work 列表，不做独立的出版物页与 Cite 弹窗；这些放到阶段 3。
**后果**：`publications` loader 读 YAML 而非 bib；Cite 功能（阶段 3）由 YAML 字段生成 BibTeX 文本，而不是反过来。bib 导入作为可选 loader 留给模板用户（阶段 5）。

## ADR-009 旧站迁移 — 推迟

**决定**（2026-08-22）：上线前再处理。机制（`redirects.yaml` → 各平台产物，P1-10）照常实现，清单由维护者在 P1-16 前提供。

## ADR-010 开源许可 — 已定（MIT）

**决定**：代码 MIT（2026-08-22 确认）。示例内容在仓库中显式声明仅作示例；维护者真实内容不随模板分发。

## ADR-011 设计稿定稿状态 — 已定

**决定**（2026-08-22 确认）：token（颜色、字体、圆角）按 `DESIGN-REFERENCE.md` 锁定；布局允许在移植中按 Astro 结构微调，不改视觉语言。

## ADR-012 参考项目 — 已定

**决定**：以 NotionNext、al-folio、elog 为参照，借鉴与回避清单见 `REFERENCES.md`。特别地：**不直接在运行时读 Notion**（NotionNext 的做法依赖非官方 API 且把站点可用性绑在 Notion 上），内容始终经 sync 物化为文件；但借鉴其"Notion 数据库 `type` 列区分 Post / Page / Config"的思路，允许在 Notion 中维护独立页面（About、Now 等）。

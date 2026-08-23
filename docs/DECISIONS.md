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

## ADR-013 lang / urlname 由 sync 派生，不在 Notion 加列 — 已定（方向），细节待敲定

**背景**：P0-9 用维护者现有 NotionNext 库实测（2026-08-23），库中无 `lang` / `urlname` 列。维护者决定（2026-08-23）不在 Notion 维护这两列：主要用中文写作，计划后续接入 LLM API 做文档语言探测与翻译（暂不实现、暂不设计细节）。
**决定**：**内容契约不变** —— 物化到 `content/` 的 markdown 中 `lang` 与 `urlname` 仍为必填（ADR-007、CONTENT-CONTRACT §2）；这两个字段改由 **sync 层派生**：`lang` 用语言探测回填（LLM 或轻量检测器，实现方式待定），`urlname` 沿用既定预案 —— 有 `slug` 列则映射，缺省由标题 slug 化生成并告警。跨语言译本生成（如中文原文 → 英文译本）作为 sync 的可选 LLM 增强步骤，模型选择、成本、缓存、幂等、是否写回 Notion 等细节留待专门设计，不阻塞阶段 1。
**后果**：ADR-007 中「Notion 里 lang 列必填」的采集侧要求废止，改为「sync 保证物化产物含合法 lang」；ADR-007 的路由、urlname 互链、hreflang 设计不变。P1-13 的 sync 归一化清单增加 lang 探测回填；CONTENT-CONTRACT §7 映射表相应调整。站点代码（core / pages）完全不感知此决定 —— 这正是契约层存在的意义（ADR-002）。

## ADR-014 站点归站点，博客归博客 — 已定

**背景**：维护者评审（2026-08-23）指出站点身份内容（About、出版物、CV、首页文本）不应走 Notion：低频、结构化、值得版本控制的内容应在仓库本地编辑；Notion 只服务高频流式写作。同时发现现行 sync 每次运行会整体替换 `content/pages/`，本地手写页面会被清空——缺失这条边界已造成真实缺陷。
**决定**：内容按两条环划分归属。**博客环**：`content/posts/` 由 sync 独占写入（Notion → elog → 归一化 → 原子发布）。**站点环**：`content/pages/`、`publications.yaml`、`projects.yaml`、`cv.yaml` 及全部配置由作者在仓库本地编辑，sync 永远不写。ADR-008 相应修订：**Notion 出版物数据库路径取消**（从未实现第二条 elog 链，现实本就如此；出版物变更频率低，直接改仓库文件）。Notion `type=Page` 路由降级为可选旁路（`SYNC_PAGES=true` 显式开启，默认关闭）。
**后果**：sync 的原子切换只覆盖 `posts/`；manifest 仍然覆盖全部集合（posts 来自 staging，其余来自 content 现状）。契约本身不变（ADR-002），变的只是"谁写哪个目录"。CONTENT-CONTRACT 增补各集合的归属说明。

## ADR-015 编排层：数据 / 部件 / 编排 / 皮肤四层正交 — 已定

**背景**：维护者评审指出首页布局、导航、头部标题被固化在主题代码里，作者无法塑形；参照 al-folio 的"一切编排皆数据"，但要规避其两个结构病：自由度靠散装配置换来、坏了不报错；用户改模板即失去升级路径。
**决定**：系统压成四层——**数据**（collections，契约类型化）、**部件**（widgets，吃 provider 数据的展示单元）、**编排**（site.config 中的数组与开关：`home.sections`、`nav`、`header`/`footer`、模块文案覆盖）、**皮肤**（design tokens，ADR-011）。原则："**可塑但不可坏**"：每个自由度都有 zod 形状与缺省值，缺省完全复现既有设计；错误配置在构建期带路径报错。自定义走**三级逃生梯**：① 编排级（改 config）→ ② 部件级（`src/site/widgets/` 放同名组件覆盖实现，由 pages 层解析注入，依赖方向不违反 ADR-006）→ ③ 主题级（阶段 4 拆包后替换皮肤包）。明确不做：可视化搭建器、config 内模板语言、逐处 CSS 旋钮。
**后果**：`modules.<name>` 从布尔扩宽为 `boolean | { title?, description?, … }`（文案覆盖，i18n 字典退为缺省值）；导航与模块解耦（`nav` 数组缺省时保持自动生成）；阶段 5 的插件 API 落点明确为"注册部件（+可选集合/路由）"。

## ADR-016 配置契约只暴露已实现的自由度 — 已定

**背景**：外部审计指出 schema 接受多个无实现的配置（`theme.fonts`、`theme.darkMode`、`modules.talks/news`、`runtime.store: 's3'`），形成"配置有效但行为不生效"的假 API，违背约束 4（schema 即校验）。
**决定**：schema 只收留有实现支撑的键。未实现的自由度直接从 schema 移除（strictObject 使其在构建期报错），待对应实现落地（talks/news 模块=阶段 5，字体/暗色偏好=主题包，s3=ADR-004 阶段 2+）时再回到 schema。`theme.accent` 就地实现（BaseLayout 注入 `--primary/--accent/--ring` 覆盖，两种配色同值）。
**后果**：配置文件里写了未实现的键会立刻失败而非静默无效；恢复这些键属于加法变更，不破坏既有配置。

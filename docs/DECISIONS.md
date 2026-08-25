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

## ADR-017 模板仓库与实例仓库分离 — 已定

**背景**：维护者指出验证部署链时不能把 Notion 等密钥配进本仓库的 GitHub 环境——本仓库是要公开的模板，必须保持干净。同时主仓库自身的编译与 Actions 测试又不可少。调研了两个参照系：al-folio 主仓库跑全套无密钥 CI 且 **deploy 工作流无门槛**（只用 `GITHUB_TOKEN` 推 Pages，主仓库跑=官方 demo，fork 跑=用户的站；需要主仓库专属资源的用 `if: github.repository_owner == …` owner 守卫）；NotionNext 靠**公开 demo Notion 页做缺省内容源**实现无密钥构建，镜像发 ghcr.io 只用 `GITHUB_TOKEN`。

**决定**：仓库分两种角色。**模板仓库**（本仓库，公开）：代码 + 样例内容 + 工作流文件 + 文档，GitHub 环境**永不配置任何外部密钥**；得益于 ADR-010（样例内容随模板）与 ADR-012（构建不请求 Notion），它的构建完全自足，因此 CI 全套照跑，`deploy-pages.yml` 也**不设门**——在模板上它发布官方 demo 站并充当每次 push 的真实部署测试（`actions/configure-pages` 带 `enablement: true` 消除首跑摩擦）。**实例仓库**（Use this template 生成，或 fork）：用户替换 `site.config.ts` 与 `content/`，在自己仓库配置 Secrets（`NOTION_TOKEN`、`NOTION_DB`，可选 `VERCEL_*`）与 Variables（`SITE_URL`、开关）。**只有碰外部密钥的工作流设变量门**：`sync.yml` 以 `vars.SYNC_ENABLED == 'true'` 为门、`deploy-vercel.yml` 以 `vars.DEPLOY_VERCEL == 'true'` 为门——模板不设变量则显示 skipped，永远绿。自托管（server 模式）的密钥只存在于服务器本地 `.env`，与 GitHub 无关。

**后果**：Notion 同步链是唯一无法在模板仓库验证的链路，其首跑验证在**私有测试实例**中进行（一次性 Use this template 仓库，验证后可删）；P1-16（维护者真实内容上线）发生在维护者自己的实例仓库，不在模板内。将来阶段 4 若发 Docker 镜像，学 NotionNext 发 ghcr.io（`GITHUB_TOKEN`，`IMAGE_NAME=github.repository`，fork 自动发到自己名下）；若出现模板专属发布物，用 al-folio 式 owner 守卫而非变量门。

## ADR-018 主题是契约化的可贡献单元，校验来自解析而非枚举 — 已定

**背景**：维护者两点纠偏：其一，Figma 原型是 AI 生成的概念图（受 Figma Make 风格影响），不应作为锁定的设计依据——ADR-011 把它的 token"锁定"从根上站不住；其二，`theme.preset: 'paper' | 'scholar'` 这种硬编码 union 违背开源初衷——第三方必须能贡献主题而不改核心代码。
**决定**：主题 = 一个符合契约的目录/包：`defineTheme({ name, tokens: {light, dark}, fonts, voice?, css?, shiki? })`。tokens 是全量 token 白名单表；fonts 声明字体加载与回退栈；voice 是少量腔调开关（kicker、节标签样式、头像处理等）；主题**不含 JS、不做布局分叉**（布局归部件层）。配置 `theme.name` 是任意字符串，**解析器即校验**：按 `src/site/themes/<name>` → 内置主题 →（阶段 4 后）npm 包顺序解析，解析失败构建期报错并列出可用主题。`theme.tokens` 允许用户在所选主题之上做全局 token 覆盖（这是皮肤层变量，不违反 ADR-015 "不做逐处 CSS 旋钮"的非目标）。`THEMING.md` 给出制作规范，质量门直接复用内容无关的深度测试套件（e2e/axe/lhci 对任何主题照跑）。
**修订**：ADR-011 的 token 从"系统锁定"降级为"paper 主题的定义"，Figma 原型降为概念参考；现有视觉迁移为第一个内置主题 `paper`，新的学术风默认主题按同一契约实现（一份规范至少要能表达两个差异明显的主题才算成立）。
**后果**：ADR-016 的原则（无假 API 面）保留，但机制从"收缩枚举"换为"解析即校验"。

## ADR-019 模块注册：合法性来自注册，配置校验由注册表组合 — 已定

**背景**：`modulesSchema` 的 strictObject 硬写死模块键集合，ADR-016 又以删键方式处理未实现的 talks/news——维护者指出这违背设计初衷：想要一个模块就在配置里加进来并提供实现，不需要就不放，系统不该用白名单做门卫。
**决定**：引入模块注册机制（下称"模块注册表"，指：模块以代码注册获得合法性，`modules` 配置的校验 schema 由已注册模块各自的 configSchema 组合而成；配置里出现未注册的模块名时报"未注册"而非"不在白名单"）。`defineModule({ id, configSchema?, nav?, copyDefaults?, collections?, widgets? })`（ARCHITECTURE §3 草图的落地）；内置五模块改为自注册；nav 缺省、模块文案缺省、首页 section 与模块的对应关系全部由注册信息驱动，不再各处硬编码。站点本地模块放 `src/site/modules/<id>/`，由 pages/integration 层聚合（ADR-006 边界内）；第三方路由经 integration `injectRoute` 注入。
**修订**：ADR-016 对 talks/news 的删除是正确结论、错误机制——它们（及任何新模块）以"注册即合法"的方式回归。
**后果**：P5-1 提前启动；插件 API（阶段 5）在此之上只剩"npm 分发 + 接口稳定化"。

## ADR-020 配置只经版本化文本文件 — 已定

**背景**：曾提议 `pnpm setup` 交互式向导降低上手门槛，维护者否决。
**决定**：一切配置的唯一事实来源是版本化文本文件（`site.config.ts`、`content/*.yaml`、`.env`）；不提供任何交互式写入工具。理由：交互产生的状态无法 diff、无法复现，与声明式配置不对称。降低门槛的手段是文档与带注释的样例配置（P4-4 配置参考）。

## ADR-021 站点配置 YAML 化，页面编排归 content — 已定

**背景**：site.config.ts 的 TS 语法（export/花括号/引号）对不写代码的学术用户可读性差；维护者确认"config 只放站点配置，每张页面长什么样（含首页）归 content 目录"。关键认识：本项目的配置报错质量来自 zod 校验而非 TS 文件格式（al-folio 的"写错不报错"是 Jekyll 不校验所致），TS 独有优势只剩编辑器补全与写逻辑的能力——前者可由 JSON Schema 补回，后者本不该存在（ADR-020 配置是数据）。
**决定**：站点配置迁移为根目录 **`site.yaml`**（纯数据；zod 校验不变，构建期报错带路径），文件头以 `# yaml-language-server: $schema=…` 指向由 zod 导出的 **JSON Schema**（提交进仓库，`pnpm gen:schema` 再生），主流 YAML 编辑器插件即获得自动补全/悬浮文档/实时红线——GitHub Actions yml 同款体验。**首页编排移入 `content/home.yaml`**（sections/width；缺失时用内置缺省），由 config 层消化成与原 config.home 相同的结构，页面代码不感知（约束 1 不变）。redirects 并入 site.yaml。site.config.ts 与根目录 redirects.yaml 退役。
**连锁**：站点本地模块的注册不再依赖"TS 配置文件 import 触发"（配置已非 TS），改为与主题机制对称的 **manifest 发现**：`src/site/modules/<id>/module.yaml` 声明 id/nav/copy/collections（fs 读取，无 import 边界与打包时序问题），行为代码（路由）由 integration 以 injectRoute 路径引用；自定义 configSchema 的模块形态留待贡献进内置或阶段 5 npm 化。三入口模型定稿：**site.yaml（站点配置）/ content/（内容与页面编排）/ src/site/（代码定制：themes、widgets、modules）**；.env 只承载密钥与部署量。配置只在构建/启动时读取，改配置 = 重建或重启（与原 TS 行为一致）。

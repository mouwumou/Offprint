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
**理由**：两种模式输出相同 HTML；static 加"同步后自动重建"已覆盖"Notion 点发布即上线"的核心体验，且无常驻进程、无端点、错误在构建期暴露、可部署到 GH Pages。server 用一个常驻进程的全部成本（运维、安全面、可复现性、首字节）换取秒级发布与运行时功能（草稿预览、评论、按访客切换），详见 [dev/PLANNING.md](https://github.com/mouwumou/Offprint/blob/dev/docs/dev/PLANNING.md) §3.3 对比表。
**后果**：阶段 1 只交付 static（含自托管自动重建）；阶段 2 交付 server 作为产品能力；维护者自己的站先跑 static。必须维护 provider 抽象层；禁止页面直接使用框架的集合 API；server 关闭后站点须退化为 static 且行为一致。

## ADR-004 动态模式不引入数据库 — 已定

**背景**：见 `DYNAMIC-PUBLISHING.md`。
**决定**：内容存储抽象为 `ContentStore`（`fs` / `git` / `s3`）；自托管用共享 volume + sidecar 同步；Serverless 用 git/s3 + revalidate 端点。`manifest.json` 作为变更与 ETag 的唯一来源。
**后果**：无数据库运维；搜索在 server 模式下改用内存索引（MiniSearch）。

## ADR-005 前端框架 — 已定（Astro）

**背景**：[dev/PLANNING.md](https://github.com/mouwumou/Offprint/blob/dev/docs/dev/PLANNING.md) §2 的对比分析。
**决定**：Astro 5+，React islands 复用原型交互组件，Tailwind 4（2026-08-22 确认）。
**后果**：adapter 矩阵 `@astrojs/node`（Docker）/ `vercel` / `netlify` / `cloudflare`；static 模式直出 `dist/`。Next.js 的试探性方案取消。

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

**决定**（2026-08-22）：上线前再处理。机制（`redirects.yaml` → 各平台产物）照常实现，清单在上线前提供。

## ADR-010 开源许可 — 已定（MIT）

**决定**：代码 MIT（2026-08-22 确认）。示例内容在仓库中显式声明仅作示例；维护者真实内容不随模板分发。

## ADR-011 设计稿定稿状态 — 已定

**决定**（2026-08-22 确认）：token（颜色、字体、圆角）按 [dev/DESIGN-REFERENCE.md](https://github.com/mouwumou/Offprint/blob/dev/docs/dev/DESIGN-REFERENCE.md) 锁定；布局允许在移植中按 Astro 结构微调，不改视觉语言。

## ADR-012 参考项目 — 已定

**决定**：以 NotionNext、al-folio、elog 为参照，借鉴与回避清单见 [dev/REFERENCES.md](https://github.com/mouwumou/Offprint/blob/dev/docs/dev/REFERENCES.md)。特别地：**不直接在运行时读 Notion**（NotionNext 的做法依赖非官方 API 且把站点可用性绑在 Notion 上），内容始终经 sync 物化为文件；但借鉴其"Notion 数据库 `type` 列区分 Post / Page / Config"的思路，允许在 Notion 中维护独立页面（About、Now 等）。

## ADR-013 lang / urlname 由 sync 派生，不在 Notion 加列 — 已定（方向），细节待敲定

**背景**：用维护者现有 NotionNext 库实测（2026-08-23），库中无 `lang` / `urlname` 列。维护者决定（2026-08-23）不在 Notion 维护这两列：主要用中文写作，计划后续接入 LLM API 做文档语言探测与翻译（暂不实现、暂不设计细节）。
**决定**：**内容契约不变** —— 物化到 `content/` 的 markdown 中 `lang` 与 `urlname` 仍为必填（ADR-007、CONTENT-CONTRACT §2）；这两个字段改由 **sync 层派生**：`lang` 用语言探测回填（LLM 或轻量检测器，实现方式待定），`urlname` 沿用既定预案 —— 有 `slug` 列则映射，缺省由标题 slug 化生成并告警。跨语言译本生成（如中文原文 → 英文译本）作为 sync 的可选 LLM 增强步骤，模型选择、成本、缓存、幂等、是否写回 Notion 等细节留待专门设计，不阻塞阶段 1。
**后果**：ADR-007 中「Notion 里 lang 列必填」的采集侧要求废止，改为「sync 保证物化产物含合法 lang」；ADR-007 的路由、urlname 互链、hreflang 设计不变。sync 归一化清单增加 lang 探测回填；CONTENT-CONTRACT §7 映射表相应调整。站点代码（core / pages）完全不感知此决定 —— 这正是契约层存在的意义（ADR-002）。

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

**后果**：Notion 同步链是唯一无法在模板仓库验证的链路，其首跑验证在**私有测试实例**中进行（一次性 Use this template 仓库，验证后可删）；维护者真实内容上线发生在维护者自己的实例仓库，不在模板内。将来若发 Docker 镜像，学 NotionNext 发 ghcr.io（`GITHUB_TOKEN`，`IMAGE_NAME=github.repository`，fork 自动发到自己名下）；若出现模板专属发布物，用 al-folio 式 owner 守卫而非变量门。

## ADR-018 主题是契约化的可贡献单元，校验来自解析而非枚举 — 已定

**背景**：维护者两点纠偏：其一，Figma 原型是 AI 生成的概念图（受 Figma Make 风格影响），不应作为锁定的设计依据——ADR-011 把它的 token"锁定"从根上站不住；其二，`theme.preset: 'paper' | 'scholar'` 这种硬编码 union 违背开源初衷——第三方必须能贡献主题而不改核心代码。
**决定**：主题 = 一个符合契约的目录/包：`defineTheme({ name, tokens: {light, dark}, fonts, voice?, css?, shiki? })`。tokens 是全量 token 白名单表；fonts 声明字体加载与回退栈；voice 是少量腔调开关（kicker、节标签样式、头像处理等）；主题**不含 JS、不做布局分叉**（布局归部件层）。配置 `theme.name` 是任意字符串，**解析器即校验**：按 `src/site/themes/<name>` → 内置主题 →（阶段 4 后）npm 包顺序解析，解析失败构建期报错并列出可用主题。`theme.tokens` 允许用户在所选主题之上做全局 token 覆盖（这是皮肤层变量，不违反 ADR-015 "不做逐处 CSS 旋钮"的非目标）。`THEMING.md` 给出制作规范，质量门直接复用内容无关的深度测试套件（e2e/axe/lhci 对任何主题照跑）。
**修订**：ADR-011 的 token 从"系统锁定"降级为"paper 主题的定义"，Figma 原型降为概念参考；现有视觉迁移为第一个内置主题 `paper`，新的学术风默认主题按同一契约实现（一份规范至少要能表达两个差异明显的主题才算成立）。
**后果**：ADR-016 的原则（无假 API 面）保留，但机制从"收缩枚举"换为"解析即校验"。

## ADR-019 模块注册：合法性来自注册，配置校验由注册表组合 — 已定

**背景**：`modulesSchema` 的 strictObject 硬写死模块键集合，ADR-016 又以删键方式处理未实现的 talks/news——维护者指出这违背设计初衷：想要一个模块就在配置里加进来并提供实现，不需要就不放，系统不该用白名单做门卫。
**决定**：引入模块注册机制（下称"模块注册表"，指：模块以代码注册获得合法性，`modules` 配置的校验 schema 由已注册模块各自的 configSchema 组合而成；配置里出现未注册的模块名时报"未注册"而非"不在白名单"）。`defineModule({ id, configSchema?, nav?, copyDefaults?, collections?, widgets? })`（ARCHITECTURE §3 草图的落地）；内置五模块改为自注册；nav 缺省、模块文案缺省、首页 section 与模块的对应关系全部由注册信息驱动，不再各处硬编码。站点本地模块放 `src/site/modules/<id>/`，由 pages/integration 层聚合（ADR-006 边界内）；第三方路由经 integration `injectRoute` 注入。
**修订**：ADR-016 对 talks/news 的删除是正确结论、错误机制——它们（及任何新模块）以"注册即合法"的方式回归。
**后果**：模块注册提前落地；插件 API 在此之上只剩"npm 分发 + 接口稳定化"。

## ADR-020 配置只经版本化文本文件 — 已定

**背景**：曾提议 `pnpm setup` 交互式向导降低上手门槛，维护者否决。
**决定**：一切配置的唯一事实来源是版本化文本文件（`site.config.ts`、`content/*.yaml`、`.env`）；不提供任何交互式写入工具。理由：交互产生的状态无法 diff、无法复现，与声明式配置不对称。降低门槛的手段是文档与带注释的样例配置（配置参考）。

## ADR-021 站点配置 YAML 化，页面编排归 content — 已定

**背景**：site.config.ts 的 TS 语法（export/花括号/引号）对不写代码的学术用户可读性差；维护者确认"config 只放站点配置，每张页面长什么样（含首页）归 content 目录"。关键认识：本项目的配置报错质量来自 zod 校验而非 TS 文件格式（al-folio 的"写错不报错"是 Jekyll 不校验所致），TS 独有优势只剩编辑器补全与写逻辑的能力——前者可由 JSON Schema 补回，后者本不该存在（ADR-020 配置是数据）。
**决定**：站点配置迁移为根目录 **`site.yaml`**（纯数据；zod 校验不变，构建期报错带路径），文件头以 `# yaml-language-server: $schema=…` 指向由 zod 导出的 **JSON Schema**（提交进仓库，`pnpm gen:schema` 再生），主流 YAML 编辑器插件即获得自动补全/悬浮文档/实时红线——GitHub Actions yml 同款体验。**首页编排移入 `content/home.yaml`**（sections/width；缺失时用内置缺省），由 config 层消化成与原 config.home 相同的结构，页面代码不感知（约束 1 不变）。redirects 并入 site.yaml。site.config.ts 与根目录 redirects.yaml 退役。
**连锁**：站点本地模块的注册不再依赖"TS 配置文件 import 触发"（配置已非 TS），改为与主题机制对称的 **manifest 发现**：`src/site/modules/<id>/module.yaml` 声明 id/nav/copy/collections（fs 读取，无 import 边界与打包时序问题），行为代码（路由）由 integration 以 injectRoute 路径引用；自定义 configSchema 的模块形态留待贡献进内置或阶段 5 npm 化。三入口模型定稿：**site.yaml（站点配置）/ content/（内容与页面编排）/ src/site/（代码定制：themes、widgets、modules）**；.env 只承载密钥与部署量。配置只在构建/启动时读取，改配置 = 重建或重启（与原 TS 行为一致）。

## ADR-022 extensions/ 扩展目录：只读安装、配置单点、主题可携带部件 — 已定

**背景**：主题与模板的第三方生态需要一个不触碰 `src/` 的落点；维护者确认目录方案并加两条约束——主题的一切可调项必须住在 site.yaml（"theme 配置都在 site 里"），装进来的东西不该被用户编辑（规避 Hugo 社区主题"用主题先改主题目录"的 fork-即-冲突反模式）。
**决定**：仓库根新增 **`extensions/`**，原 `src/site/` 三机制平移至此并退役：`extensions/themes/<name>/`（主题包）、`extensions/widgets/<type>.astro`（站点散件部件覆盖，属用户代码不受只读约束）、`extensions/modules/<id>/`（站点模块）。**四目录四动词**：site.yaml 配置它、content/ 写它、extensions/ 装它、src/ 别动它。两条原则：①**只读安装**——扩展包升级即整目录替换；②**配置单点**——`theme.options` 落地：主题在 theme.json 里声明式定义自己的选项（类型/默认值/枚举/说明），用户在 site.yaml `theme.options` 填值，构建期按声明校验（未知选项、类型不符即报错），`pnpm gen:schema` 把已安装主题的选项声明并入 site.yaml 的 JSON Schema（编辑器对主题选项同样有补全与红线），部件经 `currentTheme()` 读取解析后的值。
**修订 ADR-018**：主题包可携带 `widgets/` 目录经既有部件机制提供布局（"主题不做布局"修订为"主题的布局经具名部件承载"）；查找优先级链 = **站点散件 > 启用主题的 widgets > 内置**（Hugo lookup order 同款），装了主题仍可在站点层压过任意单件而无需 fork 主题。技术前提已 spike 验证：vite 构建期 glob 可指向 src 之外的项目根内目录；主题携带部件用"glob 全部主题的 widgets + 按启用主题运行时过滤"实现。ADR-006 边界扩展：`src/core` 不得 import `extensions/**`。
**后果**：内页模板不做任意文件覆盖（升级即碎），走"具名部件清单扩容"路线（后续任务）；整页级替换属模块职责（injectRoute）。npm 分发（阶段 4）在解析链追加 node_modules 查找即可接上。

## ADR-023 子路径部署：SITE_URL 的路径即 Astro base，内容不携带前缀 — 已定

**背景**：GitHub Pages 的默认地址是 `user.github.io/<仓库名>/`，模板自己的 demo 与每个"Use this template"出来的实例都落在子路径上；而站内链接一律按域名根路径生成，子路径下全断（发布前审计发现，2026-09-04）。
**决定**：不加新配置项。`SITE_URL` 是唯一来源：`astro.config` 取其 origin 为 `site`、取其 pathname 为 `base`（`https://u.github.io/repo` → `/repo`）；Astro 把 base 烤进各构建产物的 `import.meta.env.BASE_URL`，`src/core/config/base.ts` 归一化后由 `langPrefix()` 统一注入——所有内部链接都经它组合，主页统一为斜杠结尾（`/`、`/zh/`、`/repo/zh/`，与 canonical 一致）。**内容文件永不携带前缀**（news/profile/CV 里作者手写的 `/blog/x`、sync 写入的 `/assets/x`）：渲染边界上由 `contentHref()`（YAML 字段）与 markdown 管线（rehype）各应用一次；Astro 只给 redirect 的来源加 base，目标由 config 补上。server 模式的 `/assets` 与冷启动判定接受带前缀与不带前缀两种路径（Astro 的服务端路由本身对 base 宽松，不带前缀的请求也会被应答）。
**验收**：`e2e/base-path.spec.ts` 用 `SITE_URL=…/sub` 构建 static 与 server 两份，爬取全部路由：每个页面 200，页面引用的每个内部 URL 必须以 `/sub/` 开头且可达（含 canonical/hreflang/og:image/feed/redirect 目标），pagefind 结果链接也在 `/sub/` 下。爬虫是内容无关的，同时抓出了一个旧 bug（标签/分类页的 hreflang 指向不存在的另一语言页面，改为按"携带该词的语言"生成）。
**后果**：`SITE_URL` 必须是绝对 URL（否则构建报错）；server 模式下 base 在构建期固定，运行时 `REVALIDATE_URL`/webhook 地址要带同样的前缀；`serve-dist.mjs` 增加第三个参数以挂载子路径。

## ADR-024 运行模式在构建期固定进产物，运行时不再读 RUNTIME_MODE — 已定

**背景**：`src/middleware.ts` 与 `server/watch.ts` 原在**请求期**读 `process.env.RUNTIME_MODE` 决定是否启用 server 专属分支（资源伺服、冷启动页、manifest 监听）。Docker 镜像设了这个变量，所以生产没事；但 e2e 启动 node 进程时没设，双模式一致性测试一直在跑一个"中间件全关"的 server——ADR-023 的子路径爬虫第一次真正请求 server 模式的 `/assets/*` 才暴露出来（2026-09-07）。
**决定**：`astro.config` 用 vite `define` 把 `import.meta.env.RUNTIME_MODE` 内联为构建期字面量，中间件与 watch 只看它。static 构建里该分支是字面量 `false`（server 代码成为死代码，约束 2 更硬）；server 构建启动不依赖任何环境变量。`docker/` 里的 `RUNTIME_MODE=server` 保留但已无作用。
**后果**：一份产物只属于一种模式，不能"同一份 build 靠环境变量切模式"（本来也不行：adapter 在构建期就定了）。核心代码读 `import.meta.env` 时必须写完整表达式 `import.meta.env.X`——访问整个 env 对象会让 Astro 把整张 env 表内联进客户端包，含构建模式键，导致岛屿 hash 在两种模式下不同、HTML 不一致。

## ADR-025 部署目标是完整运行时；不为 serverless 平台做专属工程 — 已定

**背景**：维护者的 NotionNext 站在 Vercel 上出过问题，这是 Offprint 的起点之一。发布收尾阶段曾把 Vercel/Netlify 一键按钮的实测列为优先事项并提议平台专属配置（vercel.json、netlify.toml、平台环境变量兜底），维护者明确否定（2026-09-07）："不会为了 Vercel 做任何大规模调整，至多最终运行时做部署微调；大部分运行在 Docker、Cloudflare 这类带完整运行时的环境。"
**决定**：一等公民是 **GitHub Pages（static 默认路径）与容器（Docker compose 双套；同一镜像可上任何有持久卷与常驻进程的平台）**。static 产物"任何静态托管都能放"是通用陈述，不给任何一家做专属文件或代码分支。**server 模式只做容器，不做 serverless 适配**：不引入 `@astrojs/vercel`/Workers 一类 adapter，不为无持久磁盘、有函数超时的运行时改造内容卷、同步子进程与进程内缓存。README 撤下 Vercel/Netlify 按钮；早前的可选 Vercel 静态部署工作流随即删除（2026-09-07），连同 sync 工作流里的触发与文档提法。
**后果**：ROADMAP 中"Vercel/Netlify/CF adapter"方向作废；`CONTENT_STORE=git/s3` 仍保留（它们服务于多实例容器与内容外置，不是为 serverless 存在的）。贡献者提交平台专属适配时，先对照本条。

## ADR-026 渲染管线对内容源导出的定向容错；封面死链在同步期剔除 — 已定

**背景**：第一批真实内容（NotionNext 数据库，2026-09-08）暴露出四类问题：Notion 子块导出为四空格缩进段落，被 CommonMark 当成缩进代码块，粗体与行内公式失效；单元格含换行的表格拆成多行，GFM 不识别；NotionNext 遗留的 `source.unsplash.com/random` 封面早已失效，站上成了破图并进了 og:image；`notion.so/<uuid>` 页面链接被资产匹配器当图片去下载（403）。
**决定**：容错放在**渲染管线**（`src/core/content/markdown.ts`）而不是同步归一化——这样对任何内容源、任何已落盘的内容都立即生效：无围栏的缩进代码块按 markdown 重新解析；开了 `|` 却没闭合的表格行与后续行拼接。围栏代码块不受影响，契约文档 §8 记录该行为。封面死链只能在有网络的**同步期**判断：`cover` 为外部 URL 时做 HEAD（405 回退 GET）校验，不可达或非 image/* 则剔除并警告。`notion.so` 主机只有 `/image/`、`/signed/` 路径算资产。
**同批配置项**（非结构性，记录在此便于追溯）：`theme.typography.proseSize`（正文字号从 base.css 硬编码的 19px 改为主题声明 + 用户覆盖，默认 17px）；`i18n.noindex`（语言级 robots noindex + 不进 sitemap/hreflang + robots.txt Disallow）；`modules.cv.pdf` / `indexable`（CV 直链 PDF、不生成 HTML 页、可 Disallow）。
**后果**：契约仍是标准 markdown，容错是渲染侧的宽容而非新语法；引入新的内容源时先跑一遍真实内容，再决定是否补规则。

## ADR-027 模板不在用户站点上署名：文末与页脚的 colophon 默认为空 — 已定

**背景**：页脚默认显示"在 Notion 写作 · 经 elog 发布"，文末默认有一段介绍发布链路的"后记"。维护者的站上线后指出这两处让人不适（2026-09-09）：它们是模板在讲自己的故事，不是作者想说的话。
**决定**：两处 colophon 的缺省值改为**空**——只有 `site.yaml` 给了文字才显示（`footer.colophon`、`modules.blog.colophon`），i18n 里不再放默认文案。页脚只剩姓名、机构（如有）、链接与 © 年份；页脚间距随主题密度（compact 更紧）。
**后果**：模板 demo 也不再自我署名；想展示该功能的实例在配置里写自己的话。原则推广：默认值只能是中性的（空、作者信息），任何"模板视角"的文案都不做默认。

## ADR-028 作者信息是内容：profile 从 site.yaml 移到 content/profile.yaml，经 ContentProvider 提供 — 已定

**背景**：ADR-021 定的分工是"site.yaml = 站点长什么样，content/ = 页面里显示什么"，但"你是谁"（姓名、职衔、bio、链接）一直住在 site.yaml，违反了自己的原则；维护者上线后发现填了一堆字段却在自己的主题里看不到效果（`role` 在 scholar 首页不显示），并提出"积木式"：site.yaml 只管结构，作者信息也应是可替换、可关的内容（2026-09-09）。
**决定**：新增 `content/profile.yaml`（schema 在 `src/core/schema/profile.ts`，编辑器补全 `schema/profile.schema.json`），site.yaml 的 `profile` 段删除；仍留着的实例会得到指向迁移的报错。profile 走 **ContentProvider.getProfile()**——头部、页脚、`<title>`、feed、分享图、JSON-LD、首页部件、CV 页、文章页全部改从 provider 取，这比原来更符合约束 1，server 模式下改 profile 也即时生效。`cv.yaml` 的 `basics` 改为可选覆盖，profile 是唯一来源。呈现逐个可关（首页 `bio-header` 段、`footer.enabled`、`header.title`、新增 `seo.person`），但文件必须存在且至少有 `name`——站名与署名不能没有。每个字段"显示在哪"写进 CONTENT-CONTRACT §6 与样例文件注释。
**后果**：site.yaml 从此不含任何内容，只有 modules、nav、layout、header、footer、theme、i18n、seo、comments、redirects；模块落地页文案（`blog.title` 等）视为标签留在 site.yaml。实例迁移是机械的：把 `profile:` 段整体挪到 `content/profile.yaml` 并去掉两格缩进。

## ADR-029 仓库布局约定：生成物进 `.offprint/`，社区文件进 `.github/`，e2e 工具配置进 `e2e/`，用户手写文件不做格式门禁 — 已定

**背景**：根目录曾同时堆着 7 个 `dist*` 目录、`test-results/`、`.lighthouseci/`、同步留下的 elog 临时配置、6 个 md 与 6 个工具配置，维护者要求整理（2026-09-09）。同期实例 CI 因 `site.yaml` 未按 prettier 格式化而长期红灯。
**决定**：①一切生成物（e2e 的静态/服务端/子路径构建、Playwright 结果、Lighthouse 报告、同步临时配置、发布中间产物）统一放 **`.offprint/`**（gitignored、dockerignore、eslint 忽略），根目录只保留真正的 `dist/`；`.lighthouseci/` 是 lhci 自身的工作目录，无法迁移，保持忽略。②CONTRIBUTING、CODE_OF_CONDUCT、SECURITY 放 **`.github/`**（GitHub 原生识别），中文 README 放 `docs/`；根目录 md 只剩 README、CLAUDE、LICENSE。③Playwright 与 Lighthouse 配置与 spec 同住 **`e2e/`**，npm 脚本传 `--config`；prettier 配置并入 package.json，`.prettierignore` 保留。④**用户手写的文件不做格式门禁**：`site.yaml`、`content/`、`*.md` 均豁免 `format:check`——格式检查是给代码的，不是给作者的。`schema/` 维持原位（被三个 YAML 头部引用且需入库）。
**后果**：新增生成物一律进 `.offprint/`；`upgrade-from-template.sh` 的排除列表、`.dockerignore`、eslint ignores 以此为准；实例升级后旧位置的配置文件由 `--delete` 清掉。

## ADR-030 分支模型：dev 是工作分支，main 是不含开发文档的发布快照 — 已定

**背景**：模板公开后，根目录的 `CLAUDE.md` 与 `docs/dev/`（规划、路线图、参考项目、设计原型来源）是给维护者与 AI 协作用的工作文件，对用模板的人是噪音；维护者要求 main 做成干净目录、开发另起分支（2026-09-09）。
**决定**：`dev` 为唯一的工作分支，一切提交在此；`main` 只接受 `scripts/release-main.sh`（`pnpm release:main`）产出的**快照提交**——把 dev 的文件树整体铺到 main，删除 dev 已删的文件，再剔除 `CLAUDE.md` 与 `docs/dev/`。不用 merge：合并会在这些被剔除的文件上反复冲突，快照则让 main 历史线性、每次差异极小。CI 在两个分支都跑，Pages demo 与 "Use this template" 只来自 main。设计文档（ADR、ARCHITECTURE、CONTENT-CONTRACT、DYNAMIC-PUBLISHING）留在 main；其中引用开发文档的地方改为指向 dev 分支的绝对链接，两个分支上都能点。
**后果**：main 上永远不手工提交，也不接 PR（PR 基于 dev）；实例升级脚本以 main 检出为源并排除 `docs/dev/`；`CLAUDE.md` 只在 dev，模板用户若用 Claude Code，得到的是自己实例里的说明而不是模板内部的开发约束。

## ADR-031 Compose 文件放仓库根目录，`.env` 是自托管与本地同步的唯一入口 — 已定

**背景**：部署文档写"根目录 `cp .env.example .env`，再 `docker compose -f docker/compose.*.yaml up`"，但 Compose 只从 compose 文件所在目录读 `.env`——根目录的文件从未被读到，自托管一直跑在无凭据的退化态（远程 Docker 主机上的探针证实：根目录 `.env` 不读，`--env-file .env` 或放到 `docker/.env` 才读）。`.env.example` 还列着死键（`SYNC_CRON`，实际是 `SYNC_INTERVAL`）与从未实现的 s3 键，缺 compose 真在读的端口与保留数。
**决定**：`compose.static.yaml`、`compose.server.yaml` 移到仓库根目录（Dockerfile 与 Caddyfile 留在 `docker/`，`context: .`）——`.env` 与 compose 同目录，`pnpm sync` 与 Docker 读同一份，不靠任何参数或包装脚本。`.env.example` 只列真实存在、注明谁在读的键，按"站点 / Notion 同步 / Docker 静态 / Docker server / 高级"分组；`RUNTIME_MODE` 不再出现（构建期由 npm 脚本传入）。文档要求部署前用 `docker compose -f … config | grep NOTION_DB` 确认 `.env` 被读到。
**后果**：根目录多两个 compose 文件，换来零配置正确性；实例升级脚本会把旧的 `docker/compose.*.yaml` 删掉。GitHub Pages 路径与本地构建仍不读 `.env`。首次带凭据验证（2026-09-10）随即暴露并修掉了第二个问题：静态同步容器里 `content/posts` 来自镜像层，overlayfs 不允许重命名这类目录（`EXDEV`），原子切换改为在 `EXDEV` 时回退到复制加删除；两套 compose 均从冷启动验证到首篇文章上线。

## ADR-032 主题契约 v2：部件注册表、样式挂钩、腔调预设化，验收即"零 src 改动的主题跑通全套 e2e" — 已定

**背景**：v1 主题只能换肤——15 个色彩 token、字体、正文字号，再在核心预置的两种人格（`labels` / `density` / `photo` 枚举）里二选一，外加覆盖首页 9 个部件。核心组件里有 72 处按腔调分支的样式，327 处 Tailwind 工具类而语义类只有一个，主题 CSS 无处可挂；页面骨架（头尾、出版物行、文章行）完全由核心决定。维护者要求主题"有更高的自由度和设计，而不只是普通样式"（2026-09-11）。
**决定**：①**部件注册表**（`src/core/widgets/registry.ts`）：一条查找链"站点散件 > 主题部件 > 内置"覆盖首页各节与 `publication-row` `post-row` `site-header` `site-footer`；页面层 `src/pages/_widgets.ts` 用编译期 glob 收集、经 integration 的 page-ssr 脚本在任何渲染前注册，核心不 import extensions；非法部件名构建报错。②**样式挂钩**：每个部件根与关键子元素带稳定的 `data-part`（69 个），首页各节带 `data-section`，`<html>` 带 `data-theme-name` 与三个腔调值；挂钩名是契约，改名走 ADR；Tailwind 类名不是契约。③**腔调预设化**：按 density/labels 切换的样式改为语义类（`page-top` `article-head` `kicker` `ui-label` …）在 base.css 的 components layer 里按 `[data-density]` / `[data-labels]` 定义；组件里只剩 15 处结构性分支。theme.css 不在 layer 内，天然覆盖一切，因此允许结构性覆盖（v1 禁止）。④**验收**：`scripts/theme-check.sh` 复制仓库、装主题、跑双构建与全套 e2e；示例主题 `extensions/themes/gutter`（随模板分发；只用挂钩把出版物页改成年份左栏排布，自带页脚部件、一条选项声明与逐文件说明的 README）与内置 `paper` 在模板仓库的 CI 固定过关（实例仓库不跑这两条：`is_template` 为假时跳过，实例的 CI 只验证自己启用的主题）。
**后果**：`publication-list` 首页节从此跟随主题腔调（此前不分语域）；两套内置主题在 8 页截图上像素级或亚像素级一致。文章页头、CV 各段尚未部件化，先用挂钩。npm 分发形态不变。


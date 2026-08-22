# Offprint — 给 Claude Code 的项目说明

Offprint（抽印本）是一个开源、可插拔、易部署的学术个人网站系统：学术首页 + 博客 + 项目 + CV。
差异点：博客内容在 Notion 等工具里编排，经 elog 转成**约定格式的 markdown**发布；站点同一套代码既能编译成纯静态站，也能以 SSR 运行实现"发布即生效"。

维护者：Q（mouwumou@gmail.com）。语言：文档中文，代码/标识符/提交信息英文。

## 先读这些

| 文件 | 内容 | 何时读 |
| --- | --- | --- |
| `docs/DECISIONS.md` | 已定与待定的架构决策（ADR） | **每次开工前**，待定项未敲定前不要实现依赖它的代码 |
| `docs/ARCHITECTURE.md` | 分层、双模式、仓库结构、包边界 | 动任何结构性代码前 |
| `docs/CONTENT-CONTRACT.md` | 各内容集合的 front-matter / 数据 schema | 写 loader、schema、页面时 |
| `docs/DYNAMIC-PUBLISHING.md` | server 模式发布链、`ContentStore`/`ContentProvider` 接口、compose | 阶段 2 |
| `docs/DESIGN-REFERENCE.md` | 设计 token、版式、原型组件清单 | 写任何 UI 时 |
| `docs/ROADMAP.md` | 阶段与任务清单，勾选进度 | 选下一个任务时 |
| `docs/PLANNING.md` | 原始规划（框架分析、功能清单、风险） | 需要"为什么"时 |
| `docs/REFERENCES.md` | 参考项目（NotionNext、al-folio、elog）借鉴与回避 | 设计 Notion 侧体验、主题、部署流程时 |

## 不可违反的约束

1. **页面只依赖 `ContentProvider`**。页面/组件不得直接读文件系统、直接 `import` markdown、或直接用 Astro `getCollection`；static 模式下 provider 喂给 content loader，server 模式下 provider 在请求期调用。这是双模式不分叉的唯一保证。
2. **static 是基线，server 是可选**（ADR-003）。任何改动后 `pnpm build:static` 与 `pnpm build:server` 都要成功；CI 会对两种模式做 HTML 快照比对。server 专属代码（端点、文件监听、运行时索引）不得进入 static 构建产物。阶段 1 不实现 server 功能，但不得写出只能在 server 下工作的页面。
3. **内容契约是工具无关的**。schema 只描述 "markdown + YAML front-matter + 字段"，不得出现 elog 专属逻辑；elog 相关代码只能住在 `src/sync`。**不得在运行时或构建时直接请求 Notion**（ADR-012），内容一律先经 sync 物化到 `content/`。
4. **schema 即校验**。所有集合用 zod 定义一次，构建期与请求期共用；不合规内容应报错或被标记，绝不静默渲染成坏页面。
5. **模块可关**。`site.config.ts` 里关掉的模块不生成路由、不出现在导航、不进打包。新增功能先问"它是哪个模块的、配置项叫什么"。
6. **零 JS 默认**。只有真正交互的组件（主题切换、Cite 弹窗、TOC 高亮、搜索）才做 island；其余全部服务端渲染。
7. **学术 SEO 不可省**：每篇文章/出版物页必须输出 canonical、OG、JSON-LD，出版物页额外输出 Highwire Press `citation_*` meta。
8. **不提交密钥**。Notion token、图床密钥、revalidate secret 一律走环境变量，`.env.example` 列全。
9. **双语是一等公民**（ADR-007）。每个页面都要在两种语言下可达；新增 UI 文案必须进 `src/core/i18n/`，不得硬编码；内容字段支持 `{en, zh}` 形式。
10. **包边界**（ADR-006）。`src/core` 不得 import `src/sync` / `src/site` / `src/pages`；`src/sync` 只能 import `src/core/schema`。

## 工作方式

- 从 `docs/ROADMAP.md` 取当前阶段的任务，完成后勾选并在 PR/commit 里引用任务编号。
- 做出新的结构性决定时，在 `docs/DECISIONS.md` 追加一条 ADR（状态、背景、决定、后果），不要只写在代码注释里。
- 优先小步提交：一个任务一个 commit；提交信息用 Conventional Commits（`feat(core): …`、`docs: …`）。
- 新建包 / 目录前先对照 `docs/ARCHITECTURE.md` 的结构；需要偏离时先改文档再改代码。
- 写 UI 时对照 `docs/DESIGN-REFERENCE.md` 的 token 与版式，不要引入第二套颜色/字体/圆角。
- 依赖选择偏保守：少而稳、有类型、维护活跃；引入新依赖在 PR 描述里说明理由。

## 常用命令（脚手架建好后补齐）

```
pnpm install
pnpm dev                 # Astro 开发服务器
pnpm build:static        # RUNTIME_MODE=static（默认）
pnpm build:server        # RUNTIME_MODE=server（node adapter，阶段 2）
pnpm test                # vitest：schema / loader / provider 单测
pnpm e2e                 # playwright：双模式快照 + 双语
pnpm sync                # 本地跑一次 src/sync（需 .env）
pnpm sync validate       # 只校验 content/
pnpm lint && pnpm typecheck
```

## 当前状态

所有 ADR 已定（2026-08-22）；`site.config.i18n.default = en`（2026-08-22 维护者确认）。
进度以 `docs/ROADMAP.md` 勾选为准，当前在阶段 0。

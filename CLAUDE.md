# Offprint — 给 Claude Code 的项目说明

Offprint（抽印本）是一个开源、可插拔、易部署的学术个人网站系统：学术首页 + 博客 + 项目 + CV。
差异点：博客内容在 Notion 等工具里编排，经 elog 转成**约定格式的 markdown**发布；站点同一套代码既能编译成纯静态站，也能以 SSR 运行实现"发布即生效"。

维护者：Q（mouwumou@gmail.com）。语言：README 双语（`README.md` 英文、`README.zh-CN.md` 中文，改一处须同步另一处），其余文档中文，代码/标识符/提交信息英文。

## 先读这些

| 文件 | 内容 | 何时读 |
| --- | --- | --- |
| `docs/DECISIONS.md` | 已定与待定的架构决策（ADR） | **每次开工前**，待定项未敲定前不要实现依赖它的代码 |
| `docs/ARCHITECTURE.md` | 分层、双模式、仓库结构、包边界 | 动任何结构性代码前 |
| `docs/CONTENT-CONTRACT.md` | 各内容集合的 front-matter / 数据 schema | 写 loader、schema、页面时 |
| `docs/DYNAMIC-PUBLISHING.md` | server 模式发布链、`ContentStore`/`ContentProvider` 接口、compose | 阶段 2 |
| `docs/dev/DESIGN-REFERENCE.md` | 设计 token、版式、原型组件清单 | 写任何 UI 时 |
| `docs/dev/ROADMAP.md` | 阶段与任务清单，勾选进度 | 选下一个任务时 |
| `docs/dev/PLANNING.md` | 原始规划（框架分析、功能清单、风险） | 需要"为什么"时 |
| `docs/dev/REFERENCES.md` | 参考项目（NotionNext、al-folio、elog）借鉴与回避 | 设计 Notion 侧体验、主题、部署流程时 |

## 不可违反的约束

1. **页面只依赖 `ContentProvider`**。页面/组件不得直接读文件系统、直接 `import` markdown、或直接用 Astro `getCollection`；static 模式下 provider 喂给 content loader，server 模式下 provider 在请求期调用。这是双模式不分叉的唯一保证。
2. **static 是基线，server 是可选**（ADR-003）。任何改动后 `pnpm build:static` 与 `pnpm build:server` 都要成功；CI 会对两种模式做 HTML 快照比对。server 专属代码（端点、文件监听、运行时索引）不得进入 static 构建产物。阶段 1 不实现 server 功能，但不得写出只能在 server 下工作的页面。
3. **内容契约是工具无关的**。schema 只描述 "markdown + YAML front-matter + 字段"，不得出现 elog 专属逻辑；elog 相关代码只能住在 `src/sync`。**不得在运行时或构建时直接请求 Notion**（ADR-012），内容一律先经 sync 物化到 `content/`。
4. **schema 即校验**。所有集合用 zod 定义一次，构建期与请求期共用；不合规内容应报错或被标记，绝不静默渲染成坏页面。
5. **模块可关**。`site.yaml` 里关掉的模块不生成路由、不出现在导航、不进打包。新增功能先问"它是哪个模块的、配置项叫什么"。
6. **零 JS 默认**。只有真正交互的组件（主题切换、Cite 弹窗、TOC 高亮、搜索）才做 island；其余全部服务端渲染。
7. **学术 SEO 不可省**：每篇文章/出版物页必须输出 canonical、OG、JSON-LD，出版物页额外输出 Highwire Press `citation_*` meta。
8. **不提交密钥**。Notion token、图床密钥、revalidate secret 一律走环境变量，`.env.example` 列全。
9. **双语是一等公民**（ADR-007）。每个页面都要在两种语言下可达；新增 UI 文案必须进 `src/core/i18n/`，不得硬编码；内容字段支持 `{en, zh}` 形式。
10. **包边界**（ADR-006/022）。`src/core` 不得 import `src/sync` / `extensions` / `src/pages`；`src/sync` 只能 import `src/core/schema`。

## 工作方式

- 从 `docs/dev/ROADMAP.md` 取当前阶段的任务，完成后勾选并在 PR/commit 里引用任务编号。
- 做出新的结构性决定时，在 `docs/DECISIONS.md` 追加一条 ADR（状态、背景、决定、后果），不要只写在代码注释里。
- 优先小步提交：一个任务一个 commit；提交信息用 Conventional Commits（`feat(core): …`、`docs: …`）。
- 新建包 / 目录前先对照 `docs/ARCHITECTURE.md` 的结构；需要偏离时先改文档再改代码。
- 写 UI 时对照 `docs/dev/DESIGN-REFERENCE.md` 的 token 与版式，不要引入第二套颜色/字体/圆角。
- 依赖选择偏保守：少而稳、有类型、维护活跃；引入新依赖在 PR 描述里说明理由。

## 常用命令

```
pnpm install
pnpm dev                 # Astro 开发服务器
pnpm build:static        # RUNTIME_MODE=static（默认）
pnpm build:server        # RUNTIME_MODE=server（node adapter）
pnpm preview             # 伺服 dist/（static 构建产物）
pnpm test                # vitest：schema / store / provider / markdown 单测
pnpm e2e                 # playwright：冒烟 + 双模式 HTML 一致性比对
pnpm lint                # eslint（含 ADR-006 包边界规则）
pnpm typecheck           # astro check
pnpm format / format:check
pnpm sync                # elog→归一化→manifest→原子切换（需 .env）
pnpm sync validate       # 只校验 content/
pnpm lhci                # Lighthouse CI（desktop preset，阈值 0.95）
```

注意：`astro preview` 是守护式进程（有实例在跑时新实例会秒退）；e2e 用自带的 scripts/serve-dist.mjs 前台伺服，端口 4331，互不干扰。手动验证 dist 也建议用 `node scripts/serve-dist.mjs dist <port>`。

## 当前状态

ADR-001–025 已定（ADR-013 为方向已定、细节待敲定：lang/urlname 由 sync 派生，Notion 不加列，LLM 翻译管线另行设计）；配置在根目录 `site.yaml`（ADR-021，i18n.default = en），首页排布在 `content/home.yaml`，改 zod 配置 schema 后须 `pnpm gen:schema` 再生编辑器补全用的 JSON Schema。
**阶段 0–3 已完成**（2026-08-23），ADR-015 编排层与外部审计的全部高中优先级修复已落地（2026-08-24）。唯一未完项是 P1-16（在维护者的**实例仓库**迁移真实内容上线，不在本模板内）。阶段 4（开源化）已因 ADR-017 部分启动；阶段 5 的主题系统（P5-2 全部）与模块注册（P5-1a/c/d）已提前完成（ADR-018/019/022，extensions/ 目录）。
**本仓库是公开模板，GitHub 环境永不配置密钥**（ADR-017）：CI 与 Pages demo 只用 `GITHUB_TOKEN`；sync 工作流由实例仓库的 `SYNC_ENABLED` 变量开启；同步链的密钥验证在私有测试实例或服务器本地 `.env` 做。
elog 实测为 1.0 插件式工作流，与契约的字段差异记录在 `CONTENT-CONTRACT.md` §7.1；部署 workflow 已于 2026-09-07 在 GitHub 首跑验证：CI 双 Node 绿、Pages demo 子路径爬取零失败、sync 显示 skipped；Vercel 工作流已删除（ADR-025）。

## 远程 Docker 测试环境

本项目所有 Docker 相关操作(构建镜像、启停容器、跑测试等)都在远程测试环境执行,本机没有 Docker,不要假设本机可以直接跑 docker 命令。

- SSH 别名:`dockertest`(已配置免密登录,见 `~/.ssh/config`)
- 所有 docker 命令都要加上 SSH 前缀,例如:
  - `ssh dockertest "docker build -t myapp ."`
  - `ssh dockertest "docker compose up -d"`
  - `ssh dockertest "docker ps"`
  - `ssh dockertest "docker logs <container>"`
  - `ssh dockertest "docker exec -it <container> sh"`
- 需要查看远程文件(如 Dockerfile、docker-compose.yml)时:
  `ssh dockertest "cat /path/to/Dockerfile"`
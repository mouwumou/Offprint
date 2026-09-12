# 架构

> 本文是实现的权威参考；[dev/PLANNING.md](https://github.com/mouwumou/Offprint/blob/dev/docs/dev/PLANNING.md) 解释"为什么"。框架：Astro 5（ADR-005）；单包起步（ADR-006）；中英双语（ADR-007）。

## 1. 分层

```
内容生产   Notion──elog──▶ md+frontmatter │ publications.yaml │ JSON Resume │ YAML
              │ 契约：CONTENT-CONTRACT.md
内容存储   ContentStore   fs │ git │ s3          （字节层，只管读/列/监听）
              │
内容语义   ContentProvider（解析 + zod 校验 + 缓存 + revalidate）
              │
站点核心   src/core（未来 @offprint/core）schema │ loaders │ i18n │ 组件 │ SEO │ 主题 │ 模块注册
              │
运行模式   static（构建期调用 provider）   server（请求期调用 provider）
              │                                │
部署       GH Pages / 任意静态托管            Docker(node) / 任意容器平台
```

依赖方向只能向下：页面 → provider → store；core 不依赖 sync；sync 不依赖 core 的 UI，只依赖 core 的 schema。

## 2. 仓库结构（单包起步，ADR-006）

```
offprint/
├─ README.md  LICENSE(MIT)      # CLAUDE.md 与 docs/dev/ 只在 dev 分支（ADR-030）
├─ .github/                  # 工作流、issue/PR 模板、CONTRIBUTING / CODE_OF_CONDUCT / SECURITY
├─ .offprint/                # 生成物（e2e 与 Lighthouse 构建、报告、同步临时配置），gitignored
├─ package.json  astro.config.ts  site.yaml  tsconfig.json
├─ schema/                   # site.yaml / home.yaml 的编辑器补全 schema（pnpm gen:schema 再生）
├─ .env.example
├─ extensions/               # 装进来的扩展（ADR-022，只读安装）：themes/（含示例主题 gutter）widgets/ modules/
├─ content/                  # 站点内容（posts/ 由 sync 写入，其余作者手编）
│  ├─ posts/<urlname>.<lang>.md
│  ├─ pages/<slug>.<lang>.md # Notion type=Page 的独立页面（About、Now…）
│  ├─ profile.yaml  publications.yaml  projects.yaml  cv.yaml  talks.yaml  news.yaml
│  ├─ assets/
│  └─ manifest.json
├─ src/
│  ├─ core/                  # 未来的 @offprint/core，内部不得 import src/sync 或 extensions
│  │  ├─ config/             # defineConfig + zod schema
│  │  ├─ schema/             # posts / pages / publications / projects / cv / talks / news
│  │  ├─ store/              # ContentStore: fs.ts git.ts manifest.ts
│  │  ├─ content/            # ContentProvider, markdown 管线, cache
│  │  ├─ loaders/            # Astro Content Layer loaders 包装 provider
│  │  ├─ integration/        # Astro integration：模块开关、路由注入、server 端点
│  │  ├─ i18n/               # en.ts zh.ts + 工具
│  │  ├─ seo/                # Head、JSON-LD、Highwire、OG 图、feed、sitemap
│  │  ├─ theme/              # token CSS、字体、dark mode
│  │  ├─ components/         # .astro + React islands；home/ 下是首页部件（可被 extensions 部件链覆盖）
│  │  └─ server/             # server 模式：端点、watch、运行时索引（static 构建不打包）
│  ├─ sync/                  # 未来的 @offprint/sync：elog 封装，只依赖 src/core/schema
│  │  └─ { cli.ts, run.ts, elog-config.ts, manifest.ts, validate.ts, notify.ts }
│  ├─ pages/                 # Astro 路由：[...lang]/ 下 blog / projects / cv / pages
│  └─ layouts/
├─ compose.static.yaml  compose.server.yaml   # 根目录：Compose 从 compose 文件所在目录读 .env
├─ docker/                   # web.Dockerfile sync.Dockerfile site.Dockerfile Caddyfile
├─ docs/                     # 文档源：中文为根语言，docs/en/ 是英文翻译
├─ website/                  # 文档站（Starlight，ADR-033）：collect.mjs 复制 docs/ 后构建，发布在 demo 站的 /docs/ 下，仅模板仓库
├─ .github/workflows/        # ci.yml sync.yml deploy-pages.yml
├─ e2e/                      # Playwright 与 Lighthouse 配置 + 各 spec（冒烟、双模式一致性、子路径、axe、手机视口）；构建产物进 .offprint/
└─ scripts/                  # build-static.sh（sync → build → 原子切换）、serve-dist.mjs、check-live.mjs（线上验证）、upgrade-from-template.sh（实例升级）、gen-config-schema.ts
```

边界由 eslint-plugin-import 的 `import/no-restricted-paths`（zones 按解析后的真实文件路径判定，比 `no-restricted-imports` 的导入字符串匹配可靠）守住：`src/core/**` 不得引用 `src/sync/**`、`extensions/**`、`src/pages/**`；`src/sync/**` 只能引用 `src/core/schema/**`。将来拆成独立包时按目录平移。

## 3. 关键接口

- `ContentStore` / `Manifest` / `ContentProvider`：见 `DYNAMIC-PUBLISHING.md` §3，接口定义以那里为准，实现放 `src/core/store` 与 `src/core/content`。
- `defineConfig(siteConfig)`：zod 校验后导出类型化配置；`modules.<name>` 为 `false` 时 integration 不注入该模块的路由与导航。

### 3.1 编排层与三级定制（ADR-015）

配置里的每个自由度都有 zod 形状与缺省值，缺省值精确复刻内置设计（"可塑但不可坏"）：

- `modules.<name>: boolean | { title?, description?, … }`——布尔开关拓宽为设置对象，各模块经 `moduleToggleWith()` 声明自己的额外项：blog `colophon?` / `related?` / `search?`，publications `order?`，cv `pdf?` / `indexable?`；文案覆盖经 `moduleCopy()`（`src/core/config/copy.ts`）解析，i18n 字典只做主题缺省值。
- `nav?: Array<{module, label?} | {page, label?} | {href, label}>`——导航即数据（`resolveNav()`，`src/core/config/nav.ts`）。缺省时自动生成：首页 + 启用模块 + `nav: true` 的独立页面；显式给出时以作者列表为准，指向关闭模块 / 不存在页面的条目跳过而非报错。
- `header` / `footer`——`title`/`subtitle`/`colophon` 为 `false | LocalizedString`（隐藏 / 自定义 / 缺省不显示，ADR-027；此前缺省回落 profile 与 i18n），另有 `search`/`themeToggle`/`languageSwitcher`/`rss`/`enabled` 开关。
- `home.sections`——首页是 section 序列（discriminated union）：`hero | about | prose | selected-publications | recent-posts | projects`，各自带 `title` 覆盖与少量选项；`prose` 内联渲染一个独立页面。模块关闭或数据为空的 section 渲染期跳过。

三级定制阶梯：

1. **配置与内容**：`site.yaml` 字段（结构与开关，ADR-021）、`content/profile.yaml` 的作者信息（ADR-028）与 `content/home.yaml` 的首页排布，够用则到此为止。
2. **部件覆盖**：`extensions/widgets/<name>.astro` 替换同名内置部件——首页各节，以及 `publication-row` `post-row` `site-header` `site-footer`（ADR-032）；启用主题包自带的 `widgets/` 居中间优先级（查找链：站点散件 > 主题 > 内置，ADR-022）。机制是核心的部件注册表 `src/core/widgets/registry.ts`：`src/pages/_widgets.ts` 用编译期 glob 收集全部主题的部件、按启用主题过滤后注册（integration 的 page-ssr 脚本保证在任何渲染前完成），组件用 `resolveWidget(name, Builtin)` 取覆盖或内置；覆盖组件收到与内置完全相同的 props（内置实现即契约，清单见 `docs/THEMING.md` §4）。
3. **主题**：`theme.name` 解析目录式主题（ADR-018/022，规范见 `docs/THEMING.md`）：`extensions/themes/<name>/` 优先于内置 `src/core/themes/<name>/`；token 与字体栈来自 theme.json（BaseLayout 注入，并把腔调打在 `<html>` 的 data-* 上），字体加载与主题特有样式来自 theme.css（integration 注入，不在 cascade layer 内，可覆盖核心的任何样式）；核心组件带稳定的 `data-part` 挂钩与按腔调切换的预设类（ADR-032）；主题声明的选项在 site.yaml `theme.options` 填值（构建期校验 + 编辑器补全）。

### 3.2 模块注册（ADR-019）

模块以代码注册获得合法性（"模块注册表"）：`registerModule({ id, configSchema?, enabledByDefault?, nav?, copy?, collections? })`（`src/core/modules/registry.ts`）。`modules` 配置的校验 schema 在 `defineConfig()` **调用时**由注册表组合——site.yaml 里出现未注册的模块名会得到"module not registered"并列出当前已注册者。内置五模块在 `src/core/modules/builtin.ts` 自注册；**安装的模块**放 `extensions/modules/<id>/`，以 `module.yaml` 声明导航与文案（构建期 fs 读取自动注册，与主题机制对称，无 import 边界问题——ADR-021/022）。nav 缺省槽位与落地页文案缺省均来自注册信息，core 内不再各处硬编码模块名单。内置模块的路由仍是 `src/pages` 文件路由（以 `modules.<id>.enabled` 为门）；第三方模块的路由经 integration `injectRoute` 注入（计划中）。
- 模块接口（内部，尚未作为公开 API 稳定）：

```ts
interface OffprintModule {
  name: 'blog' | 'pages' | 'publications' | 'projects' | 'cv' | 'talks' | 'news'
  routes: RouteSpec[]            // pattern + 页面组件
  nav?: { label: string; href: string; order: number }
  collections?: string[]         // 依赖的内容集合
  endpoints?: EndpointSpec[]     // 仅 server 模式
}
```

## 4. 运行模式细节

static 是默认与基线，server 是可选运行时（ADR-003）。server 相关代码（端点、watch、运行时索引）集中在 integration 与 `src/core/server/`，static 构建时不得被打包。

| | static | server |
| --- | --- | --- |
| `astro.config` | `output: 'static'` | `output: 'server'` + adapter |
| 内容读取 | 构建期：loader 调 provider 一次 | 请求期：provider + 内存缓存 |
| 失效 | 重新构建 | `store.watch` / `POST /api/revalidate` |
| 搜索 | Pagefind（构建后索引） | MiniSearch 内存索引，revalidate 时增量更新 |
| feed / sitemap | 构建期生成文件 | 端点按请求生成，带 ETag |
| OG 图 | 构建期生成 PNG | 端点按需生成 + 缓存 |
| 端点 | 无 | `/api/revalidate` `/api/sync` `/api/health` |

环境变量：`RUNTIME_MODE`、`DEFAULT_LANG`（亦可在 site.yaml 设）、`CONTENT_STORE`、`CONTENT_DIR`、`CONTENT_GIT_REPO`/`CONTENT_S3_*`、`REVALIDATE_SECRET`、`SITE_URL`。

## 5. 渲染管线（markdown → HTML）

remark：`remark-gfm`、`remark-math`、`remark-directive`（定理/备注环境）、`remark-cite`（`[@key]`）。
rehype：`rehype-slug`、`rehype-autolink-headings`、`rehype-katex`（服务端）、自建 citations 插件（2026-08-23 变更：`rehype-citation` 只接受文件路径/URL 书目源，与 provider 喂 CSL-JSON 的模型不合，改为基于已引入的 citation-js/CSL 在管线内自建 `[@key]` 处理与参考文献生成）、Shiki（构建/请求期高亮，禁止客户端高亮库）。
输出同时产生：HTML、TOC、阅读时间、字数、是否含公式（决定是否注入 KaTeX CSS）。

## 6. 测试与 CI

- `vitest`：schema 校验用例（合规/不合规样本）、store 实现（fs 用临时目录、git/s3 用 mock）、provider 缓存与 revalidate、markdown 管线快照。
- `playwright`：同一内容下 static 与 server 两种模式的页面 HTML 归一化后比对；a11y（axe）；Lighthouse CI 阈值 ≥ 95。
- CI 矩阵：`RUNTIME_MODE ∈ {static, server}` × Node LTS。
- 内容校验 job：`pnpm sync validate` 对 `content/` 跑 schema，PR 中内容不合规直接失败。
- i18n：e2e 覆盖两种语言的首页与文章页；hreflang 成对校验。

## 7. 部署

仓库角色（ADR-017）：本仓库是公开**模板**，零外部密钥——CI 与 Pages demo 部署只用 `GITHUB_TOKEN`；用户站点是 "Use this template" 生成的**实例仓库**，Secrets/Variables 配在实例里（`SYNC_ENABLED` 为显式开关，模板中未设则同步工作流 skipped）；自托管密钥只在服务器本地 `.env`。

| 目标 | 模式 | 方式 |
| --- | --- | --- |
| GitHub Pages | static | `deploy-pages.yml`：build → upload artifact |
| 其他静态托管（Cloudflare Pages 等） | static | 放 `dist/` 即可；不做平台专属配置，server 模式只做容器（ADR-025） |
| Docker 自托管（默认） | static | `compose.static.yaml`：Caddy 伺服 `dist/` + sync 容器（elog → build → 原子切换），见 `DYNAMIC-PUBLISHING.md` §0 |
| Docker 自托管（可选） | server | `compose.server.yaml`：site + sync + 共享 volume，见 `DYNAMIC-PUBLISHING.md` §5 |

## 8. 安全

- 写端点要 secret header；Notion webhook 校验签名；限流与互斥锁。
- markdown 经 `rehype-sanitize` 白名单（允许 KaTeX/Shiki 产出的 class），因为内容来自外部工具。
- 图片只允许配置的图床域名 + 本地 assets；CSP 在 server 模式下由中间件输出。

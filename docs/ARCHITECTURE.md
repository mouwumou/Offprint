# 架构

> 本文是实现的权威参考；`PLANNING.md` 解释"为什么"。框架：Astro 5（ADR-005）；单包起步（ADR-006）；中英双语（ADR-007）。

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
部署       GH Pages / 任意 CDN                Docker(node) / Vercel / Netlify / CF
```

依赖方向只能向下：页面 → provider → store；core 不依赖 sync；sync 不依赖 core 的 UI，只依赖 core 的 schema。

## 2. 仓库结构（单包起步，ADR-006）

```
offprint/
├─ CLAUDE.md  README.md  LICENSE(MIT)
├─ package.json  astro.config.mjs  site.config.ts  tsconfig.json
├─ .env.example
├─ content/                  # 维护者内容（sync 写入；模板用户替换）
│  ├─ posts/<urlname>.<lang>.md
│  ├─ pages/<slug>.<lang>.md # Notion type=Page 的独立页面（About、Now…）
│  ├─ publications.yaml  projects.yaml  cv.yaml  talks.yaml  news.yaml
│  ├─ assets/
│  └─ manifest.json
├─ src/
│  ├─ core/                  # 未来的 @offprint/core，内部不得 import src/sync 或 src/site
│  │  ├─ config/             # defineConfig + zod schema
│  │  ├─ schema/             # posts / pages / publications / projects / cv / talks / news
│  │  ├─ store/              # ContentStore: fs.ts (git.ts s3.ts 阶段 2) manifest.ts
│  │  ├─ content/            # ContentProvider, markdown 管线, cache
│  │  ├─ loaders/            # Astro Content Layer loaders 包装 provider
│  │  ├─ integration/        # Astro integration：模块开关、路由注入、(server 端点 阶段 2)
│  │  ├─ i18n/               # en.ts zh.ts + 工具
│  │  ├─ seo/                # Head、JSON-LD、Highwire、OG 图、feed、sitemap
│  │  ├─ theme/              # token CSS、字体、dark mode
│  │  ├─ components/         # .astro + React islands
│  │  └─ server/             # 阶段 2：端点、watch、运行时索引（static 构建不打包）
│  ├─ sync/                  # 未来的 @offprint/sync：elog 封装，只依赖 src/core/schema
│  │  └─ { cli.ts, run.ts, elog-config.ts, manifest.ts, validate.ts, notify.ts }
│  ├─ pages/                 # Astro 路由：[...lang]/ 下 blog / projects / cv / pages
│  ├─ layouts/
│  └─ site/                  # 维护者站点级覆盖（样式、自定义组件）
├─ docker/                   # web.Dockerfile compose.static.yaml (site.Dockerfile compose.server.yaml 阶段 2)
├─ docs/
├─ .github/workflows/        # ci.yml sync.yml deploy-pages.yml
└─ scripts/                  # build-static.sh（sync → build → 原子切换，自托管用）
```

边界由 eslint-plugin-import 的 `import/no-restricted-paths`（zones 按解析后的真实文件路径判定，比 `no-restricted-imports` 的导入字符串匹配可靠）守住：`src/core/**` 不得引用 `src/sync/**`、`src/site/**`、`src/pages/**`；`src/sync/**` 只能引用 `src/core/schema/**`。阶段 4 拆包时按目录平移。

## 3. 关键接口

- `ContentStore` / `Manifest` / `ContentProvider`：见 `DYNAMIC-PUBLISHING.md` §3，接口定义以那里为准，实现放 `src/core/store` 与 `src/core/content`。
- `defineConfig(siteConfig)`：zod 校验后导出类型化配置；`modules.<name>` 为 `false` 时 integration 不注入该模块的路由与导航。
- 模块接口（内部，阶段 5 才对外）：

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

static 是默认与基线，server 是可选运行时（ADR-003）。阶段 1 只实现 static；server 相关代码（端点、watch、运行时索引）集中在 integration 与 `src/core/server/`，static 构建时不得被打包。

| | static | server |
| --- | --- | --- |
| `astro.config` | `output: 'static'` | `output: 'server'` + adapter |
| 内容读取 | 构建期：loader 调 provider 一次 | 请求期：provider + 内存缓存 |
| 失效 | 重新构建 | `store.watch` / `POST /api/revalidate` |
| 搜索 | Pagefind（构建后索引） | MiniSearch 内存索引，revalidate 时增量更新 |
| feed / sitemap | 构建期生成文件 | 端点按请求生成，带 ETag |
| OG 图 | 构建期生成 PNG | 端点按需生成 + 缓存 |
| 端点 | 无 | `/api/revalidate` `/api/sync` `/api/health` |

环境变量：`RUNTIME_MODE`、`DEFAULT_LANG`（亦可在 site.config 设）、`CONTENT_STORE`、`CONTENT_DIR`、`CONTENT_GIT_REPO`/`CONTENT_S3_*`、`REVALIDATE_SECRET`、`SITE_URL`。

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

| 目标 | 模式 | 方式 |
| --- | --- | --- |
| GitHub Pages | static | `deploy-pages.yml`：build → upload artifact |
| Vercel / Netlify / CF | static 或 server | 对应 adapter；一键部署按钮指向模板仓库 |
| Docker 自托管（默认） | static | `docker/compose.static.yaml`：Caddy 伺服 `dist/` + sync 容器（elog → build → 原子切换），见 `DYNAMIC-PUBLISHING.md` §0 |
| Docker 自托管（可选） | server | `docker/compose.server.yaml`：site + sync + 共享 volume，见 `DYNAMIC-PUBLISHING.md` §5 |

## 8. 安全

- 写端点要 secret header；Notion webhook 校验签名；限流与互斥锁。
- markdown 经 `rehype-sanitize` 白名单（允许 KaTeX/Shiki 产出的 class），因为内容来自外部工具。
- 图片只允许配置的图床域名 + 本地 assets；CSP 在 server 模式下由中间件输出。

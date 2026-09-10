# 动态发布链设计

> 状态：设计草案 v0.2（2026-08-22）
> 前置：[dev/PLANNING.md](https://github.com/mouwumou/Offprint/blob/dev/docs/dev/PLANNING.md) §3.3、`ARCHITECTURE.md`、ADR-003。§0 是 static 模式的自动重建路径；§1 起是 server 模式。不涉及页面与样式。

---

## 0. 基线：static + 自动重建

ADR-003 规定 static 是默认与基线。"在 Notion 点发布、不碰仓库、一两分钟后上线"这个核心体验**不需要 server 模式**，靠"同步后自动重建"即可：

```
自托管：
  sync 容器 (cron / webhook) ──▶ elog → 校验 → manifest → content/
                               ──▶ astro build (RUNTIME_MODE=static) → dist.new/
                               ──▶ 原子切换 dist/ → Caddy/Nginx 直接伺服
GitHub Pages 静态：
  GitHub Action (schedule / dispatch) ──▶ elog → 校验 → commit content/ → 平台重新构建部署
```

发布延迟 = 构建时长（1–3 分钟）。线上无常驻进程、无端点、无缓存一致性问题；内容错误在构建期暴露。自托管的 `compose.static.yaml` 为 `web`（静态文件服务器）+ `sync`（elog + build）。

server 模式在此之上换取秒级发布与运行时功能，代价见 [dev/PLANNING.md](https://github.com/mouwumou/Offprint/blob/dev/docs/dev/PLANNING.md) §3.3 对比表；切换时内容目录与模板不变。

---

## 1. 问题拆解（server 模式）

elog 不是常驻服务，而是一次性命令：读 Notion 数据库 → 写一批 markdown → 退出。因此"动态更新"拆成三个互相独立的子问题：

| 子问题 | 自托管（Docker） | Serverless（仅作对比分析；ADR-025 已排除为目标） |
| --- | --- | --- |
| **触发**：谁来跑 elog | sidecar 容器内 cron + 可选 Notion webhook | GitHub Action（schedule + `repository_dispatch`） |
| **存放**：产物放哪 | 共享 volume `/content`（`fs` store） | 推回仓库 / 对象存储（`git` / `s3` store） |
| **失效**：站点如何得知 | 文件监听 + `manifest.json` 比对 | `POST /api/revalidate` |

三种 store 实现同一个 `ContentStore` 接口，站点代码不感知内容在哪。

---

## 2. 发布链路

### 2.1 自托管（推荐给你自己的服务器）

```
Notion 改状态 Published
   │
   ├─(即时) Notion webhook ──▶ site: POST /api/sync ──┐
   └─(兜底) cron */5 ────────────────────────────────┤
                                                      ▼
                                           sync 容器: elog sync
                                                      │ 写到 /content/.staging/
                                                      │ 校验 frontmatter (zod)
                                                      │ 生成 manifest.json
                                                      │ 原子 rename → /content/posts/
                                                      ▼
                                           site 容器: chokidar 监听 manifest.json
                                                      │ diff 旧/新 manifest
                                                      │ 仅失效变化的 urlname
                                                      ▼
                                           下一次请求 SSR 出新页面（含 RSS/sitemap）
```

发布延迟：webhook 路径约 5–15 秒（受 elog 拉取速度限制），cron 路径最多一个周期。

### 2.2 Serverless

```
Notion 改状态 ──▶ (schedule / dispatch) GitHub Action
                     │ elog sync → 校验 → 写 content/ + manifest.json
                     │ git commit & push（或上传 R2/S3）
                     │ curl -X POST https://site/api/revalidate -H "x-secret: …"
                     ▼
                  site: 清缓存 / 触发 ISR revalidate → 下一次请求读新内容
```

如果选择"推回仓库并让平台重新部署"，那就退化成 static 模式，延迟 = 构建时长，也完全可以接受；`revalidate` 路径只是为了免重建。

---

## 3. 接口定义

### 3.1 `ContentStore` —— 字节层，只管读写文件

```ts
// src/core/store/types.ts
export interface ContentStore {
  /** 读取一个文件的文本，不存在返回 null */
  read(path: string): Promise<string | null>
  /** 列出某集合目录下的相对路径 */
  list(prefix: string): Promise<string[]>
  /** 读取 manifest.json，不存在返回 null */
  manifest(): Promise<Manifest | null>
  /** 订阅变化；static 模式与不支持推送的 store 返回 noop */
  watch?(onChange: (changed: ManifestDiff) => void): () => void
}

export interface Manifest {
  generatedAt: string                // ISO
  tool: { name: 'elog' | string; version: string }
  entries: Record<string, ManifestEntry>  // key = `${collection}/${slug}`
}
export interface ManifestEntry {
  path: string       // posts/geometry-of-uncertainty.md
  hash: string       // sha256(内容)，用作 ETag
  updated: string    // frontmatter.updated
}
export interface ManifestDiff { added: string[]; changed: string[]; removed: string[] }
```

实现：`FsStore`（chokidar 监听 `manifest.json` 单文件即可）、`GitStore`（GitHub Contents API + ETag，`watch` 为 noop）、`S3Store`（兼容 R2/MinIO）。

### 3.2 `ContentProvider` —— 语义层，返回解析并校验过的对象

```ts
// src/core/content/provider.ts
export interface ContentProvider {
  listPosts(opts?: { includeDrafts?: boolean; lang?: string }): Promise<PostSummary[]>
  getPost(urlname: string, lang: string): Promise<Post | null>
  /** 同一 urlname 的全部译本，用于互链与 hreflang */
  getTranslations(urlname: string): Promise<{ lang: string }[]>
  listTags(): Promise<{ tag: string; count: number }[]>
  listPages(lang?: string): Promise<PageSummary[]>
  getPage(slug: string, lang: string): Promise<Page | null>
  listPublications(): Promise<Publication[]>
  listProjects(): Promise<Project[]>
  getCV(): Promise<Resume | null>             // 文件缺失返回 null
  getProfile(): Promise<Profile>              // content/profile.yaml；缺失即报错（ADR-028）
  /** 失效缓存；不传参数则全部失效 */
  revalidate(keys?: string[]): Promise<void>
  /** 当前内容版本（manifest hash），用于 ETag / 304 */
  version(): Promise<string>
}
```

`createProvider(store, schemas)` 是唯一实现：内存 LRU 缓存解析结果，key 为 manifest entry 的 hash；`store.watch` 回调直接映射到 `revalidate(changed)`。static 模式下构建期调用同一个 provider 一次，喂给 Astro Content Layer 的自定义 loader；server 模式下页面在请求期调用。**页面组件只依赖 `ContentProvider`，永远不直接碰文件或 Astro collections。**

### 3.3 HTTP 端点（仅 server 模式注册）

| 端点 | 用途 | 鉴权 |
| --- | --- | --- |
| `POST /api/revalidate` | body `{ keys?: string[] }`，清缓存 | header `x-revalidate-secret` |
| `POST /api/sync` | 触发一次 elog（自托管），返回 manifest diff | Notion webhook 签名 + secret |
| `GET /api/health` | 返回 `version()` 与最近同步时间 | 无 |

两个写端点都要幂等、限流（同一分钟内合并请求），并在 sync 进行中时返回 202 而非重复启动。

> 实现注记：`/api/sync` 由 site 进程直接以子进程运行 sync CLI（进程边界，不违反 ADR-006 的 import 规则），共享 content volume 时无需跨容器信令；compose 中的 sync 容器仍可作为 cron 兜底并存。写端点鉴权用 `x-revalidate-secret`，Astro 的 Origin CSRF 检查已关闭（无 cookie 会话，webhook/CLI 调用方不带 Origin）。

---

## 4. sync 容器（`src/sync`）

一个很薄的 Node 镜像，三种形态共用同一段代码：CLI（`offprint-sync`）、Docker 入口（cron 模式）、GitHub Action（`.github/workflows/sync.yml` 调用 `pnpm sync`）。

> 2026-08-23（ADR-014）：sync 的写权限只及 `content/posts/`；`pages/` 与各 YAML 属站点环、作者本地编辑。Notion type=Page 需 `SYNC_PAGES=true` 显式开启。

职责顺序固定：

1. 运行 elog，`outputDir` 指向 `.staging/`（`format: matter-markdown`，`filename: urlname`，图床开启）。
2. 用 core 的 zod schema 逐篇校验；失败的文章写进 `manifest.errors` 并跳过，**不阻断其他文章发布**。
3. 计算 hash，生成 `manifest.json`。
4. 原子切换：`rename(.staging/posts, posts.tmp)` → `rename(posts, posts.old)` → `rename(posts.tmp, posts)` → 删除 `posts.old`。manifest 最后写，因为站点只监听它。
5. 如配置了 `revalidateUrl`，POST 通知。

elog 配置由 sync 从环境变量生成（`NOTION_TOKEN`、`NOTION_DB`、`IMAGE_PLATFORM`…），不把含 token 的 `elog.config.js` 放进仓库。

> elog **1.0 插件式工作流**（`@elog/cli` + `@elog/plugin-from-notion` + `@elog/plugin-to-local`，`elog sync -c <config> -e <env>`），0.x 的 write/deploy 配置不再兼容；sync 按 1.0 实现。字段差异与归一化清单见 `CONTENT-CONTRACT.md` §7.1；`lang`/`urlname` 由 sync 派生（ADR-013）。

---

## 5. Docker Compose 骨架

```yaml
services:
  site:
    build: { context: ., dockerfile: docker/site.Dockerfile }
    environment:
      RUNTIME_MODE: server
      CONTENT_STORE: fs
      CONTENT_DIR: /content
      REVALIDATE_SECRET: ${REVALIDATE_SECRET}
    volumes:
      - content:/content:ro
    ports: ["4321:4321"]
    healthcheck: { test: ["CMD", "wget", "-qO-", "http://localhost:4321/api/health"] }

  sync:
    build: { context: ., dockerfile: docker/sync.Dockerfile }
    environment:
      NOTION_TOKEN: ${NOTION_TOKEN}
      NOTION_DB: ${NOTION_DB}
      IMAGE_PLATFORM: ${IMAGE_PLATFORM:-local}   # local 时图片写入 /content/assets 由 site 托管
      SYNC_CRON: "*/5 * * * *"
      REVALIDATE_URL: http://site:4321/api/revalidate
      REVALIDATE_SECRET: ${REVALIDATE_SECRET}
    volumes:
      - content:/content
    depends_on: [site]

volumes:
  content:
```

反向代理（Caddy/Nginx）放在 compose 外或再加一个 service，按你服务器现状定。首次部署时 `sync` 先跑一次全量，`site` 在拿到第一份 manifest 前返回"内容同步中"页面而不是 500。

---

## 6. 已知坑与对策

| 坑 | 对策 |
| --- | --- |
| Notion 图片 URL 约 1 小时过期 | elog 图床必开；自托管可用 `local` 平台把图片写进 volume，由站点作为静态资源托管 |
| 同步中途的半写状态 | staging 目录 + 原子 rename；站点只监听 manifest |
| 一篇文章 frontmatter 不合规导致整体失败 | 逐篇校验，错误进 manifest，`/api/health` 暴露错误数 |
| Pagefind 是构建期索引 | server 模式改用 MiniSearch 内存索引，在 `revalidate` 时增量更新；static 模式保留 Pagefind |
| webhook 重放 / 并发触发 | 端点幂等 + 进程内互斥锁 + 60 秒合并窗口 |
| 删除文章 | manifest diff 的 `removed` 触发 404 与 sitemap 剔除；可选保留 410 |
| 站点重启后冷缓存 | 启动时预热：读 manifest，后台解析全部文章 |

---

## 7. 验收标准

- 在 Notion 把一篇文章状态改为 Published，自托管环境 ≤ 15 秒（webhook）或 ≤ 5 分钟（cron）后，`curl` 文章 URL 得到含完整正文与 meta 标签的 HTML。
- 同一代码库 `RUNTIME_MODE=static` 构建出的页面与 server 模式渲染结果 HTML 快照一致（Playwright 对比）。
- 关掉 sync 容器，站点持续正常服务旧内容；重启 site 容器后 30 秒内恢复全部页面。
- 故意放入一篇缺 `date` 的文章，其余文章正常发布，`/api/health` 报告 1 个错误。
- RSS、sitemap 在内容更新后下一次请求即反映变化。

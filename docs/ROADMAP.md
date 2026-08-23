# 路线图与任务清单

勾选即完成；任务编号在 commit / PR 中引用（如 `P0-3`）。阶段定义与验收见 `PLANNING.md` §5、`DYNAMIC-PUBLISHING.md` §7。

## 阶段 0 — 决策与技术验证（约 1 周）

前置条件已满足（ADR-005 Astro、ADR-006 单包、ADR-007 双语，2026-08-22）。

- [x] P0-1 脚手架：单包 Astro 5 + Tailwind 4 + React integration，`src/core` / `src/sync` / `src/site` 目录与 eslint 边界规则，TypeScript strict，prettier，vitest，playwright，`.env.example`，MIT LICENSE（实际装的是 Astro 7.2，ADR-005 的 "Astro 5+" 允许；astro.config 已读 `RUNTIME_MODE` 且双模式构建通过，P0-7 到时只需复核）
- [x] P0-2 `site.config.ts` + `defineConfig` zod schema（profile、modules、theme、i18n、runtime）
- [x] P0-3 posts / pages schema（CONTENT-CONTRACT §2、§6a，`lang` 必填）+ 合规/不合规样本单测
- [x] P0-4 `FsStore` + `Manifest` + `ContentProvider`（内存缓存、revalidate）+ 单测
- [x] P0-5 markdown 管线（remark/rehype + KaTeX 服务端 + Shiki 自定义主题）+ 快照测试
- [x] P0-6 Post 页移植（DESIGN-REFERENCE），用原型三篇示例文章渲染；路由含语言前缀 `[...lang]/blog/[urlname]`（另加一篇 zh 译本验证前缀路由；Cite 弹窗与 TOC 高亮 island 留阶段 3）
- [x] P0-7 `astro.config` 读 `RUNTIME_MODE`；`build:static` 与 `build:server`（node adapter）均通过（P0-1 实现，P0-6 带真实文章页复验）
- [x] P0-8 静态 Docker：`docker/web.Dockerfile`（Caddy 伺服 dist/）跑通（2026-08-23 在远程 `dockertest` 主机验证：构建 91.9MB 镜像，首页/en/zh 文章页 200，`/_astro` 带 immutable 缓存头 + gzip）
- [x] P0-9 用真实 Notion 数据库跑一次 elog（含 type / lang 列），对照契约记录差异到 CONTENT-CONTRACT §7（2026-08-23 用维护者 NotionNext 库实测 elog 1.0.0-beta.2，30 篇同步成功；差异与归一化清单见 §7.1，现库缺 lang/urlname 列）
- [x] P0-10 Playwright 双模式 HTML 比对脚手架（哪怕只有一页）（覆盖首页 + en/zh 文章页三条路由，归一化后逐字节一致）

退出标准：一篇 elog 产出的文章在两种模式下渲染一致，静态 Docker 可运行。

## 阶段 1 — 自用 MVP（2–3 周）

- [x] P1-1 Layout（Header/Footer/skip link/主题切换防闪烁）
- [x] P1-2 Home 页
- [x] P1-3 Blog 列表页（tag/category 过滤走 URL 参数、置顶、草稿隐藏）（过滤状态走 URL 路径 `/blog/tag/x` 而非 query：静态构建无法按 query 变化，query 过滤会破坏 ADR-003 双模式一致性）
- [x] P1-4 publications：YAML loader（Notion 导出）+ 作者高亮 + 首页 Selected work（独立页与 Cite 留阶段 3）
- [x] P1-5 projects：YAML loader + 页面
- [ ] P1-6 CV：JSON Resume loader + 页面 + 打印样式
- [ ] P1-7 SEO：Head 组件（canonical/OG/Twitter/JSON-LD Person & BlogPosting/hreflang）、sitemap、RSS/Atom/JSON feed（按语言）
- [ ] P1-7b i18n：语言前缀路由、UI 字符串表、语言切换器、译本互链、`{en,zh}` 字段解析
- [ ] P1-7c pages 模块：Notion type=Page 的独立页面 + 导航注入
- [ ] P1-8 首页 Selected work 的 JSON-LD `ScholarlyArticle`（Highwire meta 随阶段 3 出版物页一起做）
- [ ] P1-9 模块开关生效（关掉的模块无路由/导航/打包）
- [ ] P1-10 `redirects.yaml` → 各平台重定向产物（GH Pages 用 meta refresh 页、Vercel/Netlify/CF 原生、node 中间件）
- [ ] P1-11 CI：双模式构建 + 单测 + e2e + 内容校验
- [ ] P1-12 GH Pages 与 Vercel 两条部署 workflow
- [ ] P1-13 `src/sync` 基础：elog 配置生成、staging、逐篇校验、manifest、原子切换（DYNAMIC-PUBLISHING §4，不含 notify）
- [ ] P1-14 sync 的 GitHub Action 形态：schedule/dispatch → elog → commit `content/` → 触发构建
- [ ] P1-15 自托管静态：`docker/compose.static.yaml`（web 静态伺服 + sync 容器 elog→build→原子切换 dist/）
- [ ] P1-16 迁移真实内容，以 static 模式上线替换旧站

退出标准：在 Notion 点 Published，无需碰仓库，1–3 分钟后新文章在线上可见（自托管与 GH Pages 两条路径均验证）。

## 阶段 2 — server 模式（1–2 周，产品能力，ADR-003）

- [ ] P2-1 sync 增加 notify（revalidate 调用）与 Docker cron 入口形态
- [ ] P2-2 server 模式 `astro.config` 分支 + node adapter + `docker/site.Dockerfile`
- [ ] P2-3 server 模式端点：`/api/revalidate` `/api/sync` `/api/health`（鉴权、幂等、互斥、限流）
- [ ] P2-4 `FsStore.watch`（chokidar 监听 manifest）+ 增量失效
- [ ] P2-5 `docker/compose.server.yaml`（site + sync + volume）+ 首次冷启动"同步中"页
- [ ] P2-6 `GitStore`（GitHub Contents API）与 Vercel ISR revalidate 路径
- [ ] P2-7 Notion webhook 触发（可选）
- [ ] P2-8 server 模式 feed/sitemap 按请求生成 + ETag
- [ ] P2-9 MiniSearch 内存索引（server）/ Pagefind（static）
- [ ] P2-10 验收：DYNAMIC-PUBLISHING §7 全部通过
- [ ] P2-11 验收：`RUNTIME_MODE` 切回 static 后，同一内容目录构建产物与 server 渲染 HTML 一致

## 阶段 3 — 学术打磨（2 周）

- [ ] P3-0 出版物独立页 + Highwire Press `citation_*` meta
- [ ] P3-1 Cite 弹窗：由 YAML 生成 BibTeX / APA / MLA / Chicago（citation-js + CSL）
- [ ] P3-2 文中引用 `[@key]`（key 对应 publications.yaml 或文内 references）+ 文末参考文献
- [ ] P3-3 定理/备注指令块样式
- [ ] P3-4 OG 图生成（satori）
- [ ] P3-5 "Cite this post" + DOI 字段
- [ ] P3-6 CV PDF：print 路线完善；可选 Typst CI 产物
- [ ] P3-7 i18n 进阶：按语言的搜索索引、OG 图文字、CV 双语 PDF
- [ ] P3-8 giscus 评论开关
- [ ] P3-9 a11y 审计（axe）+ Lighthouse CI 阈值
- [ ] P3-10 相关文章 / 系列导航 / 最近更新

## 阶段 4 — 开源化（2 周）

- [ ] P4-0 按 `src/core` / `src/sync` 边界拆为 pnpm workspace 包
- [ ] P4-1 `@offprint/core`、`@offprint/sync` 发布到 npm（changesets）
- [ ] P4-2 模板仓库 `offprint-template`（干净副本 + 示例内容）
- [ ] P4-3 一键部署按钮（Vercel / Netlify / CF）+ GH Pages workflow + compose
- [ ] P4-4 文档站（用 core 自建）：快速开始、内容契约、elog 配置、部署、配置参考
- [ ] P4-5 LICENSE、CONTRIBUTING、issue/PR 模板、CoC
- [ ] P4-6 Renovate、release workflow

## 阶段 5 — 插件 API（按需）

- [ ] P5-1 `OffprintModule` 对外稳定化，第三方模块示例
- [ ] P5-1b 可选 loader：BibTeX 导入、手写 markdown 目录、Obsidian
- [ ] P5-2 主题包机制
- [ ] P5-3 `create-offprint` CLI

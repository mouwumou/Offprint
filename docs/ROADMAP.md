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
- [x] P1-6 CV：JSON Resume loader + 页面 + 打印样式
- [x] P1-7 SEO：Head 组件（canonical/OG/Twitter/JSON-LD Person & BlogPosting/hreflang）、sitemap、RSS/Atom/JSON feed（按语言）
- [x] P1-7b i18n：语言前缀路由、UI 字符串表、语言切换器、译本互链、`{en,zh}` 字段解析
- [x] P1-7c pages 模块：Notion type=Page 的独立页面 + 导航注入
- [x] P1-8 首页 Selected work 的 JSON-LD `ScholarlyArticle`（Highwire meta 随阶段 3 出版物页一起做）
- [x] P1-9 模块开关生效（关掉的模块无路由/导航/打包）（实测全关配置：仅产出 2 个首页，无导航/feed/CTA/section；完整路由注入 integration 留阶段 4）
- [x] P1-10 `redirects.yaml` → 各平台重定向产物（GH Pages 用 meta refresh 页、Vercel/Netlify/CF 原生、node 中间件）（经 Astro 内建 redirects 配置实现：静态出 meta-refresh 页，node adapter 出真 301，平台 adapter 接入时自动译为原生规则；真实清单待维护者 P1-16 前提供）
- [x] P1-11 CI：双模式构建 + 单测 + e2e + 内容校验（ci.yml，Node 22/24 矩阵；实际运行待仓库推到 GitHub 后验证）
- [x] P1-12 GH Pages 与 Vercel 两条部署 workflow（deploy-pages.yml / deploy-vercel.yml；需配置 SITE_URL 变量与 Vercel secrets，运行待推仓库后验证）
- [x] P1-13 `src/sync` 基础：elog 配置生成、staging、逐篇校验、manifest、原子切换（DYNAMIC-PUBLISHING §4，不含 notify）
- [x] P1-14 sync 的 GitHub Action 形态：schedule/dispatch → elog → commit `content/` → 触发构建（sync.yml，30 分钟 cron + dispatch；需配置 NOTION_TOKEN/NOTION_DB secrets）
- [x] P1-15 自托管静态：`docker/compose.static.yaml`（web 静态伺服 + sync 容器 elog→build→原子切换 dist/）（2026-08-23 dockertest 实测：首次发布原子切换成功、Caddy 200；无凭据时退化为仅构建已提交内容）
- [ ] P1-16 迁移真实内容，以 static 模式上线替换旧站（在维护者的**实例仓库**进行，不在本模板内 — ADR-017）

退出标准：在 Notion 点 Published，无需碰仓库，1–3 分钟后新文章在线上可见（自托管与 GH Pages 两条路径均验证）。

## 阶段 2 — server 模式（1–2 周，产品能力，ADR-003）

- [x] P2-1 sync 增加 notify（revalidate 调用）与 Docker cron 入口形态（实测 notify 200；server 版循环入口 scripts/sync-server-loop.sh）
- [x] P2-2 server 模式 `astro.config` 分支 + node adapter + `docker/site.Dockerfile`（config 分支 P0-1 已有；镜像随 P2-5 compose 在 dockertest 验证）
- [x] P2-3 server 模式端点：`/api/revalidate` `/api/sync` `/api/health`（鉴权、幂等、互斥、限流）（实测：401/429/202 started→running→200 merged、sync 后 version 变化；integration 注入，static 构建零 API 痕迹）
- [x] P2-4 `FsStore.watch`（chokidar 监听 manifest）+ 增量失效（活体验证：改文件+manifest 后无重启即出新内容，日志 +0 ~1 -0）
- [x] P2-5 `docker/compose.server.yaml`（site + sync + volume）+ 首次冷启动"同步中"页（dockertest 实测：冷启动 503 双语页 → 内容落地后 /zh/ 200、health 报真实 version）
- [x] P2-6 `GitStore`（GitHub Contents API）与 Vercel ISR revalidate 路径（GitStore + ETag 缓存 + mock 测试；Vercel 路径 = sync notify → /api/revalidate 清缓存后按请求重取，边缘 ISR 细节待选定 vercel adapter 时补）
- [x] P2-7 Notion webhook 触发（可选）（/api/sync 支持 X-Notion-Signature HMAC 校验与订阅握手 token 透出；真实 webhook 配置待维护者在 Notion 侧开启）
- [x] P2-8 server 模式 feed/sitemap 按请求生成 + ETag（实测 If-None-Match→304；sitemap 端点与 static 同 URL，45 URL 含 hreflang）
- [ ] P2-9 MiniSearch 内存索引（server）/ Pagefind（static）
- [x] P2-10 验收：DYNAMIC-PUBLISHING §7 全部通过（②③④⑤ 已实测：双模式 HTML 一致 e2e、无 sync 容器持续服务、错误文章隔离且 health 报 errors=1、RSS/sitemap 下一请求即含新文并滚动 ETag；① 的真实 Notion 端到端计时与 webhook 秒级路径待正式部署时用真实凭据复验）
- [x] P2-11 验收：`RUNTIME_MODE` 切回 static 后，同一内容目录构建产物与 server 渲染 HTML 一致（dual-mode e2e 持续验收：7 条路由归一化 HTML 逐字节一致，每次 CI 运行）

## 阶段 3 — 学术打磨（2 周）

- [x] P3-0 出版物独立页 + Highwire Press `citation_*` meta
- [ ] P3-1 Cite 弹窗：由 YAML 生成 BibTeX / APA / MLA / Chicago（citation-js + CSL）
- [x] P3-2 文中引用 `[@key]`（key 对应 publications.yaml 或文内 references）+ 文末参考文献
- [x] P3-3 定理/备注指令块样式
- [x] P3-4 OG 图生成（satori）（拉丁字形已完成；zh 标题的 CJK 字体在 P3-7 处理）
- [x] P3-5 "Cite this post" + DOI 字段
- [x] P3-6 CV PDF：print 路线完善；可选 Typst CI 产物（print 完善并实测出 PDF；Typst 为可选项未做）
- [x] P3-7 i18n 进阶：按语言的搜索索引、OG 图文字、CV 双语 PDF（搜索已按语言：Pagefind 依 html lang 分索引、MiniSearch 带 lang 过滤；zh OG 经 Noto Sans SC 子集渲染；CV 页全双语、两种语言均可打印 PDF）
- [x] P3-8 giscus 评论开关（comments 配置节默认关；开启需配全 giscus 参数并渲染到文章页；真实仓库接入待维护者配置）
- [x] P3-9 a11y 审计（axe）+ Lighthouse CI 阈值（axe 11 页零 serious/critical；Lighthouse desktop preset 四类 ≥0.95 全过并入 CI；顺带修复：对比度、字体 CLS（fontaine 度量回退）、KaTeX font-display、CSS 内联、assets/ 本地封面托管）
- [x] P3-10 相关文章 / 系列导航 / 最近更新

## 阶段 4 — 开源化（2 周）

- [ ] P4-0 按 `src/core` / `src/sync` 边界拆为 pnpm workspace 包
- [ ] P4-1 `@offprint/core`、`@offprint/sync` 发布到 npm（changesets）
- [ ] P4-2 模板仓库 `offprint-template`（干净副本 + 示例内容）
- [ ] P4-3 一键部署按钮（Vercel / Netlify / CF）+ GH Pages workflow + compose
- [ ] P4-4 文档站（用 core 自建）：快速开始、内容契约、elog 配置、部署、配置参考
- [ ] P4-5 LICENSE、CONTRIBUTING、issue/PR 模板、CoC
- [ ] P4-6 Renovate、release workflow

## 阶段 5 — 插件 API（按需）

P5-1 与 P5-2 因 ADR-018/019 于 2026-08-24 提前启动，并行推进，任务展开如下。

主题系统（P5-2 提前，ADR-018）：

- [ ] P5-2a 主题契约 `defineTheme`（全量 token 表 + fonts + voice + 可选 css/shiki）与解析器（src/site/themes → 内置 → npm；解析失败构建期报错并列出可用主题）
- [ ] P5-2b global.css 拆分：token 无关的版式基座 + 每主题自带样式；integration 按解析结果注入
- [ ] P5-2c 现有视觉迁移为内置主题 `paper`（ADR-011 修订：token 降为该主题的定义）
- [ ] P5-2d `theme.tokens` 用户级 token 覆盖
- [ ] P5-2e `docs/THEMING.md` 制作规范（可定义/禁止事项；质量门 = 内容无关的 e2e/axe/lhci）
- [ ] P5-2f 学术风新默认主题：三个视觉方向小样定调 → 实现为第二个内置主题并设为缺省

模块注册（P5-1 提前，ADR-019；"模块注册表" = 模块以代码注册获得合法性、modules 配置校验由已注册模块的 schema 组合而成）：

- [ ] P5-1a `defineModule` 接口与注册表（id、configSchema、nav/文案缺省、collections 声明）
- [ ] P5-1c 内置五模块自注册；`modulesSchema` 由注册表组合，未注册键报"未注册"
- [ ] P5-1d nav 缺省 / 模块文案缺省 / 首页 section 的模块对应改为注册驱动
- [ ] P5-1e 站点本地模块发现（src/site/modules/*，pages/integration 层聚合）+ 第三方路由 injectRoute 通道 + 示例模块
- [ ] P5-1 `OffprintModule` 对外稳定化，第三方模块示例（npm 分发形态，待阶段 4 拆包）
- [ ] P5-1b 可选 loader：BibTeX 导入、手写 markdown 目录、Obsidian
- [ ] P5-3 `create-offprint` CLI（脚手架只生成文本文件，不做交互式配置写入 — ADR-020）

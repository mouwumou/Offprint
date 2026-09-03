# Offprint — 项目规划

> 状态：规划草案 v0.1（2026-08-22）
> 输入：Figma Make 原型（React 19 + Vite + Tailwind 4 SPA，已定义 elog front-matter 契约、`BlogProvider` 接口、Home / Blog / Post / Projects / CV 五页）

---

## 1. 目标与约束

**要做什么**：一个开源、可插拔、易部署的学术个人网站系统，承担学术首页、博客、个人项目、CV 四项功能，并且以"博客内容来自 Notion 等编排工具（经 elog 转换为约定格式）"为核心差异点，而不是依赖 markdown 手写或富文本编辑器。

**已确认的约束**（来自你的回答）：

| 维度 | 结论 |
| --- | --- |
| 动态 vs 静态 | 自用：有服务器，动态/静态皆可；公开推广：必须能纯静态编译。**动态模式必须对搜索引擎友好（SSR，不能是 CSR）。** |
| 可插拔 | 内容源可换、主题/模块可开关、他人 fork 即用。核心诉求是"相对于静态网站编译器更动态"。 |
| 部署 | Docker 自托管 + Vercel/Netlify/Cloudflare + GitHub Pages，三者都要支持。 |
| 专业性 | 在学术博客层面要显得专业（引用、公式、出版物、Scholar 可抓取等）。 |

这四条约束合起来，对技术选型提出了一个硬性要求：**同一套代码、同一套模板，必须既能 `build` 出纯静态产物，也能以服务端渲染方式运行。** 这是下面所有分析的出发点。

---

## 2. 前端框架分析

### 2.1 评估维度

1. **双模式能力**：同一代码库能否同时输出"纯静态站"和"SSR 服务"，且两种模式的差异是否小到可以长期维护。
2. **部署适配**：Docker（Node 服务）、Vercel/Netlify/Cloudflare（Serverless/Edge）、GitHub Pages（纯静态）三类目标的官方支持程度。
3. **内容管线**：Markdown/MDX、front-matter 校验、KaTeX、代码高亮、脚注、引用等学术写作需求的生态成熟度；以及"内容源可换"的抽象是否是框架一等公民。
4. **插件模型**：是否自带可被第三方扩展的机制（对应"可插拔"）。
5. **原型复用**：Figma Make 原型是 React 组件，能否低成本复用。
6. **性能/体积**：内容型站点的默认 JS 体量、Lighthouse 表现。
7. **维护与可 fork 性**：单人维护成本；其他学者 fork 后的学习曲线；框架自身的稳定性/破坏性更新频率。
8. **动态模式 SEO**：SSR/ISR 下 meta、OG、JSON-LD、Scholar 标签是否自然支持。

### 2.2 候选方案逐项分析

#### A. Astro（+ React islands）

- **双模式**：`output: 'static'` 与 `output: 'server'` 切换，页面级 `prerender` 开关。一个 `astro.config` 里改一行 + 换 adapter 即可在两种模式间切换，模板代码零改动。这是所有候选里双模式差异最小的。
- **部署**：官方 adapter 覆盖 `@astrojs/node`（Docker）、`@astrojs/vercel`、`@astrojs/netlify`、`@astrojs/cloudflare`；静态模式直接出 `dist/` 给 GitHub Pages。三类目标全部一等支持。
- **内容管线**：Content Collections + zod schema —— 原型里的 `PostFrontmatter` 契约可以直接变成**构建期强制校验**（elog 输出不合规时构建直接报错而非页面悄悄坏掉）。Astro 5 的 Content Layer API 提供 `loader` 抽象（glob / file / 自定义），这恰恰就是"内容源可换"的框架原生实现：一个 Notion loader、一个 BibTeX loader、一个 JSON Resume loader，都是同一接口。remark/rehype 插件链（KaTeX、Shiki、footnotes、rehype-citation）与框架无关，直接可用。
- **插件模型**：Astro Integrations API 是成熟的插件机制（注入路由、注入组件、hook 构建阶段）。"博客模块 / CV 模块 / 出版物模块"天然可以各自做成 integration，用户在 config 里增删即可。
- **原型复用**：React 组件可作为 island 原样引入（CiteButton、Toc、主题切换这类交互组件），页面布局改写为 `.astro` 即可，Tailwind 4 直接沿用。
- **性能**：默认零 JS，内容站点 Lighthouse 接近满分是常态。
- **维护/可 fork**：概念少（页面即文件、岛屿、集合），对非前端背景的学者最友好。大版本升级节奏约一年一次，迁移指南完善。
- **动态模式 SEO**：server 模式即 SSR，head 标签在服务端输出，无额外工作。
- **短板**：
  - Content Collections 本质是**构建期**概念。动态模式下要做到"Notion 发布即生效、不重建"，不能走 collections，而要在请求期直接调用内容层（Astro 5.10+ 有实验性的 live content collections，可跟进但不应依赖）。这意味着我们必须自己维护一层 `ContentProvider` —— 但这层本来就是"内容源可换"要求的东西，并非额外负担。
  - 重交互应用不是强项，但本项目没有重交互页面。
  - 没有 Next.js 那种 ISR 的"官方概念"，需在 server 模式下自己做缓存失效（见 §3.3，实际上很简单）。

#### B. Next.js（App Router）

- **双模式**：`output: 'export'`（静态）与默认/`standalone`（服务）。但两种模式**能力集不同**：export 模式下 ISR、动态路由兜底、`next/image` 优化、middleware、route handlers 全部不可用，动态路由必须 `generateStaticParams` 穷举。开发时容易写出只在一种模式下工作的代码，需要 CI 双模式构建守住。
- **部署**：Vercel 最佳；Docker 用 `standalone` 可行；Cloudflare 需 OpenNext，Netlify 需其适配层；GitHub Pages 走 export。能做，但不如 Astro 均匀。
- **内容管线**：无原生内容集合概念。社区方案 Contentlayer 已停滞，Velite / 自写 loader 可行，但都是在框架外面搭。remark/rehype 同样可用。
- **插件模型**：没有"站点插件"层面的机制，需自己设计。
- **原型复用**：100% React，复用最彻底。
- **性能**：RSC 可以做到零客户端 JS，但默认 runtime 比 Astro 重；要刻意控制。
- **维护/可 fork**：RSC / Server Actions / 缓存语义是目前前端里学习曲线最陡的部分，且 13→14→15 每代都有缓存行为的破坏性变化。对"其他学者 fork 即用"不友好。
- **动态模式 SEO**：ISR + `revalidatePath` webhook 是业界最顺手的"发布即生效且 SEO 友好"方案，这是 Next 相对 Astro 最实质的优势。
- **适合的情形**：如果你预期站点会长出大量真正的应用功能（登录、后台编辑、评论系统自建、数据看板），Next 的全栈能力值得付出复杂度。就目前四个功能来看，属于过度配置。

#### C. Nuxt（Vue）/ SvelteKit

- 两者的双模式与多目标部署都很强：Nuxt 的 Nitro 是所有框架里部署 preset 最多的（Node/Vercel/Netlify/CF/Bun/Deno/静态），Nuxt Content 的体验接近 Astro collections；SvelteKit adapter 体系同样完整，Svelte 产物最小。
- 主要代价：**放弃 React 原型**，且学术模板生态（fork 用户熟悉度、现成组件）明显小于 React/Astro。
- 结论：技术上完全合格，但没有压倒性理由为它们放弃原型与生态。如果你本人更偏好 Vue/Svelte，可以重新权衡。

#### D. 延续原型：Vite + React SPA + 预渲染

- 优点：从 Figma Make 原型零迁移，起步最快。
- 致命问题：SPA 在动态模式下没有任何服务端渲染能力，"发布即生效 + SEO 友好"无法同时满足；要补上就得引入 SSR 框架，等于重新造一个 Astro/Next。预渲染插件只能覆盖静态模式。没有插件/内容源抽象，全部手写。
- 结论：仅当你决定"自用也只要静态"时才值得考虑；与你的约束冲突，排除。

#### E. Hugo / Jekyll（al-folio、academicpages、Hugo Blox）

- 这是学术界事实标准，al-folio 的功能清单（出版物 BibTeX 渲染、Scholar 标签、CV 数据驱动、新闻/讲座模块）应作为本项目"专业性"的对标基准。
- 但它们没有动态模式、插件能力弱（Go template / Liquid）、与 elog 的"动态发布"理念不匹配。作为**参照物**而非候选。

### 2.3 对照表

| 维度 | Astro | Next.js | Nuxt / SvelteKit | Vite SPA | Hugo 系 |
| --- | --- | --- | --- | --- | --- |
| 静态 + SSR 同一代码库 | ◎ 改一行 | ○ 能力集分叉 | ◎ | ✗ | ✗ 仅静态 |
| Docker / Vercel 系 / GH Pages 三全 | ◎ 官方 adapter | ○ CF 需 OpenNext | ◎ | ○ 仅静态 | ○ 仅静态 |
| front-matter 强校验 | ◎ zod 内置 | △ 自搭 | ◎ | △ | △ |
| 内容源抽象（loader） | ◎ 原生 | △ 自设计 | ○ | ✗ | ✗ |
| 插件机制 | ◎ Integrations | ✗ | ○ Modules | ✗ | △ |
| 复用 React 原型 | ○ island | ◎ | ✗ | ◎ | ✗ |
| 发布即生效 + SEO | ○ 需自做缓存失效 | ◎ ISR | ○ | ✗ | ✗ |
| fork 者学习曲线 | ◎ 最低 | △ 最高 | ○ | ○ | ◎ |
| 默认性能 | ◎ | ○ | ◎ | △ | ◎ |

### 2.4 我的倾向（供你决策）

**Astro 是与你的四条约束贴合度最高的方案**，核心原因是"双模式零分叉 + 三类部署官方支持 + loader/integration 天然对应可插拔"，而它唯一明显的短板（动态模式需自做缓存失效）恰好被我们本来就要写的 `ContentProvider` 层覆盖。

选 **Next.js** 的条件：你明确预期未来要做重应用功能（自建后台、用户系统），并且不在意 fork 用户的门槛。

无论哪个，**内容层与渲染层必须严格分离**（§3），这样即使将来换框架，内容契约、loader、学术组件逻辑都能带走。

---

## 3. 系统架构

### 3.1 总体分层

```
┌──────────────────────────────────────────────────────────────┐
│  内容生产                                                     │
│  Notion ──elog──▶ markdown+frontmatter   BibTeX   JSON Resume │
│  （也可以是 Obsidian / 手写 md / 任何能产出约定格式的工具）      │
└───────────────┬──────────────────────────────────────────────┘
                │ 约定格式（§3.2 内容契约）
┌───────────────▼──────────────────────────────────────────────┐
│  内容存储（Content Store）—— 可换                              │
│  fs 目录 │ git 仓库 │ S3/R2 对象存储 │ 数据库（可选）             │
└───────────────┬──────────────────────────────────────────────┘
                │ ContentProvider 接口（list / get / tags / revalidate）
┌───────────────▼──────────────────────────────────────────────┐
│  站点核心（@offprint/core）                                     │
│  schema(zod) │ loaders │ 学术组件 │ SEO │ 主题 token │ 模块注册  │
└───────────────┬──────────────────────────────────────────────┘
                │
     ┌──────────┴──────────┐
     ▼                     ▼
  static 模式            server 模式
  构建期读 store          请求期读 store（带缓存）
  → GH Pages / CDN        → Docker(Node) / Vercel / CF
```

### 3.2 内容契约（产品的真正核心）

原型里 `CONTENT.md` 的契约是对的，需要扩展为**整站契约**，并把它从"elog 契约"升级为"工具无关的约定格式"——elog 只是第一个参考实现。这样做的原因：elog 是单人维护项目，存在停更风险；契约只要求"markdown + YAML front-matter + 约定字段"，notion-to-md、Obsidian、手写都能满足。

| 集合 | 格式 | 来源示例 | 必填字段 |
| --- | --- | --- | --- |
| `posts` | md + frontmatter | elog(Notion)、手写 | `title, urlname, date, updated` |
| `publications` | YAML（Notion 数据库导出，ADR-008） | Notion 表；bib 导入为可选 loader | `key, title, authors, year, venue, type` |
| `projects` | YAML/JSON 或 md | 手写、GitHub API 补充 | `name, description, links` |
| `cv` | JSON Resume（标准） | 手写 YAML | 按 JSON Resume schema |
| `talks` / `news` / `teaching` | YAML | 手写、Notion | 可选模块 |
| `profile` | site.config | 手写 | `name, affiliation, links` |

每个集合一份 zod schema，构建期 / 请求期都用同一份校验。front-matter 建议增加的字段：`lang`（中英双语）、`series`、`math: true`（按需加载 KaTeX CSS）、`cite`（允许"引用本文"）、`canonical`。

### 3.3 双模式运行

**结论（ADR-003）：static 是默认与基线，server 是可选运行时。** 两者输出的 HTML 相同，差别只在"HTML 何时、由谁生成"。

| 维度 | static | server |
| --- | --- | --- |
| 发布延迟 | 一次构建，1–3 分钟 | 几秒 |
| 线上运行 | 只有文件 | 常驻 Node 进程 |
| 部署目标 | 任何地方，含 GitHub Pages | 需 Node 运行时；GH Pages 不可用 |
| 首字节 | CDN 边缘直出 | 经 Node；全球加速需再套 CDN |
| 错误暴露 | 构建期（上线前） | 请求期（靠 health/日志发现） |
| 宕机/安全面 | 近零 | 进程可挂；有端点需鉴权限流 |
| 搜索 / OG / feed | 构建期产物 | 运行时生成 + 缓存 |
| 运行时功能（草稿预览、评论、按访客切换） | 不可 | 可 |
| 内容量上限 | 构建时间随文章数增长 | 无关 |
| 可复现性 | 本地 build 即复现 | 需复现缓存状态 |

static 加"服务器上同步后自动重建"已覆盖"Notion 点发布、不碰仓库、一两分钟上线"的核心体验（见 `DYNAMIC-PUBLISHING.md` §0）。server 模式用一个常驻进程的全部成本换取秒级发布与运行时功能，作为产品能力在阶段 2 实现；维护者自己的站先跑 static，需要时再切换，内容与模板不变。

**static 模式**（默认；GitHub Pages / 任何 CDN / 自托管静态）
GH Pages：Notion → elog（GitHub Action 定时或 webhook）→ 提交 md 到仓库 → CI 构建 → 部署。
自托管：sync 容器跑 elog → `astro build` → 原子切换 `dist/` → Caddy/Nginx 伺服。发布延迟 = 构建时长。

**server 模式**（可选；你的服务器 Docker / Vercel / CF）
- 站点以 SSR 运行，每次请求通过 `ContentProvider` 读内容，内存缓存 + ETag。
- 发布路径有两种，按 store 不同：
  - **fs store（自托管最简方案，零数据库）**：elog 作为 sidecar 容器按 cron 同步，把 md 写到共享 volume；站点用文件监听（chokidar）或 mtime 比对使缓存失效。Notion 里点"Published"→ 最多一个 cron 周期后生效，SEO 与静态站完全一致。
  - **git / S3 store（Serverless 平台，无持久盘）**：elog 在 GitHub Action 里把 md 推到内容仓库或对象存储，随后调用站点的 `/api/revalidate?secret=…` 端点清缓存（Vercel 上即 ISR revalidate）。
- Notion 近年已提供数据库变更 webhook，可用来即时触发 elog，而非纯 cron —— 作为增强项。

**两种模式共用 100% 模板**，CI 同时构建两种模式防止分叉（§6）。

### 3.4 可插拔的三个层次

1. **内容源可换** → `loader` 注册表：`glob`（本地 md）、`notion`（经 elog 产物或直连）、`bibtex`、`json-resume`、`http`。config 里声明 `posts: { loader: 'glob', dir: 'content/posts' }`。
2. **模块/主题可开关** → `site.config.ts`（zod 校验）：
   ```ts
   export default defineConfig({
     profile: { name, affiliation, orcid, scholar, github, email },
     modules: { blog: true, publications: { source: 'bibtex', file: 'cv/pubs.bib' }, projects: true, cv: true, talks: false, news: true },
     theme: { preset: 'paper', accent: '#…', fonts: { serif, sans, mono }, darkMode: 'auto' },
     i18n: { default: 'en', locales: ['en', 'zh'] },
     runtime: { mode: 'static' | 'server', store: 'fs' | 'git' | 's3' },
   })
   ```
   模块关闭时不生成路由、不出现在导航、不打包其代码。
3. **他人 fork 即用** → 模板仓库 + `docs/` + 一键部署按钮 + `pnpm create offprint`（后期）。每个模块最终做成 Astro integration，第三方可写自己的模块（最后阶段，按需）。

### 3.5 仓库结构

**建议：从 monorepo-lite 起步**，避免公开后再拆包让 fork 用户痛苦：

```
offprint/
├─ packages/core/        # @offprint/core：schema、loaders、组件、integration、SEO
├─ apps/site/            # 你的站：site.config.ts + content/ + 覆盖样式
├─ packages/sync/        # elog 封装：CLI / GitHub Action / Docker sidecar 三种形态
├─ docs/                 # 使用文档（本身也用 core 构建，吃自己的狗粮）
├─ docker/               # Dockerfile、compose（site + sync sidecar）
└─ .github/workflows/    # 双模式构建、Lighthouse、内容校验、部署
```

如果想更快出 MVP，也可以先单包、在 `src/lib` 里划清边界，第 4 阶段再拆——代价是公开前的一次重构，只由你承担。

---

## 4. "学术专业性"功能清单

对标 al-folio / Hugo Blox，分必做与可选：

**出版物**
- BibTeX 为单一事实来源（与你写论文的 .bib 复用），citation-js / CSL 渲染 APA、IEEE 等多种样式。
- 每条：PDF / Code / DOI / arXiv / Slides / Poster 链接、作者高亮（你本人加粗）、"Cite" 弹窗（BibTeX + 格式化引用一键复制）、按年份/类型分组、首页 Selected Publications。
- 出版物详情页输出 Google Scholar 识别的 Highwire Press meta 标签（`citation_title`、`citation_author`、`citation_pdf_url`…）。

**博客**
- KaTeX 公式（服务端渲染，无客户端 JS）、Shiki 高亮、脚注、图注、定理/证明/备注环境（remark-directive）。
- 文中引用 `[@key]` → 文末参考文献（rehype-citation），与出版物共用 .bib。
- "Cite this post"（BibTeX + 可选 Zenodo DOI）、阅读时间、TOC、系列、最近更新、相关文章。
- RSS / Atom / JSON Feed、sitemap、OG 图自动生成（satori）、JSON-LD（`ScholarlyArticle` / `BlogPosting`）。
- 搜索：Pagefind（静态索引，server 模式下构建期生成或按需重建）。
- 评论：giscus（GitHub Discussions）可开关。

**CV**
- JSON Resume 数据 → 网页 + PDF（print CSS 一次到位；进阶：CI 用 Typst 生成排版级 PDF）。

**首页 / 全站**
- ORCID、Scholar、Semantic Scholar、GitHub 图标链接；`Person` JSON-LD；中英双语 + hreflang；深色模式；无障碍（WCAG AA）；Lighthouse 四项 ≥ 95；旧站 URL 301 重定向表。

**可选模块**：Talks、Teaching、News、Students、Reading list。

---

## 5. 路线图

| 阶段 | 周期 | 目标 | 交付 |
| --- | --- | --- | --- |
| **0. 决策与技术验证** | 1 周 | 锁定框架；验证关键风险 | Astro spike：移植 Post 页 + 一篇 elog 产出的 md，验证 KaTeX/Shiki/citation 链；同一代码 `static` 与 `node` 两种构建均通过；Docker 跑通；确认 elog 实际输出与契约一致 |
| **1. 自用 MVP** | 2–3 周 | 替换现有个人网站 | 内容契约 + zod schema；五个页面按 Figma 原型样式移植；BibTeX 出版物；JSON Resume CV；基础 SEO（meta/OG/sitemap/RSS/Scholar 标签）；静态部署到 GH Pages 或 Vercel；旧 URL 重定向 |
| **2. 动态发布链** | 1–2 周 | Notion 发布即生效 | `ContentProvider` + fs store；server 模式 Docker（site + elog sidecar + cron）；`/api/revalidate`；git/S3 store 与 Vercel ISR 路径；发布延迟与缓存一致性测试 |
| **3. 学术打磨** | 2 周 | 专业性到位 | Cite 弹窗与 CSL；文中引用；OG 图生成；Pagefind；CV PDF；双语；giscus；a11y 审计；Lighthouse CI |
| **4. 开源化** | 2 周 | 他人 fork 即用 | 拆 `core` / `site` / `sync`；模板仓库 + 示例内容；文档站；一键部署按钮（Vercel/Netlify/CF）+ Docker compose + GH Pages workflow；MIT/Apache 许可；CONTRIBUTING；issue 模板 |
| **5. 插件 API** | 按需 | 第三方扩展 | 模块化为 Astro integration；主题包；`create-offprint` CLI；插件开发指南 |

阶段 1 结束就可以上线替换旧站；阶段 2 才是与其他静态方案拉开差距的地方；阶段 4 之前不要公开推广。

---

## 6. 风险与对策

| 风险 | 对策 |
| --- | --- |
| elog 停更或格式变化 | 契约定义为"工具无关的 md + frontmatter"，`packages/sync` 只是适配层；同时验证 notion-to-md 作为备胎 |
| Notion 图片 URL 会过期 | elog 图床功能（GitHub / S3 / R2）必开；CI 里做死链检查 |
| 双模式代码分叉 | CI 每次 PR 同时构建 static 与 server 两种模式并跑同一组 e2e（Playwright）快照 |
| 动态模式缓存不一致 | 内容 hash 作为 ETag；revalidate 端点幂等；sidecar 同步后写 `manifest.json` 供站点比对 |
| 旧站 SEO 流失 | 迁移前导出旧站 URL 清单，逐条 301；保留 Scholar 已收录的 PDF 路径 |
| 范围蔓延 | 阶段 1 只做四个功能；可选模块放阶段 3 之后 |
| 单人维护负担 | 依赖少而稳；Renovate 自动更新；文档与代码同仓 |

---

## 7. 待你决定的开放问题

1. **框架**：接受 §2.4 的倾向（Astro）吗？还是需要我再对 Next.js 做一次同等深度的 spike 对比？
2. **双语**：站点是否中英双语？影响内容契约（`lang` 字段、Notion 里一页还是两页）和路由设计。
3. **出版物来源**：以 `.bib` 文件为准，还是在 Notion 里维护出版物表再由 elog 导出？（建议 .bib，便于与论文写作复用。）
4. **旧站**：现有个人网站的 URL 结构和域名是什么？需要迁移重定向表。
5. **仓库形态**：monorepo-lite 起步，还是单包先跑通？
6. **服务器环境**：你的服务器是否已有 Docker / 反向代理（Caddy/Nginx）？决定 compose 文件怎么写。
7. **设计稿**：Figma 原型的视觉是否已定稿，还是移植时可以调整？

确定 1、2、5 之后即可开始阶段 0。

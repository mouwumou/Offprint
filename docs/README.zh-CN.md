# Offprint

> 抽印本 — 一个开源、可插拔、易部署的学术个人网站系统。

[English](../README.md)

[![Use this template](https://img.shields.io/badge/GitHub-Use_this_template-2ea44f?logo=github)](https://github.com/mouwumou/Offprint/generate)

Offprint 把学术首页、博客、出版物、项目与 CV 放进同一个站点，并做了两件大多数静态站生成器不做的事：

- **内容在别处编排，在这里发布。** 博客在 Notion（或任何能产出约定格式 markdown 的工具）里写，经 [elog](https://elog.1874.cool) 转换后由站点消费；站点本身不依赖任何编辑器，也不在运行时请求 Notion。
- **一套代码，两种运行方式。** 同一套模板既能编译成纯静态站（GitHub Pages、任意静态托管），也能以服务端渲染跑在容器里（VPS 上的 Docker、Cloudflare Containers——任何有完整运行时与持久卷的环境），做到"在 Notion 点发布即生效"，两种模式输出完全相同的 HTML。

面向学术场景的细节是默认配置而非附加项：

- 中英双语路由与内容字段，默认语言走根路径；
- 出版物列表与 Cite 弹窗（BibTeX / APA / MLA / Chicago），Google Scholar 可抓取的 Highwire Press meta；
- KaTeX 数学、Shiki 代码高亮、文中引用与参考文献；
- JSON Resume 驱动的 CV 页与 PDF 导出；
- canonical / OpenGraph / JSON-LD、RSS / Atom / JSON feed、sitemap、自动 OG 图；
- 站内搜索（pagefind）、深浅色主题、giscus 评论、旧链接跳转；
- 零 JS 默认：只有主题切换、Cite、搜索这类真正交互的部分才带脚本。

主题、页面部件与模块都可插拔：内置 `scholar`（学术白底，默认）与 `paper`（杂志纸面风）两套主题，第三方主题装进 `extensions/` 即用，所有可调项都在一份 `site.yaml` 里。

## 快速开始

```bash
pnpm install
pnpm dev            # http://localhost:4321，示例内容开箱可见
pnpm build:static   # 纯静态构建 → dist/
```

改三处就是你的站：`content/profile.yaml`（你是谁）、`site.yaml`（开哪些模块、什么主题）、`content/` 其余文件（出版物、项目、CV、独立页面、首页排布）、博客（放 markdown 进 `content/posts/`，或接上 Notion）。完整步骤见 [docs/guide/getting-started.md](guide/getting-started.md)。

## 用作模板

这个仓库是**公开模板**：自带样例内容，构建完全自足，CI 与 demo 部署只用 `GITHUB_TOKEN`，**仓库里没有也永远不会有任何密钥**。你的站点是从它生成出去的**实例仓库**——点上面的 "Use this template"（比 fork 干净，不带开发历史）。

实例仓库需要的全部设置（都在你自己仓库的 Settings 里，按需配）：

| 类型 | 名称 | 何时需要 |
| --- | --- | --- |
| Variable | `SITE_URL` | GitHub Pages 自动取得（含 `user.github.io/repo` 子路径），其他平台按需设置 |
| Variable | `SYNC_ENABLED=true` | 要让 Actions 每 30 分钟从 Notion 同步 |
| Secret | `NOTION_TOKEN`、`NOTION_DB` | 同上 |

什么都不设时，推送即得 GitHub Pages 静态站，同步工作流显示 skipped。自托管（Docker，static 或 server 模式）的密钥只放服务器本地 `.env`。

## 文档

从 [docs/README.md](README.md) 进入。使用文档：[快速开始](guide/getting-started.md) · [配置体系](guide/configuration.md) · [Notion 同步](guide/sync.md) · [部署](guide/deployment.md) · [主题](THEMING.md) · [内容契约](CONTENT-CONTRACT.md)。设计文档（架构、ADR、发布链）与开发过程文档也在同一索引里。

## 状态

核心功能全部完成并经双模式一致性 e2e、子路径部署 e2e、无障碍（axe）与 Lighthouse 门槛验收；正在做开源发布的收尾。开发在 `dev` 分支进行，`main` 是不含开发文档的发布快照。任务清单见 [dev 分支上的 ROADMAP](https://github.com/mouwumou/Offprint/blob/dev/docs/dev/ROADMAP.md)。

## 贡献与安全

欢迎 issue 与 PR，流程与代码约束见 [CONTRIBUTING.md](../.github/CONTRIBUTING.md)。安全漏洞请走 [SECURITY.md](../.github/SECURITY.md) 的私密渠道，不要开公开 issue。

## 许可

MIT。

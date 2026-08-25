# Offprint

> 抽印本 — 一个开源、可插拔、易部署的学术个人网站系统。

[![Use this template](https://img.shields.io/badge/GitHub-Use_this_template-2ea44f?logo=github)](https://github.com/mouwumou/Offprint/generate)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmouwumou%2FOffprint)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/mouwumou/Offprint)

**状态：阶段 0–3 已完成** —— 双模式构建与 HTML 一致性 e2e、内容契约 schema、markdown 管线（KaTeX/Shiki/引用）、Notion 同步链（含图片物化）、双语路由、搜索、SEO/feed/OG、Docker 双模式部署均已跑通。阶段 4（开源化）进行中。开发交接文档见 `CLAUDE.md` 与 `docs/`。

```bash
pnpm install
pnpm dev            # 开发服务器（示例文章在 content/posts/）
pnpm build:static   # 纯静态构建 → dist/
pnpm test && pnpm e2e
```

## 用作模板（ADR-017）

这个仓库是**公开模板**：它自带样例内容，构建完全自足，CI 与 GitHub Pages demo 部署全部只用 `GITHUB_TOKEN`，**不配置任何外部密钥**。你的站点是从它生成出去的**实例仓库**：

1. **生成仓库**：GitHub 上点 "Use this template"（比 fork 干净，不带模板的开发历史）。上面的 Vercel / Netlify 一键按钮也会自动生成你的仓库副本并首次部署——两个平台都会执行 `pnpm build`（即 `build:static`，含搜索索引），零配置可用。
2. **配置实例**（你自己仓库的 Settings）：
   - Variables：`SITE_URL`（站点公网地址）；要开 Notion 同步则加 `SYNC_ENABLED=true`；要部署 Vercel 则加 `DEPLOY_VERCEL=true`。
   - Secrets（仅在需要对应功能时）：`NOTION_TOKEN`、`NOTION_DB`；Vercel 需要 `VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`。
3. **替换内容**：编辑 `site.yaml`（个人资料、模块、导航、外观——所有选项都列在文件里，带注释）；页面内容与首页排布在 `content/` 目录（posts 归同步管，其余直接改文件，见 `content/README.md`）。

不设任何变量时，推送即得 GitHub Pages 静态站；sync 与 Vercel 工作流显示 skipped。自托管（Docker/server 模式）的密钥只放服务器本地 `.env`（见 `.env.example`），永远不进仓库。

Offprint 把学术首页、博客、项目与 CV 放进同一个站点，并做了两件大多数静态站生成器不做的事：

- **内容在别处编排，在这里发布。** 博客在 Notion（或任何能产出约定格式 markdown 的工具）里写，经 [elog](https://elog.1874.cool) 转换后由站点消费；站点本身不依赖任何编辑器。
- **一套代码，两种运行方式。** 同一套模板既能编译成纯静态站（GitHub Pages、任意 CDN），也能以服务端渲染运行在 Docker / Vercel / Cloudflare 上，做到"在 Notion 点发布即生效"且对搜索引擎完全友好。

面向学术场景的细节是默认配置而非附加项：中英双语、Notion 维护的出版物与 Cite 弹窗、KaTeX 与代码高亮、文中引用与参考文献、Google Scholar 可抓取的 meta 标签、JSON Resume 驱动的 CV 与 PDF 导出、RSS / sitemap / OG 图。

## 文档

| | |
| --- | --- |
| `CONTRIBUTING.md` | 贡献指南（开发、约束、主题贡献、PR 要求） |
| `SECURITY.md` | 安全策略：漏洞报告、密钥模型、扩展信任模型 |
| `CLAUDE.md` | 开发约束与工作方式 |
| `docs/PLANNING.md` | 规划：框架分析、功能清单、风险 |
| `docs/DECISIONS.md` | 架构决策记录 |
| `docs/ARCHITECTURE.md` | 分层、仓库结构、运行模式 |
| `docs/CONTENT-CONTRACT.md` | 内容契约（front-matter / YAML） |
| `docs/DYNAMIC-PUBLISHING.md` | 动态发布链设计 |
| `docs/DESIGN-REFERENCE.md` | 设计 token 与原型组件 |
| `docs/REFERENCES.md` | 参考项目 |
| `docs/ROADMAP.md` | 阶段与任务清单 |

## 许可

MIT。

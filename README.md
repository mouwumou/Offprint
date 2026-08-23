# Offprint

> 抽印本 — 一个开源、可插拔、易部署的学术个人网站系统。

**状态：阶段 0（技术验证）已完成** —— 双模式构建、内容契约 schema、markdown 管线（KaTeX/Shiki）、语言前缀路由的文章页、静态 Docker 镜像均已跑通，双模式 HTML 一致性有 e2e 保障。当前处于阶段 1（自用 MVP）。开发交接文档见 `CLAUDE.md` 与 `docs/`。

```bash
pnpm install
pnpm dev            # 开发服务器（示例文章在 content/posts/）
pnpm build:static   # 纯静态构建 → dist/
pnpm test && pnpm e2e
```

Offprint 把学术首页、博客、项目与 CV 放进同一个站点，并做了两件大多数静态站生成器不做的事：

- **内容在别处编排，在这里发布。** 博客在 Notion（或任何能产出约定格式 markdown 的工具）里写，经 [elog](https://elog.1874.cool) 转换后由站点消费；站点本身不依赖任何编辑器。
- **一套代码，两种运行方式。** 同一套模板既能编译成纯静态站（GitHub Pages、任意 CDN），也能以服务端渲染运行在 Docker / Vercel / Cloudflare 上，做到"在 Notion 点发布即生效"且对搜索引擎完全友好。

面向学术场景的细节是默认配置而非附加项：中英双语、Notion 维护的出版物与 Cite 弹窗、KaTeX 与代码高亮、文中引用与参考文献、Google Scholar 可抓取的 meta 标签、JSON Resume 驱动的 CV 与 PDF 导出、RSS / sitemap / OG 图。

## 文档

| | |
| --- | --- |
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

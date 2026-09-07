# 贡献指南

感谢你考虑为 Offprint 做贡献。Issue 与 PR 用中文或英文均可；代码、标识符与提交信息用英文，项目文档用中文（README 例外：`README.md` 英文与 `README.zh-CN.md` 中文并存，改一处请同步另一处）。

## 本地开发

```bash
pnpm install
pnpm dev                 # Astro 开发服务器
pnpm test                # vitest 单测
pnpm e2e                 # playwright：冒烟 + 双模式 HTML 一致性
pnpm lint && pnpm typecheck
pnpm build:static        # 两种构建都必须成功
pnpm build:server
```

需要 Node 22+ 与 pnpm（版本见 `package.json` 的 `packageManager` 字段）。不需要任何密钥——模板自带样例内容，构建完全自足。

## 开始之前

- 读 [docs/DECISIONS.md](docs/DECISIONS.md)：已定的架构决策（ADR）不在 PR 里推翻；想改先开 issue 讨论。
- 读 [CLAUDE.md](CLAUDE.md) 的"不可违反的约束"一节——它们同样约束人类贡献者，其中最常被踩的三条：
  1. 页面只依赖 `ContentProvider`，不得直接读文件系统或 `getCollection`；
  2. static 是基线：任何改动后两种构建都要成功，server 专属代码不得进入 static 产物；
  3. 新增 UI 文案必须进 `src/core/i18n/`，不得硬编码（双语是一等公民）。
- 包边界：`src/core` 不得 import `src/sync` / `extensions` / `src/pages`；`src/sync` 只能 import `src/core/schema`。lint 会拦。

## 贡献主题 / widget

主题住在 `extensions/`（第三方）或 `src/core/themes/`（内置），契约见 [docs/THEMING.md](docs/THEMING.md) 与 ADR-018/022：

- 主题是一份 `theme.json`（token 表、字体、voice、可选 options 声明）加可选的 widget 组件；
- token 值经 schema 校验（拒绝 `< > ; { }`），所有可配置项必须在 `theme.json` 里声明，不接受"改 src/ 才能用"的主题；
- 提交前用你的主题跑一遍 `pnpm build:static && pnpm e2e`，并附一张首页与文章页截图。

## 提交与 PR

- Conventional Commits（`feat(core): …`、`fix(sync): …`、`docs: …`），一个任务一个 commit。
- PR 描述里说明动机；引入新依赖必须说明理由（本项目依赖偏保守：少而稳、有类型、维护活跃）。
- 结构性决定（新目录、新配置项、新契约字段）先在 issue 里对齐，合并时在 `docs/DECISIONS.md` 追加 ADR。
- CI 要求全绿：双模式构建、单测、e2e、lint、typecheck、Lighthouse 阈值 0.95。

## 报告问题

- 安全漏洞走 [SECURITY.md](SECURITY.md)，**不要开公开 issue**。
- 其余按 issue 模板填写；bug 报告请带运行模式（static / server / dev）与最小复现。

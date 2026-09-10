## 动机 / Why

<!-- 解决了什么问题？关联 issue。 -->

## 改动 / What

<!-- 做了什么。引入新依赖的话，在这里说明理由（依赖政策：少而稳、有类型、维护活跃）。 -->

## 自查清单 / Checklist

- [ ] `pnpm build:static` 与 `pnpm build:server` 都成功
- [ ] `pnpm test`、`pnpm lint`、`pnpm typecheck` 通过（UI 改动另跑 `pnpm e2e`）
- [ ] 新增 UI 文案在 `src/core/i18n/`（en + zh），无硬编码
- [ ] 页面数据只经 `ContentProvider`，未直接读文件系统
- [ ] 结构性决定已在 `docs/DECISIONS.md` 追加 ADR（如适用）
- [ ] 提交信息符合 Conventional Commits

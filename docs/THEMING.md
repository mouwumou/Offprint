# 主题制作规范（ADR-018）

主题决定站点的**皮肤**：颜色、圆角、字体，以及主题自带的附加样式。布局与交互不属于主题——那是部件层（`src/site/widgets/`，见 ARCHITECTURE §3.1）与编排层（`content/home.yaml` 的 sections、`site.yaml` 的 `nav` / `header` / `footer`）的职责。这个边界是刻意的：主题只要不碰结构，就永远不会因为核心升级而坏掉。

## 1. 一个主题是什么

一个目录，放在下列任一位置（同名时靠前者优先）：

```
src/site/themes/<name>/     # 站点自有主题（实例仓库里直接写）
src/core/themes/<name>/     # 内置主题（向模板仓库 PR 贡献）
```

目录内容：

```
<name>/
├─ theme.json     # 必需：manifest（tokens + fonts）
└─ theme.css      # 可选：字体加载（@import fontsource 包）与主题特有样式
```

没有注册表、没有枚举：**放进目录、通过校验，就是合法主题**。`site.yaml` 里 `theme: { name: <name> }` 即启用；名字解析不到时构建失败并列出当前可用的主题。

## 2. theme.json

```json
{
  "name": "<name>",
  "tokens": {
    "light": { "background": "#ffffff", "...": "全部 15 个 token 必填" },
    "dark": { "...": "同上" }
  },
  "fonts": {
    "sans": "完整 font-family 栈（含 CJK 与系统回退）",
    "serif": "…",
    "mono": "…"
  }
}
```

- **token 词表**（15 个，见 `src/core/theme/contract.ts` 的 `TOKEN_NAMES`）：`background` `foreground` `card` `card-foreground` `primary` `primary-foreground` `secondary` `secondary-foreground` `muted` `muted-foreground` `accent` `accent-foreground` `border` `ring` `radius`。缺一个、多一个都是构建期错误（zod 逐键报名）。
- 两种配色（light/dark）都必须给全——站点有用户可切换的暗色模式，主题不能只管一半。
- 字体栈**必须含 CJK 回退**（参照 paper 的栈；中文 webfont 体积不划算，走系统字体是项目约定）。

token 的注入由 BaseLayout 完成（内联 `:root{…}.dark{…}`），主题不用也不要在 CSS 里重复定义它们。用户可在 config 里用 `theme.tokens` / `theme.accent` 在你的主题之上做覆盖——这是预期行为，不要用更高特异性对抗它。

## 3. theme.css（可选）

- **字体加载**放这里：`@import '@fontsource/...'`（fontsource 包需在 package.json 里，向模板贡献主题时一并加入依赖）。
- 可以写主题特有的样式微调，但**只准新增，不准结构性覆盖**：不要重排版式基座（`src/core/theme/base.css`）里的布局规则，不要 `display:none` 掉核心组件，不要引入 JS。
- 想改布局？那不是主题，去写部件覆盖或改编排配置。

## 4. 质量门：跑深度测试

深度测试套件是**内容无关也主题无关**的——换上你的主题后全套照跑：

```bash
pnpm build:static && pnpm build:server   # 双模式都必须成功
pnpm e2e                                  # 双模式 HTML 一致性 + axe 可访问性 + 375px 无横向溢出
pnpm lhci                                 # 四类 Lighthouse ≥ 0.95（性能/可访问性/最佳实践/SEO）
```

最常见的翻车点是 **axe 的颜色对比度**（`muted-foreground` 对 `background`、`primary` 对 `background` 都要过 AA）和暗色模式漏配。PR 一个内置主题时，CI 会替你把关，但本地先跑省来回。

## 5. 分发形态

| 形态 | 现在 | 阶段 4 拆包后 |
| --- | --- | --- |
| 站点自有 | `src/site/themes/<name>/` | 不变 |
| 向模板贡献 | PR 到 `src/core/themes/<name>/` | 不变 |
| npm 包 | — | `offprint-theme-<name>`（解析链加入 node_modules 查找） |

## 6. 后续版本的契约扩展（计划中，尚未实现）

以下字段**现在写了会被 schema 拒绝**（ADR-016：schema 只收已实现的）：

- `voice`：少量腔调开关（kicker 大写与否、节标签样式、头像灰度处理），随新默认主题落地（P5-2f）。
- `shiki`:代码高亮双主题自定义（现为全站统一的 offprint 双主题）。

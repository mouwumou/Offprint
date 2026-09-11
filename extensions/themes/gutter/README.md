# gutter — 示例主题

随模板分发的示例主题，也是主题契约的活参考：三层能力各用一个文件演示，每个文件都能直接当你自己主题的起点。规范全文在 `docs/THEMING.md`。

| 文件 | 演示什么 |
| --- | --- |
| `theme.json` | 皮肤层：15 个 token 的 light / dark 两套、含 CJK 回退的字体栈、`voice` 三个腔调值、`typography.proseSize`、一条 `options` 声明（`showAffiliation`） |
| `theme.css` | 样式层：只用 `data-part` 挂钩，把出版物页改成"年份在左栏、细线分隔"的简历式排布，含手机断点；注释里写了主题 CSS 允许用的两类选择器 |
| `widgets/site-footer.astro` | 部件层：主题自带的页脚，替换内置 `site-footer`；props 与内置相同、数据经 provider、保留 `data-part` 挂钩、经 `themeOptions` 读选项 |

观感：白底、墨绿主色、Charter 单字体、学术密度（`labels: plain` / `density: compact`），出版物页的年份左栏是它和内置 `scholar` 最明显的区别。

## 启用

```yaml
# site.yaml
theme:
  name: gutter
  options:
    showAffiliation: false # 页脚不显示单位；不写则取声明里的默认值 true
```

## 改成你自己的

1. 复制一份并改名：`cp -r extensions/themes/gutter extensions/themes/<name>`，再把 `theme.json` 里的 `name` 改成 `<name>`（目录名与 `name` 必须一致，否则构建报错）。
2. 改颜色、字体、腔调；不需要的层直接删文件（`theme.css` 与 `widgets/` 都可选）。
3. `site.yaml` 的 `theme.name` 指向它。
4. 验收：`pnpm theme:check <name>` 跑双模式构建与全套 e2e（无障碍对比度、手机视口、子路径），过了就能用。

别直接改这个目录：留着它，以后从模板仓库拿更新的示例时不用合并。升级脚本不碰 `extensions/`，所以你的主题不会被升级覆盖；从模板生成时还没有这个目录的老实例，从模板仓库的 `main` 分支把 `extensions/themes/gutter/` 复制过来即可。

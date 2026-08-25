# extensions/ — 装进来的扩展（ADR-022）

`src/` 之外的第三个入口：主题、部件覆盖、模块都放这里，构建时自动检索，**零 src 接触**。

| 子目录 | 作用 | 约定 |
| --- | --- | --- |
| `themes/<name>/` | 主题包：`theme.json`（颜色/字体/腔调/选项声明）+ 可选 `theme.css` + 可选 `widgets/`（主题自带的部件实现） | **只读**：升级 = 整目录替换；一切可调项在 site.yaml 的 `theme` 节（含 `theme.options`） |
| `widgets/<块名>.astro` | 站点级部件覆盖（你自己的代码），压过启用主题的同名部件与内置 | props 与内置部件相同（`src/core/components/home/` 即契约） |
| `modules/<id>/` | 站点模块：`module.yaml` 声明导航与文案，放进目录即注册 | site.yaml 里 `modules.<id>: true` 启用 |

部件查找顺序：`extensions/widgets/` > 启用主题的 `widgets/` > 内置。规范：`docs/THEMING.md`、`docs/ARCHITECTURE.md` §3。

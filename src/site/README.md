# src/site/ — 代码级定制

配置（site.yaml）和内容（content/）之外的第三个入口：需要写代码/做主题时才用，默认可以整个目录空着。

| 子目录 | 作用 | 规范 |
| --- | --- | --- |
| `themes/<name>/` | 自有主题：`theme.json`（颜色/圆角/字体）+ 可选 `theme.css`（字体加载等）。`site.yaml` 里 `theme.name` 指到它，同名时覆盖内置主题 | `docs/THEMING.md` |
| `widgets/<type>.astro` | 覆盖同名的内置首页部件（拿到与内置完全相同的 props） | `docs/ARCHITECTURE.md` §3.1 |
| `modules/<id>/` | 自有模块：`module.yaml` 声明导航与文案，放进目录即注册；配置里 `modules.<id>: true` 启用 | `docs/ARCHITECTURE.md` §3.2 |

约束：core 永远不 import 这里的代码（边界由 eslint 守着）；主题与模块的声明文件是纯数据（YAML/JSON），由构建期读取。

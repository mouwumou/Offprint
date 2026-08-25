# content/ — 页面里显示什么

站点配置（长什么样）在根目录 `site.yaml`；这里是内容与页面编排（ADR-014/021）。

| 文件 / 目录 | 内容 | 谁写 |
| --- | --- | --- |
| `posts/` | 博客文章 | **同步管线独占**（Notion → elog → 归一化），不要手改 |
| `pages/` | 独立页面（about、now…），markdown + front-matter | 你手编 |
| `home.yaml` | 首页从上到下的排布（块与顺序）；删掉即用内置默认 | 你手编 |
| `publications.yaml` | 出版物列表 | 你手编 |
| `projects.yaml` | 项目列表 | 你手编 |
| `cv.yaml` | CV（JSON Resume 格式 + 双语/教学等扩展） | 你手编 |
| `news.yaml` | 首页"近况"条目（可选） | 你手编 |
| `assets/` | 图片等静态资源，站内以 `assets/…` 引用 | 你手编；同步也会把 Notion 图片物化进来 |
| `manifest.json` | 同步产物（内容清单），server 模式的更新信号 | 同步管线独占 |

字段规范见 `docs/CONTENT-CONTRACT.md`；所有文件构建时经 schema 校验，不合规会报错而不是渲染成坏页面。

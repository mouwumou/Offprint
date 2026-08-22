# 设计参考

来源：Figma Make 原型 https://www.figma.com/make/vLHHT98M1TeI2OGNnQs71X/Academic-Blog-System
（React 19 + Vite + Tailwind 4；可通过 Figma MCP `get_design_context` 读取全部源码，nodeId `0:1`）。

设计语言一句话：**排印纸面底色、老式衬线正文、新怪诞无衬线界面、等宽字体做技术性标注、酒红（claret）强调色。**

## 1. Token（锁定，ADR-011）

```css
:root {
  --background: #faf8f3;  --foreground: #1c1a16;
  --card: #ffffff;        --card-foreground: #1c1a16;
  --primary: #6f2232;     --primary-foreground: #faf8f3;   /* claret */
  --secondary: #efece4;   --secondary-foreground: #3a3730;
  --muted: #f2efe8;       --muted-foreground: #6c675c;
  --accent: #6f2232;      --accent-foreground: #faf8f3;
  --border: #e4dfd4;      --ring: #6f2232;
  --radius: 3px;
}
.dark {
  --background: #16150f;  --foreground: #ebe6da;
  --card: #1e1c15;        --card-foreground: #ebe6da;
  --primary: #cf9aa4;     --primary-foreground: #16150f;
  --secondary: #26241b;   --secondary-foreground: #d6d0c2;
  --muted: #221f18;       --muted-foreground: #a29c8c;
  --accent: #cf9aa4;      --accent-foreground: #16150f;
  --border: #322e23;      --ring: #cf9aa4;
}
```

字体：serif `Newsreader`（正文、标题、姓名）；sans `Inter`（界面、表格）；mono `JetBrains Mono`（标签、日期、导航、kicker）。
代码高亮色：comment = muted-foreground 斜体；keyword = primary；string `#4f7a4f` / dark `#9ec49e`；number `#9a6a2f` / `#d8a765`；title `#3a5a8c` / `#8fb0dd`。移植到 Shiki 时做一个同色自定义主题。

## 2. 版式规则

- 容器 `max-w-6xl`，横向 padding `px-5 sm:px-8 lg:px-12`；文章正文 `max-w-2xl`。
- Header 高 64px，sticky，`bg-background/85 + backdrop-blur`；左侧 serif 姓名 + mono 小字领域；右侧 mono 大写导航（`text-xs tracking-[0.12em]`），激活态 primary 色；主题切换 36px 方按钮。
- 首页节结构：`grid md:grid-cols-[200px_1fr]`，左列为 mono 大写 `tracking-[0.2em]` 的节标签（About / Selected work / Recent writing），节之间 `border-t`。
- Hero：220px 头像（4:5，灰度→hover 彩色）+ 右侧 role(mono primary) / name(serif 4xl–5xl) / field(serif xl muted) / tagline(serif lg)；两个按钮（实心 primary、描边）；下方三列 meta 条（Affiliation / Contact / Elsewhere）。
- 正文 `.prose`：serif 1.1875rem / 1.72，weight 380；h2 带下边线；无序列表圆点用 primary 色 5px 圆；链接 primary 下划线 40% 透明，hover 实色；blockquote 左 2px primary 线 + 斜体 muted。
- Footer：左姓名 + 机构；右链接行（含 RSS）+ 一行 mono 11px "Written in Notion · published with elog · © year"。
- 打印样式：CV 路由 `window.print` 即 PDF，隐藏 header/footer，黑字白底，`@page margin 1.6cm`，`break-inside: avoid`。

## 3. 原型组件 → Offprint 对应

| 原型文件 | 作用 | 移植方式 |
| --- | --- | --- |
| `components/Layout.tsx` | Header / Footer / skip link | `.astro`，导航由模块注册生成 |
| `components/Seo.tsx` | title/meta/OG/JSON-LD | `core/seo/Head.astro`，扩展 Highwire meta |
| `components/Markdown.tsx` | react-markdown 渲染 | 替换为服务端 remark/rehype 管线（ARCHITECTURE §5） |
| `components/Toc.tsx` + `lib/toc.ts` | 目录 + 滚动高亮 | TOC 服务端生成，高亮为小 island |
| `components/CiteButton.tsx` + `lib/bibtex.ts` | 复制 BibTeX | React island，扩展为 Cite 弹窗（BibTeX/APA/…） |
| `components/CodeBlock.tsx` | 复制按钮 | Shiki transformer + 极小脚本 |
| `hooks/useTheme.ts` | dark mode | 内联脚本防闪烁 + island 按钮 |
| `pages/Home.tsx` | 首页 | `.astro`，数据来自 provider |
| `pages/Blog.tsx` | 列表 + tag 过滤 | `.astro`；tag 过滤用 URL 参数而非客户端状态 |
| `pages/Post.tsx` | 文章页 | `.astro` + TOC/Cite islands |
| `pages/Projects.tsx` | 项目卡片 | `.astro` |
| `pages/CV.tsx` | CV + 打印 | `.astro`，数据改为 JSON Resume，双语 |
| `data/site.ts` / `data/cv.ts` | 示例数据 | 迁为 `site.config.ts` + `content/*.yaml`；示例人物 "Mara Ellison Voss" 可保留为模板示例内容 |
| `content/blog/*.md` | 三篇示例文章 | 保留为示例内容，验证契约 |

## 4. 尚无设计、需要补的界面

语言切换器（Header 右侧，mono 小字 `EN / 中`）、独立页面（pages 模块）模板、出版物列表页与详情页（阶段 3）、Cite 弹窗、搜索、404 以外的错误态（"内容同步中"）、Talks/News 模块。补设计时沿用上述 token 与版式规则，先出 `.astro` 再回填 Figma（可用 Figma MCP `generate_figma_design`）。

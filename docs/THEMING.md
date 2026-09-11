# 主题制作规范

一个主题是一个目录：`theme.json`（必需）、`theme.css`（可选）、`widgets/`（可选）。它能做三个层次的事，逐层深入：

| 层次 | 靠什么 | 能改什么 |
| --- | --- | --- |
| 1. 皮肤 | `theme.json` | 颜色、圆角、字体栈、正文字号、腔调预设、主题自定义选项 |
| 2. 样式 | `theme.css` + **样式挂钩** | 任何部件的任何样式，包括布局——挂钩是稳定的 `data-part` 名与预设类，不是工具类名 |
| 3. 部件 | `widgets/<name>.astro` | 整个替换某个部件（首页各节、出版物行、文章行、站点头尾），props 与内置相同 |

示例主题 **`extensions/themes/gutter/`** 随模板分发，三层各演示一遍，附逐文件说明的 [README](../extensions/themes/gutter/README.md)；做自己的主题最快的路是复制它（§1）。

验收只有一条：`pnpm theme:check <name> [目录]` 把仓库复制一份、装上你的主题、跑双模式构建与全套 e2e（双模式 HTML 一致、无障碍、手机视口、子路径）。模板仓库的 CI 对内置的 `paper` 和示例主题 `gutter` 固定跑这条；由模板生成的实例仓库不跑（实例只验证自己启用的主题），想在实例里验收自定义主题就本地跑一次。

## 1. 目录与安装

```
extensions/themes/<name>/   # 安装的主题（只读：升级 = 整目录替换）
extensions/themes/gutter/   # 随模板分发的示例主题（复制它起步，不要直接改它）
src/core/themes/<name>/     # 内置主题（向模板仓库 PR 贡献）
```

同名时 `extensions/` 优先。没有注册表、没有枚举：**放进目录、通过校验，就是合法主题**。`site.yaml` 里 `theme: { name: <name> }` 即启用；名字解析不到时构建失败并列出可用主题。

**只读原则**：使用者永远不编辑主题目录——一切可调项在 site.yaml：`theme.accent` / `theme.tokens` / `theme.typography`（通用覆盖）与 `theme.options`（主题自定义选项）；想改某个部件，在 `extensions/widgets/` 放同名文件压过它。

### 从示例主题起步

```bash
cp -r extensions/themes/gutter extensions/themes/mine   # 1. 复制
sed -i 's/"name": "gutter"/"name": "mine"/' extensions/themes/mine/theme.json   # 2. 目录名与 name 必须一致
#    3. site.yaml → theme: { name: mine }；改颜色字体腔调，不要的层删文件即可
pnpm theme:check mine                                   # 4. 验收
```

老实例（从模板生成时还没有这个目录）从模板仓库 `main` 分支复制 `extensions/themes/gutter/` 过来即可；升级脚本不碰 `extensions/`。

## 2. theme.json

```json
{
  "name": "<name>",
  "voice": { "labels": "plain", "photo": "plain", "density": "compact" },
  "typography": { "proseSize": "1.0625rem" },
  "options": {},
  "tokens": {
    "light": { "background": "#ffffff", "...": "全部 15 个 token 必填" },
    "dark": { "...": "同上" }
  },
  "fonts": { "sans": "…", "serif": "…", "mono": "…" }
}
```

- **tokens**（15 个，`src/core/theme/contract.ts` 的 `TOKEN_NAMES`）：`background` `foreground` `card` `card-foreground` `primary` `primary-foreground` `secondary` `secondary-foreground` `muted` `muted-foreground` `accent` `accent-foreground` `border` `ring` `radius`。light/dark 都必须给全；缺一个、多一个都是构建期错误。BaseLayout 把它们注入为 `:root{…}.dark{…}` 变量，主题不要在 CSS 里重复定义。
- **fonts**：完整 `font-family` 栈，**必须含 CJK 回退**。字体文件的加载放 theme.css（`@import '@fontsource/...'`）。
- **typography.proseSize**：文章正文基准字号，缺省 `1.0625rem`；用户可在 site.yaml 覆盖。
- **voice（腔调预设，可省略）**：`labels: plain | mono-caps`（普通字体 vs 等宽大写宽字距的标签、导航、kicker）、`density: compact | airy`（学术密度 vs 杂志留白）、`photo: plain | grayscale-hover`。这三个值会被打在 `<html>` 上（`data-labels` / `data-density` / `data-photo`），核心的预设样式按它们切换——见 §3；你在 theme.css 里可以覆盖预设的任何一条。
- **options**：主题自定义选项的**声明**，用户在 site.yaml `theme.options` 里填值，构建期按声明校验，`pnpm gen:schema` 并入编辑器补全：

```json
"options": {
  "sidebar": { "type": "string", "enum": ["left", "right"], "default": "right", "description": "侧栏位置" },
  "showAffiliations": { "type": "boolean", "default": true }
}
```

部件里经 `themeOptions`（`src/core/theme/current.ts`）读取解析后的值。示例主题声明了一条 `showAffiliation`，它的页脚部件按此决定显不显示单位——声明、取值、读取三处对着看最清楚。

## 3. theme.css 与样式挂钩

theme.css 由构建注入到每一页，且**不在任何 cascade layer 里**——核心的基础样式与 Tailwind 工具类都在 layer 内，所以 theme.css 的普通选择器天然赢过它们，不需要提高特异性或 `!important`。

写主题 CSS 只用两种选择器，它们是契约的一部分，核心保证稳定（改名走 ADR）：

**(a) `data-part` 挂钩** —— 每个部件的根与关键子元素：

| 区域 | 挂钩 |
| --- | --- |
| 骨架 | `site` `main` `site-header` `brand` `nav` `nav-item` `nav-search` `lang-switch` `theme-toggle` `nav-drawer` `site-footer` `footer-name` `footer-affiliation` `footer-links` `footer-colophon` |
| 首页各节 | `section`（并带 `data-section="<节类型>"`）`section-label` `section-title` `section-more`；`bio-header` `bio-name` `bio-subtitle` `bio-tagline` `bio-text` `bio-photo` `bio-links`；`hero-name` `hero-photo`；`news-list` `news-item` |
| 列表页头 | `page-head` `page-kicker` `page-title` `page-lede` |
| 出版物 | `pub-year-group`（带 `data-year`）`pub-year` `pub-list` `pub-row`（带 `data-key`）`pub-thumb` `pub-title` `pub-meta` `pub-venue`；详情页 `pub-detail` `pub-back` `pub-head` `pub-abstract` |
| 文章 | 列表 `post-list` `post-filter` `post-updated` `post-row`（带 `data-urlname`）`post-meta` `post-category` `post-lang` `post-title` `post-description` `post-tags`；文章页 `post` `post-back` `post-head` `post-kicker` `post-lede` `post-cover` `post-body` `post-colophon` `post-series` `post-related` `post-toc` |
| 独立页面 | `page` `page-head` `page-title` `page-body` |

`<html>` 上另有 `data-theme-name`、`data-labels`、`data-density`、`data-photo`。

**(b) 预设类** —— 核心按腔调切换样式的地方都用语义类而不是工具类，你可以按类重定义：页面节奏 `page-top` `article-top` `page-head` `section-gap` `list-tools` `post-row-pad` `site-footer--stack` `site-footer__body` `article-toc`；标题 `page-title` `page-lede` `article-head` `article-title` `article-lede` `kicker`；标签语域 `ui-label` `ui-meta` `ui-caption` `ui-heading` `ui-heading-sm` `section-label`。

不要依赖的：Tailwind 工具类名（`mt-4`、`text-sm`…）——它们随实现变动，不是契约。

一个真实例子——示例主题 `gutter` 只用挂钩就把出版物页改成了"年份在左栏、细线分隔"的简历式排布：

```css
[data-part='pub-year-group'] { display: grid; grid-template-columns: 5.5rem 1fr; column-gap: 1.25rem; }
[data-part='pub-year-group'] > [data-part='pub-year'] { border: 0; padding: .95rem 0 0; font-size: 1rem; color: var(--muted-foreground); }
[data-part='pub-year-group'] [data-part='pub-row'] { padding: .95rem 0; border-top: 1px solid var(--border); }
```

完整文件见 `extensions/themes/gutter/theme.css`，头部注释列出了主题 CSS 允许用的两类选择器。

## 4. widgets/：主题自带的部件

`widgets/<name>.astro` 替换同名内置部件；查找链是 **站点散件（`extensions/widgets/`）> 启用主题的 `widgets/` > 内置**。文件名必须是下表的名字之一，否则构建报错并列出合法名字。

| 部件名 | 内置实现（props 契约） | 用在哪 |
| --- | --- | --- |
| `bio-header` `hero` `about` `news` `publication-list` `selected-publications` `recent-posts` `projects` `prose` | `src/core/components/home/<对应文件>.astro` | 首页各节（`content/home.yaml`） |
| `publication-row` | `src/core/components/PublicationRow.astro`：`{ publication, lang, href?, thumbnail?, cite?, as? }` | 出版物页每一条、首页 publication-list |
| `post-row` | `src/core/components/PostRow.astro`：`{ post, lang, href, variant: 'full' \| 'compact', minutes? }` | 文章列表页、首页 recent-posts |
| `site-header` | `src/core/components/Header.astro`：`{ lang, alternates }` | 每一页 |
| `site-footer` | `src/core/components/Footer.astro`：`{ lang }` | 每一页 |

部件里的数据一律经 `getProvider()` 取（文章、出版物、项目、CV，作者信息 `getProvider().getProfile()`）；`siteConfig` 只有结构与开关。从主题目录引用核心用相对路径（`../../../../src/core/...`），完整示例见 `extensions/themes/gutter/widgets/site-footer.astro`（读选项、经 provider 取资料、保留挂钩）。

## 5. 验收

```bash
pnpm theme:check <name>                 # 内置、或已装进 extensions/themes/ 的主题（含示例 gutter）
pnpm theme:check <name> path/to/theme   # 还没装进来的目录：先复制到 extensions/themes/<name> 再跑
```

脚本把仓库复制到 `.offprint/theme-check/<name>/`、装上主题、把 site.yaml 指向它，然后 `build:static`、`build:server`、`pnpm e2e`。最常见的翻车点是 **axe 的颜色对比度**（`muted-foreground` 与 `primary` 对 `background` 都要过 AA）和暗色模式漏配。

## 6. 分发形态

| 形态 | 现在 |
| --- | --- |
| 站点自有 | `extensions/themes/<name>/`（示例：`gutter`） |
| 向模板贡献 | PR 到 `src/core/themes/<name>/`，CI 自动跑 theme:check |
| npm 包 | 计划中：`offprint-theme-<name>`，解析链加入 node_modules 查找 |

## 7. 尚未实现

- `shiki`：代码高亮双主题自定义（现为全站统一）。
- 更多部件：文章页头、CV 各段尚未部件化；先用挂钩。

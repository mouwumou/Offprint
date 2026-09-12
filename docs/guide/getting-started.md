# 快速开始：从模板到上线

三条路，按需选一条。都不需要密钥：模板自带样例内容，生成出来就能构建。

## 路线 A：GitHub Pages，什么都不用装

1. 仓库页面点 **Use this template → Create a new repository**。比 fork 干净，不带模板的开发历史。付费版 GitHub 的私有仓库也能发布 Pages，不必公开。
2. 什么都不用配。推送到 `main` 后，`Deploy to GitHub Pages` 工作流会自动为仓库启用 Pages 并发布；生成仓库时 GitHub 会替你做第一次推送，所以通常等两三分钟即可。进度在仓库的 **Actions** 页。
3. 站点地址是 `https://<你>.github.io/<仓库名>/`。地址由工作流自动取得并作为 `SITE_URL`，子路径会被识别为部署前缀，站内链接、feed、sitemap、搜索结果全部自动带上。

第一次部署成功的标志：Actions 页里 `Deploy to GitHub Pages` 是绿色，打开站点看到示例人物 "Mara Ellison Voss" 的首页。

自定义域名：在 **Settings → Pages → Custom domain** 填域名并按提示配 DNS，之后工作流取得的地址就是你的域名，前缀自动消失，不需要改任何文件。只有想强行指定地址时才需要仓库变量 `SITE_URL`。

## 路线 B：Docker 自托管

同一份仓库，根目录两套 compose 文件：`compose.static.yaml` 是静态伺服加定时同步，`compose.server.yaml` 是 server 模式加秒级发布。

```bash
cp .env.example .env                                  # 填 SITE_URL；要同步 Notion 再填 NOTION_TOKEN、NOTION_DB
docker compose -f compose.static.yaml up -d --build   # 或 compose.server.yaml
```

步骤与两种模式的取舍见 [deployment.md](deployment.md)。镜像可以跑在任何有持久卷的容器平台上：VPS、Cloudflare Containers 等。

## 路线 C：本机

需要 Node 22 或更新，以及 pnpm。`corepack enable` 就有 pnpm，版本钉在 `package.json` 的 `packageManager` 里。

```bash
pnpm install
pnpm dev            # http://localhost:4321，改文件即热更新
pnpm build:static   # 产物在 dist/；node scripts/serve-dist.mjs dist 4331 可本地伺服
```

## 把它变成你的站

改三处，每处保存后 `pnpm dev` 里即时可见，推送后 Pages 自动重新部署。

1. **`content/profile.yaml`**：你是谁。姓名、职衔、机构、头像、简介、链接，只有姓名必填。改完这一个文件，首页、页脚、CV 页头和结构化数据都换成你的名字。
2. **`site.yaml`**：站点长什么样。开关模块、导航、主题、语言、评论、统计、跳转。每个键都有中文注释；配好编辑器还有自动补全和即时报错，见 [configuration.md](configuration.md)。
3. **`content/` 其余文件**：页面里显示什么。出版物 `publications.yaml`、项目 `projects.yaml`、CV `cv.yaml`、近况 `news.yaml`、独立页面 `pages/*.md`、首页排布 `home.yaml`。每个文件是什么见 [content/README.md](../../content/README.md)，字段规范见 [CONTENT-CONTRACT.md](../CONTENT-CONTRACT.md)。

博客有两种写法：直接把契约格式的 markdown 放进 `content/posts/`；或者接上 Notion，让"点发布即上线"。接 Notion 从 [notion-template.md](notion-template.md) 开始，同步的运行方式见 [sync.md](sync.md)。开了同步以后 `content/posts/` 归同步管线管，不要再手改。

所有内容文件构建时都经 schema 校验：拼错字段会得到指出位置的报错，而不是一个悄悄变坏的页面。

### 模板附带、实例用不到的东西

生成仓库时这些目录会一起复制过来，留着无害，删掉也不影响构建：

- `website/`：文档站的源码，模板仓库用它发布在线文档。
- `extensions/themes/gutter/`：示例主题，想做自己的主题时复制它起步，见 [THEMING.md](../THEMING.md)。
- `.github/screenshots/`：模板 README 用的截图。

## 下一步

- 想换观感 → [THEMING.md](../THEMING.md)：内置 scholar 与 paper 两套主题，token 可逐个覆盖；`extensions/themes/gutter` 是随模板分发的示例主题，复制它就能做自己的。
- 想接 Notion → [notion-template.md](notion-template.md) 与 [sync.md](sync.md)。
- 想自托管或要"发布秒级生效" → [deployment.md](deployment.md) 的 Docker 两节。
- 想加访问统计 → `site.yaml` 的 `analytics` 节，支持 Umami、Plausible、GoatCounter，见 [configuration.md](configuration.md)。

## 常见问题

**推送后站点 404。** 看 Actions 页：`Deploy to GitHub Pages` 没跑说明推送的不是 `main`；跑失败点进去看哪一步红。第一次部署偶尔要等 Pages 的 CDN 几分钟。

**站点在子路径下样式或链接坏了。** 说明构建时的 `SITE_URL` 和实际地址不一致。工作流自动取得的地址一般是对的；如果你手动设过仓库变量 `SITE_URL`，确认它和 Pages 页显示的地址完全一致，含子路径。

**内容改了但线上没变。** Pages 只在推送 `main` 后重新部署；Notion 里的改动要等同步工作流跑过并提交内容，见 [sync.md](sync.md)。

**Actions 页里 `Sync from Notion` 显示 skipped。** 正常：没有设置 `SYNC_ENABLED` 变量时它什么都不做。

## 之后：跟上模板的更新

实例仓库没有模板的 git 历史，升级靠一个脚本。在实例根目录执行：

```bash
bash scripts/upgrade-from-template.sh /path/to/Offprint   # 模板的 main 分支检出
pnpm install --frozen-lockfile && pnpm sync validate && pnpm build:static
```

它只覆盖**模板拥有的路径**：`src/`、`scripts/`、`docs/`、工作流、`package.json` 等，从不碰你的 `site.yaml`、`content/`、`extensions/`、README 与 CLAUDE.md。看一眼 `git status`，构建通过就提交推送；若仓库开了 Notion 同步，先 `git pull --rebase` 再推，同步工作流会自行提交内容。每个版本改了什么见仓库的 Releases 页。

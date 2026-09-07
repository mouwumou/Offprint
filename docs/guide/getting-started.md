# 快速开始：从模板到上线

三条路，按需选一条；都不需要密钥，模板自带样例内容，生成即可构建。

## 路线 A：GitHub Pages（最少步骤）

1. 仓库页面点 **Use this template → Create a new repository**（比 fork 干净，不带模板的开发历史）。
2. 什么都不用配：推送到 `main` 后，`Deploy to GitHub Pages` 工作流会自动启用 Pages 并发布。
3. 没有第三步。站点地址（`https://<你>.github.io/<仓库名>/`，或你在 Pages 设置里配的自定义域名）由工作流自动取得并作为 `SITE_URL`；子路径会被识别为部署前缀，所有链接、feed、搜索结果自动带上（ADR-023）。想覆盖就在 **Settings → Variables** 设 `SITE_URL`。

## 路线 B：Docker 自托管（含"点发布即生效"的 server 模式）

同一份仓库，`docker/` 下两套 compose：静态伺服 + 定时同步，或 server 模式 + 秒级发布。步骤见 [deployment.md](deployment.md) 的 Docker 两节；镜像可以跑在任何容器平台上（VPS、Cloudflare Containers 等）。

## 路线 C：本地开发

需要 Node 22+ 与 pnpm（`corepack enable` 即可，版本钉在 `package.json` 的 `packageManager`）。

```bash
pnpm install
pnpm dev            # http://localhost:4321，改文件即热更新
pnpm build:static   # 产物在 dist/，node scripts/serve-dist.mjs dist 4331 可本地伺服
```

## 把它变成你的站

改三处，每处保存后 `pnpm dev` 里即时可见：

1. **`site.yaml`** —— 个人资料（姓名、职衔、机构、头像、社交链接）、开关模块、导航、主题。所有键都有中文注释，配好编辑器还有自动补全（见 [configuration.md](configuration.md)）。
2. **`content/` 目录** —— 出版物（`publications.yaml`）、项目（`projects.yaml`）、CV（`cv.yaml`）、独立页面（`pages/*.md`）、首页排布（`home.yaml`）。每个文件是什么见 [content/README.md](../../content/README.md)，字段规范见 [CONTENT-CONTRACT.md](../CONTENT-CONTRACT.md)。
3. **博客** —— 两种写法：直接把契约格式的 markdown 放进 `content/posts/`（注意此目录归同步管线管，开同步后勿手改）；或接上 Notion 让"点发布即上线"，见 [sync.md](sync.md)。

改完 `git push`，Pages / Vercel 会自动重新部署。所有内容文件构建时经 schema 校验——拼错字段会得到指出位置的报错，而不是坏页面。

## 下一步

- 想换观感 → [THEMING.md](../THEMING.md)（内置 scholar / paper 两套主题，token 可逐个覆盖）
- 想接 Notion → [sync.md](sync.md)
- 想自托管或要"发布秒级生效" → [deployment.md](deployment.md) 的 Docker 两节

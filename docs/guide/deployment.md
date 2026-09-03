# 部署

先选运行模式，再选平台。

| | static（默认，基线） | server（可选） |
| --- | --- | --- |
| 产物 | 纯 HTML/CSS，`dist/` | Node 进程（Astro node adapter） |
| 发布时效 | 下一次同步 + 构建（几分钟） | 秒级（revalidate / webhook） |
| 运行成本 | 零：任何静态托管 | 一个常驻进程 + 内容卷 |
| 适合 | 绝大多数个人站 | 想要"点发布即生效"、或需要运行时功能 |

两种模式输出**相同的 HTML**（CI 逐页比对），内容目录与配置完全一样，随时可以切换。

## 密钥放哪里（ADR-017）

- GitHub Actions：只放在**你自己实例仓库**的 Settings → Secrets / Variables；
- 自托管：服务器本地 `.env`（`.env.example` 列全了所有变量，`.gitignore` 与 `.dockerignore` 都排除它）；
- 任何情况下都不进仓库、不进镜像。

## GitHub Pages（static，默认路径）

生成仓库后什么都不用配：推送 `main` 即触发 `Deploy to GitHub Pages`，工作流会自动为仓库启用 Pages 并发布。要设的只有一个仓库变量 `SITE_URL`（公网地址，供 canonical / sitemap / feed）。

> **子路径限制**：站内链接目前按域名根路径生成，`https://<你>.github.io/<仓库名>/` 这种子路径地址下链接会失效。两个解法：给 Pages 配自定义域名（Settings → Pages → Custom domain，再把 `SITE_URL` 设成它）；或把仓库命名为 `<你>.github.io`，它会发布在根路径。子路径支持在路线图上。

## Vercel（static）

- **一键按钮**（README 顶部）：Vercel 会基于模板生成你的仓库并自动识别 Astro，执行 `pnpm build`。
- **走 Actions**：仓库变量 `DEPLOY_VERCEL=true`，Secrets 里加 `VERCEL_TOKEN`、`VERCEL_ORG_ID`、`VERCEL_PROJECT_ID`；`Deploy to Vercel` 工作流用 `vercel pull / build / deploy --prebuilt` 三步部署。同步工作流提交内容后会自动触发它。

## Netlify（static）

README 顶部的按钮；Netlify 自动识别 Astro 并执行 `pnpm build`，产物目录 `dist`。

## Docker：静态自托管

`docker/compose.static.yaml`，两个服务：`web`（Caddy 伺服构建产物）与 `sync`（按 `SYNC_INTERVAL` 秒轮询：同步 → 构建 → 原子切换产物目录）。没有 Notion 凭据时退化为只构建仓库里已提交的内容。

```bash
cp .env.example .env          # 填 SITE_URL、NOTION_TOKEN、NOTION_DB
docker compose -f docker/compose.static.yaml up -d --build
```

## Docker：server 模式自托管

`docker/compose.server.yaml`，三部分：`site`（Node 进程，`RUNTIME_MODE=server`）、`sync`（按 `SYNC_CRON` 同步，完成后通知 `site` 的 `/api/revalidate`）、共享内容卷 `content`。

```bash
cp .env.example .env          # 另加 REVALIDATE_SECRET（随机长串），可选 NOTION_WEBHOOK_SECRET
docker compose -f docker/compose.server.yaml up -d --build
```

首次冷启动内容卷为空时，站点返回一个双语的"同步中"页（503），首次同步落地后自动恢复。之后把 Notion webhook 指向 `https://<你的域名>/api/sync` 即得秒级发布（握手流程见 [sync.md](sync.md)）。

建议把 `/api/*` 放在反向代理的额外防护之后，并用 `GET /api/health` 做存活探测——它报告当前内容版本、最近一次同步的结果与错误数。

本项目的 Docker 相关验证都在远程测试机上做过（compose 的 static 与 server 两套均实测冷启动到首篇发布）；本机没有 Docker 的开发者可以完全跳过这两节。

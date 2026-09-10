# 部署

先选运行模式，再选平台。

| | static（默认，基线） | server（可选） |
| --- | --- | --- |
| 产物 | 纯 HTML/CSS，`dist/` | Node 进程（Astro node adapter） |
| 发布时效 | 下一次同步 + 构建（几分钟） | 秒级（revalidate / webhook） |
| 运行成本 | 零：任何静态托管 | 一个常驻进程 + 内容卷 |
| 适合 | 绝大多数个人站 | 想要"点发布即生效"、或需要运行时功能 |

两种模式输出**相同的 HTML**（CI 逐页比对），内容目录与配置完全一样，随时可以切换。

## 密钥放哪里

- GitHub Actions：只放在**你自己实例仓库**的 Settings → Secrets / Variables；
- 自托管：仓库根目录的 `.env`（`.env.example` 列全了所有变量并注明谁在读它；`.gitignore` 与 `.dockerignore` 都排除它）；
- 任何情况下都不进仓库、不进镜像。

## GitHub Pages（static，默认路径）

生成仓库后什么都不用配：推送 `main` 即触发 `Deploy to GitHub Pages`，工作流会自动为仓库启用 Pages 并发布。站点地址由工作流从 Pages 设置取得（`https://<你>.github.io/<仓库名>/`，或你配的自定义域名）作为 `SITE_URL`；仓库变量 `SITE_URL` 只在想覆盖时才需要。

**子路径**：项目页默认地址是子路径部署。构建会从 `SITE_URL` 的路径派生 Astro `base`，站内链接、feed、sitemap、搜索结果全部自动带前缀。配了自定义域名后地址回到域名根，前缀自动消失。

## Docker：静态自托管

`compose.static.yaml`（在仓库根目录），两个服务：`web`（Caddy 伺服构建产物）与 `sync`（按 `SYNC_INTERVAL` 秒轮询：同步 → 构建 → 原子切换产物目录）。没有 Notion 凭据时退化为只构建仓库里已提交的内容。

```bash
cp .env.example .env          # 填 SITE_URL、NOTION_TOKEN、NOTION_DB
docker compose -f compose.static.yaml config | grep NOTION_DB   # 确认 .env 被读到（应显示你的库 id）
docker compose -f compose.static.yaml up -d --build
```

compose 文件放在根目录不是随意的：Compose 只从 compose 文件所在目录读 `.env`，文件在根目录，`.env` 也在根目录，`pnpm sync` 与 Docker 用的是同一份。

## Docker：server 模式自托管

`compose.server.yaml`（在仓库根目录），三部分：`site`（Node 进程，`RUNTIME_MODE=server`）、`sync`（按 `SYNC_CRON` 同步，完成后通知 `site` 的 `/api/revalidate`）、共享内容卷 `content`。

```bash
cp .env.example .env          # 另加 REVALIDATE_SECRET（`openssl rand -hex 32`），可选 NOTION_WEBHOOK_SECRET
docker compose -f compose.server.yaml config | grep REVALIDATE_SECRET   # 确认 .env 被读到
docker compose -f compose.server.yaml up -d --build
```

运行模式在构建期就固定进了产物（`pnpm build:server`），启动进程时不必再设 `RUNTIME_MODE`。首次冷启动内容卷为空时，站点返回一个双语的"同步中"页（503），首次同步落地后自动恢复。之后把 Notion webhook 指向 `https://<你的域名>/api/sync` 即得秒级发布（握手流程见 [sync.md](sync.md)）。

同一镜像可部署到任何有持久卷和常驻进程的容器平台（VPS、Cloudflare Containers、Fly.io 等；除 Docker 本地与远程测试机外未逐一实测）。**不支持 serverless 平台**：没有持久磁盘、函数有超时、多实例各自为政，server 模式的内容卷、同步子进程与进程内缓存都无从谈起。

建议把 `/api/*` 放在反向代理的额外防护之后，并用 `GET /api/health` 做存活探测——它报告当前内容版本、最近一次同步的结果与错误数。若 `SITE_URL` 带子路径，这些端点也在子路径下（`/<base>/api/…`），`REVALIDATE_URL` 与 Notion webhook 地址要相应带上。

本项目的 Docker 相关验证都在远程测试机上做过（compose 的 static 与 server 两套均实测冷启动到首篇发布）；本机没有 Docker 的开发者可以完全跳过这两节。

## 其他静态托管

`dist/` 是纯文件，任何静态托管都能放（Cloudflare Pages、Netlify、Vercel 等）：构建命令用 `pnpm build`（含搜索索引），产物目录 `dist`，把 `SITE_URL` 设成正式地址。本项目**不做平台专属配置**。

## 部署后验证

```bash
pnpm check:live https://你的站点地址/     # 与 SITE_URL 完全一致，含子路径
```

它从线上 sitemap 出发抓取每一页，检查页面引用的每个内部链接都在部署前缀之内且可达，并确认 robots.txt 与 feed 存在（开了站内搜索时还查搜索索引）。内容无关，任何实例都能跑；模板自己的 demo 就是这样验收的。


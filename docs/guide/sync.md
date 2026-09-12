# Notion 写作与同步

Offprint 不在运行时读 Notion。博客文章的路径是：

```
Notion 数据库 ──elog 导出──▶ 归一化校验 ──▶ content/posts/*.md + manifest.json ──▶ 站点构建 / 请求期读取
```

内容契约本身是**工具无关**的：任何能产出 [CONTENT-CONTRACT.md](../CONTENT-CONTRACT.md) 规定格式的 markdown 的工具都能当内容源，[elog](https://elog.1874.cool) 只是参考实现。你也可以完全不用 Notion，直接把契约格式的文件放进 `content/posts/`。

## 准备 Notion 侧

数据库的列定义、怎么新建、怎么沿用 NotionNext 的库，都在 [notion-template.md](notion-template.md)。做完那一页你会有三样东西：

1. integration 的 token，`secret_` 开头；
2. 数据库 id，URL 里的 32 位十六进制串；
3. 数据库已经分享给了这个 integration。

## 本地跑一次同步

```bash
cp .env.example .env         # 填 NOTION_TOKEN、NOTION_DB；.env 已在 .gitignore
pnpm sync                    # 导出 → 归一化 → 校验 → 写 manifest → 原子切换进 content/
pnpm sync validate           # 只校验 content/，不联网
pnpm dev                     # 看结果
```

同步的行为要点：

- **只写 `content/posts/`**。`pages/`、各 `*.yaml` 是你手写的，同步永远不碰；想让 Notion 里 `type = Page` 的文档也进 `content/pages/`，设 `SYNC_PAGES=true`。
- **逐篇校验、错误隔离**。一篇不合规的文章会被记录并跳过，其余照常发布；错误会打印，server 模式下也出现在 `/api/health`。
- **图片物化**。Notion 托管的图片是几小时就过期的签名 URL，默认（`IMAGE_PLATFORM=local`）会下载到 `content/assets/` 并改写链接；同一张图按稳定路径去重，重复同步不重复下载。下载有 30 秒超时与 25MB 上限，失败保留原链接、不阻塞同步。指向外站的封面若已失效会被剔除并告警，文章回落到自动生成的 OG 图。
- **原子切换**。新内容先在临时目录完成全部处理，最后一步整体切换，`manifest.json` 最后写入，读取方永远不会看到半成品。
- **同步日志值得看一眼**。语言自动判断、从标题派生的 slug、被跳过的行，都会以 warning 打出来；线上出现意外的 URL 或语言，答案一般在这里。

## 在 GitHub Actions 里自动同步（static 站）

实例仓库（不是模板）的 **Settings → Variables** 加 `SYNC_ENABLED=true`，**Secrets** 加 `NOTION_TOKEN`、`NOTION_DB`。之后 `Sync from Notion` 工作流每 30 分钟跑一次，也可在 Actions 页手动触发：拉取 → 同步 → 有变化则提交 `content/` → 触发 Pages 部署工作流。从点发布到线上，通常五分钟内。

没有这个变量时工作流显示 skipped，模板仓库自己就是这个状态。开了自动同步后，本机推送前先 `git pull --rebase`，因为工作流会自行提交内容。

## "点发布即上线"（server 模式）

static 站的时效是"下一次同步 + 构建"，通常几分钟。要做到秒级，用 server 模式自托管，见 [deployment.md](deployment.md) 的 Docker server 一节。有两条触发路径：

- **定时**：sync 容器按 `SYNC_INTERVAL` 秒同步，完成后调用站点的 `/api/revalidate`，站点只重新读取变化的条目。
- **Webhook**：Notion 的 webhook 打到站点的 `POST /api/sync`，站点自己拉起一次同步。首次订阅时 Notion 会发一个 `verification_token`，站点把它打印到日志，你把它填进 Notion 后台和 `NOTION_WEBHOOK_SECRET`；之后每个请求都做 HMAC 签名校验。没配 webhook secret 时，`/api/sync` 也接受 `x-revalidate-secret: <REVALIDATE_SECRET>` 头的手动触发。

`/api/sync` 有限流（6 次/分钟）、64KB 请求体上限与 15 分钟子进程超时；并发或重放的触发会被合并成一次。状态看 `GET /api/health`。

设计细节（接口、原子切换、缓存失效的粒度）见 [DYNAMIC-PUBLISHING.md](../DYNAMIC-PUBLISHING.md)。

## 排错

| 现象 | 看哪里 |
| --- | --- |
| `pnpm sync` 报 401 / not found | 数据库没分享给 integration，或 `NOTION_DB` 填错，见 [notion-template.md](notion-template.md) 的排错表 |
| 同步成功但一篇都没有 | 没有 `status = Published` 的行 |
| 文章语言、URL 不对 | 同步日志里的 warning；给该行填 `lang` 或 `slug` |
| Actions 里同步成功但线上没更新 | 内容无变化时不会触发部署；有变化时看 `Deploy to GitHub Pages` 是否跟着跑了 |
| server 模式 webhook 无反应 | `/api/health` 看最近一次同步；核对 `NOTION_WEBHOOK_SECRET` 与 Notion 后台一致，站点日志里有签名校验失败的记录 |

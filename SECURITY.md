# 安全策略

## 报告漏洞

**不要开公开 issue。** 请通过以下任一渠道私下报告：

- GitHub 仓库的 **Security → Report a vulnerability**（私有漏洞报告）；
- 邮件：mouwumou@gmail.com（标题注明 `[Offprint Security]`）。

我们会在 7 天内确认收到，并在修复发布前与你协调披露时间。这是个人维护的开源项目，没有漏洞赏金。

## 密钥模型（ADR-017）

本仓库是**公开模板，永不持有密钥**：CI 与 GitHub Pages demo 只用 `GITHUB_TOKEN`。你的站点是从模板生成的**实例仓库**，密钥只存在于两处：

- 实例仓库的 GitHub Secrets（`NOTION_TOKEN`、`VERCEL_TOKEN` 等，仅在开启对应功能时配置）；
- 自托管服务器本地的 `.env`（`.env.example` 列全了所有变量）。

`.gitignore` 与 `.dockerignore` 均排除 `.env*`（保留 `.env.example`）；请勿以任何形式把密钥写进仓库或镜像。

## server 模式的暴露面

静态构建（默认）没有任何运行时端点。server 模式暴露 `/api/sync`（触发同步）与 `/api/health`（状态），已内置的防护：

- `/api/sync` 写操作需要 `REVALIDATE_SECRET` 共享密钥头或 Notion webhook 签名（HMAC-SHA256），比较均为恒定时间；
- 限流（6 次/分钟）先于一切处理；请求体上限 64KB；同步子进程 15 分钟超时；
- 并发/重放触发被 single-flight 合并窗口吸收。

自托管时仍建议：把 `/api/sync` 放在反向代理的额外防护之后，不要复用弱密钥。

## 第三方扩展的信任模型

**安装主题就是安装代码。** `extensions/` 里的主题可携带 widget（Astro 组件），它们在构建期/渲染期执行，拥有与站点代码相同的权限——请像审阅一个 npm 依赖一样审阅第三方主题，再安装。

主题声明的设计 token 值会经 schema 校验（拒绝 `< > ; { }`，防止逃逸出 `<style>` 块），但这**不阻止** CSS 值里的远程引用：一个恶意主题仍可用 `url(https://…)` 让访客浏览器请求第三方地址（追踪向量）。防线是安装前审阅；对公开部署的实例，建议再配置 Content-Security-Policy 限制 `style-src`/`img-src`/`font-src` 的来源。

## 内容的信任边界

站点内容来自你自己的 Notion / 你提交的 markdown，属于作者自控输入；即便如此，JSON-LD 输出仍做了 `<`/`>` 转义，路径参数有 slug 白名单与目录遏制双层校验——防的是"内容源被盗号"这类二阶风险，而不是把内容当敌人。

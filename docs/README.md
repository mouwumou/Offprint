# 文档索引

## 使用文档（搭你自己的站，从这里开始）

| 文档 | 内容 |
| --- | --- |
| [guide/getting-started.md](guide/getting-started.md) | 从模板到上线：生成仓库、本地跑起来、替换成你的信息 |
| [guide/configuration.md](guide/configuration.md) | 配置体系：`site.yaml`（结构与开关）、`content/profile.yaml`（你是谁）与其余内容文件、编辑器补全 |
| [guide/sync.md](guide/sync.md) | Notion 写作、elog 同步：从建库到"点发布即上线" |
| [guide/deployment.md](guide/deployment.md) | 部署：GitHub Pages、Docker（static 与 server，任何容器平台）、其他静态托管 |
| [THEMING.md](THEMING.md) | 主题：换主题、调 token、从示例主题 `gutter` 起步制作与分发你自己的主题 |
| [../content/README.md](../content/README.md) | `content/` 目录里每个文件是什么、谁来写 |

## 设计文档（理解或改动系统时读）

| 文档 | 内容 |
| --- | --- |
| [DECISIONS.md](DECISIONS.md) | 架构决策记录（ADR-001–032）：每个"为什么这样做"的出处 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 分层、双运行模式、仓库结构、包边界 |
| [CONTENT-CONTRACT.md](CONTENT-CONTRACT.md) | 内容契约：所有集合的 front-matter / YAML schema，工具无关 |
| [DYNAMIC-PUBLISHING.md](DYNAMIC-PUBLISHING.md) | server 模式发布链设计：`ContentStore`/`ContentProvider`、原子切换、revalidate |

## 开发过程文档（只在 `dev` 分支）

`main` 是不含开发文档的发布快照；项目 0→1 的工作文件在 dev 分支的 `docs/dev/`：[PLANNING](https://github.com/mouwumou/Offprint/blob/dev/docs/dev/PLANNING.md)（原始规划与框架分析）、[ROADMAP](https://github.com/mouwumou/Offprint/blob/dev/docs/dev/ROADMAP.md)（阶段与任务清单）、[REFERENCES](https://github.com/mouwumou/Offprint/blob/dev/docs/dev/REFERENCES.md)（参考项目的借鉴与回避）、[DESIGN-REFERENCE](https://github.com/mouwumou/Offprint/blob/dev/docs/dev/DESIGN-REFERENCE.md）（设计 token 与原型来源）。给 Claude Code 的项目说明 [CLAUDE.md](https://github.com/mouwumou/Offprint/blob/dev/CLAUDE.md) 同样只在 dev。

贡献流程见根目录 [CONTRIBUTING.md](../.github/CONTRIBUTING.md)；安全策略见 [SECURITY.md](../.github/SECURITY.md)。

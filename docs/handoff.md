# Signalrank / new-term-radar 交接

更新时间：2026-10-29。相关站点/候选竞品功能的未提交代码已先快照并推送到 `wip/pre-handoff-2026-10-29`（提交 `b755c16`）。

## 项目概况

- 目标：尽早发现新产品/模型/需求词，结合需求、竞争、商业和趋势证据生成可行动的关键词机会。
- 目标用户：AI 工具站、内容站、Newsletter、SEO/GEO 运营和产品研究者。
- 仓库地址：https://github.com/Alvin18t/new-term-radar （公开 fork，默认分支 `main`；上游为 `zhuyansen/new-term-radar`）。
- 线上地址：https://signalrank-radar-alvin.berry-ai.chatgpt.site （owner-only Sites）；命令行/PyPI/MCP 入口沿用上游项目。
- 技术栈：Python 3.10+ 标准库 CLI、SQLite 状态、GitHub Actions、MCP；React 19 + Vite 6 的 Signalrank Web，Sites Worker 静态托管。

## 当前状态

- 已接入 X/AIsa、Hugging Face、GitHub、sitemap、新站、GSC、Trends、SERP、收入、Reddit 求助和新卖家等信号。
- DataForSEO 支持 `auto/direct/aisa` 路由；Ahrefs、Semrush、Similarweb 作为最终候选交叉证据，缺证据会降级为“观察”。
- Web 已完成 Signalrank 品牌、暖纸/铜色视觉、供应商状态、证据门、关键词卡片和 owner-only Sites v2。
- `main` 最近改动为托管环境保留安全供应商默认值并修正卡片动作/指标对齐（`f5a8632`）。
- 2026-10-29 复验：`python3 -m pytest -q tests` 为 114 通过、1 跳过；Web 构建和 Sites 路由测试 4/4 通过。

## 未完成任务

1. **P0：启动第一次真实自动监控。** 目前 Actions 变量为空、没有运行记录；剩余在仓库 Secrets 配置供应商凭证、设置 `RADAR_ENABLED=true` 并手动跑 `daily`。验收：工作流成功、artifact 含报告和 `state/radar.db`，下一轮可恢复状态且无密钥输出。
2. **P1：完成“相关站点/候选竞品”WIP。** 后端已保存最多 5 个非论坛/视频 SERP URL，前端已有数量、标签和链接；代码仅在 WIP 分支。剩余复核 diff、补齐构建结果、提交主线并发布 Sites。验收：测试不少于当前基线，真实关键词展示可点击 URL，工具页只标“候选竞品”，不作无证据断言。
3. **P1：验证付费数据源真实连通与成本。** 适配器和状态 UI 已完成，真实凭证/API 调用未验证。验收：`python3 -m radar providers --check` 成功；一次受预算限制的 `daily` 产出需求、竞争、商业证据并记录实际费用/失败降级。

## 已知问题

- 未设置 `RADAR_ENABLED=true` 时，`.github/workflows/radar.yml` 的 job 会直接跳过；这不是抓取代码故障。
- Sites 为私有 owner-only，未认证 HTTP 请求可能返回 401；历史上通过已认证页面验证 v2，不能据此声称公开可访问。
- GoAnyAPI 曾出现 20–55 秒延迟和间歇失败，AIsa 搜索也出现过超时；代码会重试/降级并在报告标缺失，不应把“表变薄”解释为没有机会。
- Google Trends 最后两天未结算，代码已丢弃这两天；Google Ads 搜索量约滞后两个月。
- 当前 shell 无 `python` 命令，应使用 `python3`；项目文档中的 `python` 需按机器环境替换。

## 关键决策

- 不能只凭热度给“优先”：需求规模、首页竞争、商业证据缺失时降级；供应商冲突需人工复核。
- DataForSEO 直连失败后不自动再发 AIsa，避免同一任务重复计费。
- 真实 SERP 结果称“相关站点”，只有工具型页面称“候选竞品”；放弃把搜索结果直接断言为竞品。
- 状态放 Actions cache/artifact，不提交运行数据库；密钥只读环境变量，不进前端、聊天或仓库。
- 私有 Sites 仅用于操作界面；核心 CLI/MCP 仍能在缺少付费源时降级运行。

## 运行与部署

```bash
cp config.example.json config.json
python3 -m radar providers --check
python3 -m radar daily --out report.md
python3 -m pytest -q tests
npm --prefix web install
npm --prefix web run build
npm --prefix web run test:sites
```

部署 Web 时使用 `web/dist` 中的 Sites 包。环境变量名：`AISA_API_KEY`、`AISA_API_BASE_URL`、`AISA_ROUTER_BASE_URL`、`DATAFORSEO_MODE`、`DATAFORSEO_LOGIN`、`DATAFORSEO_PASSWORD`、`DATAFORSEO_BASE_URL`、`GOANYAPI_API_KEY`、`TRUSTMRR_API_KEY`、`AHREFS_API_KEY`、`SEMRUSH_API_KEY`、`SIMILARWEB_API_KEY`、`SIMILARWEB_REQUEST_URL`、`SIMILARWEB_STATUS_URL`、`SIMILARWEB_VTABLE`、`GITHUB_TOKEN`、`GSC_TOKEN_JSON`、`RESEND_API_KEY`、`EMAIL_FROM`、`RADAR_EMAIL_TO`、`RADAR_CONFIG`、`RADAR_STATE`；Actions 变量：`RADAR_ENABLED`。

## 外部依赖

- GitHub Actions/Cache/Artifacts：定时任务和状态；配置在仓库 Settings → Secrets and variables → Actions。
- AIsa、DataForSEO、GoAnyAPI、Ahrefs、Semrush、Similarweb、TrustMRR：发现/关键词/竞争/商业证据；路由代码在 `radar/`，前端状态由 `web/scripts/sync-provider-status.mjs` 生成。
- Google Search Console：站点曝光信号；授权以 `GSC_TOKEN_JSON` 注入。
- OpenAI Sites：私有 Web 发布；托管适配在 `web/scripts/prepare-sites-build.mjs` 和 `web/tests/sites-worker.test.mjs`。
- Resend：可选邮件报告；未配置不影响文件报告。

## 下一步

先在 GitHub 设置 `RADAR_ENABLED=true` 和最小必要 Secrets，然后手动运行 `New-term radar` 的 `daily`；下载 artifact，确认报告、数据库恢复和费用边界。之后检出 `wip/pre-handoff-2026-10-29`，从 `radar/competition.py` 与 `web/src/App.jsx` 开始审查相关站点功能，单独开 PR，不要把 WIP 直接快进到 `main`。

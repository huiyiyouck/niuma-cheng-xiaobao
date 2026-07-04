# 2026-07-01 AI news-l1 跨项目联调入口与契约对齐

- 模式：非迭代跨项目联调任务
- 角色：Developer
- coordination 依据：`/root/Project/niuma-cheng-coordination`，同步后 HEAD `8eecdde`；读取 `STATUS.md`、`REQUESTS.md`、`communications/REQ-001-news-l1.md`、`contracts/news-l1.md`
- 关联需求：coordination `REQ-001`
- 状态：已完成并部署测试环境；news-l1 主链路与 ai→xiaobao KB 命中用例已真实联调通过，可供 Owner 在 `/debug/ai` 页面验收

## 背景

ai 侧 v0.1 已完成 `POST /v1/runs/news-l1` 真实化并自测通过，向 xiaobao 提出联调诉求：需要一个可重复触发的入口，从 xiaobao 库内选择已有新闻，按真实业务同一套方式构造 `L1Input` 调 ai，并在页面展示返回结果。

Owner 追加要求：该入口需要前端调试页面用于验收；同时 ai 侧提出的库内新闻搜索能力也要完成，并把联调契约定清楚。

## 已完成

### coordination 契约

- 补齐 `contracts/news-l1.md`：
  - 明确 `raw_content.url` / `raw_content.canonical_url` 是 ai link read 的 URL 来源
  - 明确 `kb_results` 结构
  - 明确 `tool_summary` 只统计 ai 主动工具调用，预取上下文不计数
  - 增加 request / response JSON 示例
- 新增 `contracts/kb-search.md` v1：
  - `POST /v1/kb-search`
  - 请求：`query`、`top_n`（默认 5 / 最大 10）、`exclude_raw_item_id`、`source_id`、`domain_tags`
  - 响应：`results[]` 含 `news_id`、`raw_item_id`、`title`、`summary`、`content`、`published_at`、`score_total`、`importance_score`、`source`、`url`
- 更新 coordination `STATUS.md`、`CHANGELOG.md`、`communications/REQ-001-news-l1.md`

### xiaobao 后端

- 新增 AI Hub HTTP 客户端：
  - `AI_HUB_BASE_URL`
  - `AI_HUB_API_TOKEN`
  - `AI_HUB_TIMEOUT_MS`
- `L1_ENGINE=ai` 时 worker 可复用 AI Hub 调用路径。
- 抽出 raw_item → `L1Input` 构造函数，供 worker 和联调入口共用。
- 构造 `L1Input` 时，如 `raw_items.source_item_url` 存在而 `raw_content.url` / `canonical_url` 不存在，补入 `raw_content.url`。
- 新增联调 API：
  - `GET /v1/ai-debug/candidates`
  - `POST /v1/ai-debug/news-l1-runs`
- 新增 ai→xiaobao 实时库内检索 API：
  - `POST /v1/kb-search`

### xiaobao 前端

- 新增 `/debug/ai` 页面与侧栏「联调」入口。
- 页面支持：
  - 搜索 / 选择库内已入库新闻
  - 配置 `max_tool_calls` / `timeout_ms`
  - 发送到 ai `news-l1`
  - 点击发送后立即展示本次触发请求与“处理中”响应提示
  - AI 返回后展示实际 `L1Input`、完整 `RunResponse`、状态、耗时、工具调用统计、标题/摘要/四维评分/标签

### 测试环境联调收尾

- ai 服务已在测试环境 `http://127.0.0.1:8100` 运行，`/health` 200。
- xiaobao 测试环境已配置 `AI_HUB_BASE_URL=http://127.0.0.1:8100`。
- 修复测试站点 nginx `/v1/` 反代默认超时导致的 `504 Gateway Time-out`：
  - `proxy_connect_timeout 10s`
  - `proxy_send_timeout 240s`
  - `proxy_read_timeout 240s`
  - `nginx -t` 通过并已 reload
- 前端联调页体验优化：请求/响应区前置，发送后立即显示触发请求，避免等待 60-100s 时页面看起来无反馈。

## 验证

- `cd server && npm run build`：通过
- `cd frontend && npm run build`：通过
- `cd server && npm test -- src/__tests__/x-direct-display.test.ts`：2 passed
- 测试环境部署：
  - 后端源码已同步到 `/srv/niuma-news/test/server/src/`
  - 前端 `dist/` 已同步到 `/var/www/test.huiyiyou.cloud/`
  - `systemctl restart news-api-test` 后服务 `active`
  - `GET http://127.0.0.1:8001/health`：200
  - `GET http://127.0.0.1:8001/v1/ai-debug/candidates?page_size=1`：200
  - `POST http://127.0.0.1:8001/v1/kb-search`：200
  - 前端部署目录 `index.html` 已引用新 bundle `index-_mFmSKB1.js`
  - 公网 `GET https://test.huiyiyou.cloud/debug/ai`：200
  - 公网 `GET https://test.huiyiyou.cloud/v1/ai-debug/candidates?page_size=1`：200
  - 公网 `POST https://test.huiyiyou.cloud/v1/ai-debug/news-l1-runs`：200，耗时约 79s，返回 `status=succeeded`、`run_id=run_7e626cf5f391`
- 真实联调证据：
  - xiaobao→ai：`run_2a4dbc15f308` succeeded，`elapsed_ms=73601`，预填 `search_summary` 场景 `tool_summary` 全 0，符合预取上下文不计主动工具调用口径。
  - ai→xiaobao KB 命中用例：`run_2e0072cba2a3` succeeded，`tool_summary.kb_search=1`，无 `degraded:kb_search_failed`。
  - ai→xiaobao KB 空结果用例：xiaobao 返回 200 + `results: []`，ai 当前会标 `degraded:kb_search_failed`；coordination 已记录为 ai 侧语义优化项。

## 后续

- Owner 打开 `https://test.huiyiyou.cloud/debug/ai`，选择新闻执行验收抽样。
- ai 侧优化 KB 空结果语义：`POST /v1/kb-search` 返回 200 + `results: []` 时不应标为 `kb_search_failed`，建议改为 `kb_search_empty` 或不降级。
- 后续若进入生产启用 AI 处理，需另走 DevOps 发布：生产 `AI_HUB_BASE_URL`、鉴权策略、nginx 长超时、`ENABLE_AI_PROCESSING` / `L1_ENGINE=ai` 开关均需显式确认。

## 2026-07-04 补充：Owner 验收通过 + coordination 留痕

- **Owner 验收结论**：Owner 已在 `/debug/ai` 抽样验收，确认联调 OK，可作为 ai v0.1 关闭依据。
- **coordination 留痕**：已在 coordination 仓 `communications/REQ-001-news-l1.md` 补充 2026-07-04 联调完成章节，补齐 4 条成功用例数据、run_id、耗时范围、产出验证结论；`STATUS.md` / `REQUESTS.md` 同步推进状态至「验收中 / 待关闭」。
- **coordination commit**：`f2702f3`，已 push。
- **遗留项**：KB 空结果语义 ai 侧待优化（非阻塞，可入 v0.2 或独立任务）。

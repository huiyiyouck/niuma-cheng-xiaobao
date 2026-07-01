# 2026-07-01 AI news-l1 跨项目联调入口与契约对齐

- 模式：非迭代跨项目联调任务
- 角色：Developer
- coordination 依据：`/root/Project/niuma-cheng-coordination`，同步后 HEAD `8eecdde`；读取 `STATUS.md`、`REQUESTS.md`、`communications/REQ-001-news-l1.md`、`contracts/news-l1.md`
- 关联需求：coordination `REQ-001`
- 状态：已完成 xiaobao 侧实现，待 ai 服务运行地址配置后真实端到端验收

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
  - 展示请求 JSON、响应 JSON、状态、耗时、工具调用统计、标题/摘要/四维评分/标签

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
  - 前端部署目录 `index.html` 已引用新 bundle `index-CdgZSNqE.js`
- 未完成验证：`http://127.0.0.1:8100/health` 当前不可达，真实 `news-l1` 发送需等待 ai 服务运行地址。

## 后续

- ai 提供/启动测试环境服务地址；配置 xiaobao 后端 `AI_HUB_BASE_URL` 指向该服务地址。
- 打开前端 `/debug/ai`，选择新闻执行真实端到端验收。
- ai 侧按 `contracts/kb-search.md` v1 接入 `POST /v1/kb-search`，验证 `tool_summary.kb_search` 主动调用计数。

# Bugfix：X Stream fetch failed 误告警

- 日期：2026-06-08
- 模式：Bugfix / 线上问题
- 角色：Developer（开发工程师）
- 状态：已完成

## 触发

生产日志出现 X Stream 全局告警：

```json
{
  "level": "warn",
  "message": "ALERT [x_stream_disconnected] scope=x_stream source=null msg=X Stream 连续断开 7 次: fetch failed",
  "timestamp": "2026-06-08T03:02:17.587Z"
}
```

## 根因

`XStreamManager` 此前只把 `reader.read()` 抛出的 `"terminated"` 识别为服务器/代理层长连接轮转，不计入 `consecutiveDisconnects`。

但实际生产中，`fetch()` 建连阶段或代理 socket 层也会抛 `"fetch failed"`，该错误仍进入 `connectLoop()` 的通用异常分支，连续 3 次后创建 `x_stream_disconnected` 告警。

对 X Filtered Stream 这类长连接来说，`fetch failed`、`ECONNRESET`、`ETIMEDOUT`、`EPIPE`、`UND_ERR_SOCKET` 等属于瞬时网络/代理断流，应快速重连，不应按业务异常告警。

## 修复

文件：`server/src/worker/x-stream-manager.ts`

- 新增 `collectErrorMessages()`：递归收集 `err.message` / `err.code` / `err.cause`。
- 新增 `isTransientStreamDisconnect()`：识别 `terminated`、`fetch failed`、socket reset、timeout、undici socket/connect/header/body timeout 等瞬时断流。
- `connectStream()` 读流阶段遇到瞬时断流时直接返回，让外层快速重连。
- `connectLoop()` 建连阶段遇到瞬时断流时：
  - `consecutiveDisconnects = 0`
  - `reconnectDelay = 1000`
  - 仅写 warn 日志
  - 不创建 `x_stream_disconnected` 告警

保留原有业务异常告警路径：HTTP 401/403、HTTP 429、非瞬时连接失败仍会计入连续断开并按阈值告警。

## 验证

- `cd server && npm run build`：通过，`tsc` 0 错误。

未执行 `npm test` 作为有效验证：当前项目因 2026-06-08 生产库误删事故已在 `vitest.config.ts` 中禁用集成测试，恢复测试前必须先建立独立 test DB。

## 后续建议

- DevOps 部署后观察生产日志，期望 `fetch failed` 只出现 `X STREAM transient network failure, reconnecting without alert`，不再生成 `x_stream_disconnected` 告警。
- 若之后出现 HTTP 401/403 或 429 告警，应按 Token/限流问题处理，不属于本次误告警路径。

## 追加诊断：断流期间是否会漏收

结论：会。

证据：

- `logs/worker-2026-06-08.log` 显示 2026-06-08 `01:51:54Z` 后 X Stream 多次断开；`03:01:02Z` 到至少 `03:14:40Z` 持续 `fetch failed`，期间没有 `X STREAM connected`。
- 同一时段 `X RULE SYNC initial failed: fetch failed`，说明到 X API/代理链路实际不可达，不只是告警误报。
- `server/src/worker/scheduler.ts` 此前 SQL 中有 `AND s.type != 'x_twitter'`，导致 X Source 的 timeline 补偿抓取没有被调度。
- 设计文档 `v0.5-design.md §4.1/4.3` 明确写了 X 应有 timeline API 补偿抓取，实际实现与设计不一致。

影响：

- X Filtered Stream 是实时长连接，断流期间不会自动 replay 已错过的推文。
- 由于补偿抓取被排除，断流窗口内发出的推文可能不会进入 `raw_items`，从而不会生成新闻卡片。

追加修复：

- `server/src/worker/scheduler.ts` 移除 `s.type != 'x_twitter'` 排除条件。
- `policyEverySeconds()` 对 `x_twitter` 优先使用 `compensation_interval_sec`，默认 86400 秒（24h），RSS 仍使用 `fetch_interval_sec` / `DEFAULT_FETCH_EVERY_SECONDS`。
- 这样 X Source 只要存在启用的 `display_positions`，就会周期性创建 fetch task，通过 user timeline API 补抓断流期间漏掉的推文，并依赖 `(source_id, source_item_id)` 去重。

验证：

- `cd server && npm run build`：通过，`tsc` 0 错误。

限制：

- 这只能修复后续漏收和未来补偿；已经超过 X recent search/user timeline 可返回窗口或 API 不可返回的历史内容，无法保证完全补回。
- 如果某个 X Source 没有启用展示位置，Scheduler 仍不会调度补偿抓取；即使 Stream 入库，处理后的新闻也可能没有展示位置。

## 临时部署记录

- 时间：2026-06-08 11:22 CST
- 执行角色：Developer（Owner 明确授予本次 Bugfix 临时部署权限）
- 部署 commits：
  - `871f1d6` — 修复 X Stream `fetch failed` 误告警
  - `05e330e` — 接回 X Stream 断流补偿抓取

### 部署过程

1. `cd server && npm install --no-audit --no-fund`：通过，`up to date`。
2. 部署前检查发现 `news-api.service` 处于 `failed`，但 `/health` 可用。
3. 端口归属核查：`0.0.0.0:8000` 被残留手工进程占用：
   - PID `622361`
   - 命令：`node --import tsx -e process.env.PORT = '8000'; import('./src/index.ts')...`
4. systemd 失败根因：`EADDRINUSE: address already in use 0.0.0.0:8000`。
5. 处理：
   - `kill -TERM 622361`
   - 确认 8000 端口释放
   - `systemctl reset-failed news-api.service`
   - `systemctl restart news-api.service`

### 部署验证

- `systemctl is-active news-api.service`：`active`
- `systemctl status news-api.service`：`active (running)`，`ExecStartPre=/usr/bin/npx drizzle-kit migrate` 成功
- systemd MainPID：`629597`
- 8000 端口实际 Node 子进程：`629636`
- `curl -sf http://127.0.0.1:8000/health`：`{"status":"ok"}`
- `curl -sf https://news.huiyiyou.cloud/v1/alerts/unread-count`：200，返回 `{"count":86}`
- 日志：
  - `X RULE SYNC done: +0 ~4 -0 ↻0 (remote=4 local=4)`
  - `X STREAM connected`

### 部署后发现

只读查询 X Source 状态：

| identity | lifecycle_status | compensation_interval_sec | enabled_positions |
|----------|------------------|---------------------------|-------------------|
| anthropicai | normal | 86400 | 0 |
| jiamigou | normal | 86400 | 0 |
| openai | normal | 86400 | 0 |
| solanamobile | normal | 86400 | 0 |

结论：

- 后端 Bugfix 已上线，X Stream 已恢复连接。
- 4 个 X Source 目前都没有启用展示位置，因此补偿抓取不会调度，处理后的新闻也不会出现在任何空间/频道列表里。
- 如果 Owner 期望这些账号内容在前端可见，需要先把对应 X Source 添加到空间/频道展示位置。
- 公网 `https://news.huiyiyou.cloud/v1/health` 返回 404；当前有效后端健康检查路径是本机 `/health`，公网关键 API `/v1/alerts/unread-count` 已验证可用。nginx 是否需要额外代理 `/health` 可后续由 DevOps 评估。

## 生产空间初始化

- 时间：2026-06-08
- 触发：Owner 要求“根据原型图把空间创建好”
- 执行角色：Developer（生产数据初始化，延续本次 Bugfix 恢复链路）

### 创建内容

空间：

| 空间 | 描述 | 图标 | 排序 |
|------|------|------|------|
| AI | AI 领域新闻追踪 | 🤖 | 10 |
| 财经 | 财经市场动态追踪 | 📈 | 20 |

频道：

| 空间 | 频道 |
|------|------|
| AI | 模型动态 / 行业资讯 / 开源项目 / 学术前沿 |
| 财经 | 宏观政策 / 市场动态 / 行业资讯 / 公司资讯 |

展示位置：

| Source | 位置 |
|--------|------|
| OpenAI官方账号 (`openai`) | AI / 模型动态 |
| Claude code官方账号 (`anthropicai`) | AI / 模型动态 |
| 加密狗 (`jiamigou`) | 财经 / 市场动态 |
| Solanamobile官方账号 (`solanamobile`) | 财经 / 公司资讯 |

### 验证

- `GET /v1/spaces`：公网返回 AI、财经两个空间；各 `channel_count=4`、`source_count=2`。
- X 补偿调度立即触发：
  - `openai`：`last_fetch_count=20`
  - `anthropicai`：`last_fetch_count=20`
  - `solanamobile`：`last_fetch_count=19`
  - `jiamigou`：`last_fetch_count=15`
- 新闻生成与分发：
  - AI / 模型动态：40 条
  - 财经 / 公司资讯：19 条
  - 财经 / 市场动态：15 条
- `process` 队列：0 条排队。
- 公网新闻接口：
  - `GET /v1/news?space_id=<AI>&limit=5`：返回 AI 新闻。
  - `GET /v1/news?space_id=<财经>&limit=5`：返回财经新闻。

### 注意

当前 `display_positions` 数据库唯一索引是 `(source_id, channel_space_id) WHERE deleted_at IS NULL`，同一 Source 在同一空间内只能有一个活跃展示位置。这与 v0.5 PRD 中“同一 Source 可同时投放到空间根节点和多个频道”的目标仍不一致。此次按每个 Source 每个空间一个频道执行，未强行绕过数据库约束。

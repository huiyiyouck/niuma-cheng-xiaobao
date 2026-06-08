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

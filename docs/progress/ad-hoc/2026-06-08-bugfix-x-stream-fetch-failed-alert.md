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

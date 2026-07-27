# 非迭代 Bugfix：x-stream 入库适配 v0.6.1（v0.6.1 关闭遗留 #2 批）

- 日期：2026-07-27
- 模式：非迭代 Bugfix（v0.6.1 迭代关闭遗留清单 #2，Owner 指令开工；#3/#4/#6 同批顺手）
- 角色：Developer
- 代码：commit `744d20a`

## 背景

v0.6.1 迭代关闭检查登记 7 项遗留，其中 #2 为高·潜伏：`x-stream-manager` 入库路径停留在 v0.6 之前形态——不写 `process_type`（落库走默认 `'ai'`）且固定建 `process` task，绕开 v0.6.1 分流链路，导致 X Stream 恢复推送后 ai 类 `l1_status` 停在 `not_started`、前端显示假「待解析」永不解析。触发时机为 X Stream 恢复前必修。

## 修复内容

| # | 严重度 | 修复 |
|---|--------|------|
| #2 | 高·潜伏 | `x-stream-manager.ts` 入库对齐 dispatcher 参照实现：INSERT 写 `process_type`（`determineProcessType("x_twitter")`），task type 走 `taskTypeForNewRawItem()` 分流（AI 开启→`l0_classify`，关闭→`process`），并写 `max_attempts` |
| #3 | 中 | `l0-classifier.ts` L0 通过后的「占位 processed_news + 置 `l1_status=queued` + 建 L1 task」三步包显式事务（BEGIN/COMMIT/ROLLBACK）——原先置 queued 后建 task 前若崩溃，该条永远 queued 无 task 不被处理（黑洞窗口） |
| #4 | 中 | 占位行 `published_at` 写 `raw_items` 真值（原硬编码 NULL，列表按时间排序 NULLS LAST 沉底）；`language` 按契约 `news-l1-db` C-7 固定 `'zh'`（该列语义为产出内容语种），移除 l0-classifier 内因此孤儿化的 `detectLanguage`（processor.ts 副本不受影响） |
| #6 | 低 | `max_attempts` 单一真源：新增 `dispatcher.maxAttemptsForTaskType()`（`l1_ai_process` 尊重 `AI_MAX_RETRIES` 配置，其余走 BACKOFF_CONFIG），dispatcher/l0-classifier/x-stream 建 task 统一经此取值；`requeueTask` 终态判定改以 `tasks.max_attempts` 行内值为准，BACKOFF_CONFIG 仅缺省兜底 |

## 验证

- `server` tsc 0 错误；全量单测 **65/65**（SSH 隧道 → 服务器 `news_vitest` 隔离库）
- 测试环境已部署（`deploy.sh test`，`news-api-test` active / health 200），服务单次启动稳定运行（验证 l0-classifier↔dispatcher 循环引用运行时无问题）
- X Stream 端到端验证受限：当前 Stream 未在推送，真实推文入库路径待 X Stream 恢复后观察首条日志 `X STREAM tweet ingested ... type=l0_classify|process`

## 遗留

- 生产部署随下次 DevOps 部署（无迁移、无配置变更）
- 存量数据无需订正（X Stream 断流期间无新入库；历史 X 数据已由 0007 迁移回填为直显）

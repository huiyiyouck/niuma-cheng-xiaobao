# 全栈开发工作日志 — Current

> 最近 5 条工作日志。其余条目按时间倒序归档到 `developer-archive.md`。
> 长期摘要、当前关注点、常见风险见 `developer-summary.md`。
> 分层时间：2026-07-29（v0.6.1 关闭后收尾时按 `context-policy.md` 分层归档；上次 2026-06-09）

---

## 2026-08-01 — 数据库超时四项落码（超时方案待办 #3，非迭代任务）

- 本次角色：全栈开发（Developer）；模式：非迭代任务（[超时方案](../ad-hoc/2026-07-30-spike-db-timeout-config.md) §6 待办 #3，前置已由 §8.4 全清，Owner 指令开工）
- 已落码（三处，按方案 §3.1 取值 / §3.3 方式原样实现）：
  - `config.ts`：数据库段新增 `dbStatementTimeoutMs` 30s / `dbIdleTxTimeoutMs` 60s / `dbLockTimeoutMs` 5s / `dbConnectTimeoutMs` 10s（四项 env，沿用 `getInt` 风格）
  - `pool.ts`：`connectionTimeoutMillis` + `options` 连接参数随建连下发三项会话级超时
  - `.env.example`：同步四项（默认即推荐值）
- 验证：tsc 0 错误；全量单测 65/65（隧道 → `news_vitest`，全部用例经新 pool 配置连真实 PG）；经 pool 实查生效值 `30s/1min/5s` 三项全对；行为验证 `pg_sleep(2)` 在 1s 超时下正确报 `canceling statement due to statement timeout`。验证结果已回写方案 §9
- 部署侧验证（方案 §5：test/prod 环境 + `ai_worker` 角色核对 + 24h 告警观察）仍归 DevOps 随下次部署（待办 #5）
- 插曲：会话开始时工作区有 architect-corrections.md 未提交变更（+10 行），本会话未动它，提交前该变更已从工作区消失（HEAD 未动）——疑似并行 Architect 会话操作，已报 Owner 知悉
- 下一步：DevOps 下次部署带上本次改动并按 §5 验证；待 ai 侧回帖 `ALTER ROLE` 实际写入值后核对
- **追记（同日）**：ai 侧已回帖（`ALTER ROLE` 执行完毕）；我直读 `pg_roles.rolconfig` 实测三项 `4s/3s/60s` 与契约 v1.8 逐项一致，已回帖 coordination 闭合待跟进 14、标 15 完成（coordination `1866c5c`）。超时专题两侧收口，剩端到端联调（待跟进 7）

---

## 2026-07-27 — 清 v0.6.1 关闭遗留 #2 批（x-stream 适配 + #3/#4/#6，非迭代 Bugfix）

- 本次角色：全栈开发（Developer）；模式：非迭代 Bugfix（v0.6.1 关闭遗留清单，Owner 指令开工）
- 已修复（commit `744d20a`，详见 [ad-hoc 记录](../ad-hoc/2026-07-27-bugfix-xstream-v061-adapt.md)）：
  - #2（高·潜伏）：x-stream-manager 入库对齐 v0.6.1——写 `process_type` + `taskTypeForNewRawItem()` 分流建 task + `max_attempts`（原固定建 `process`，X Stream 恢复后 ai 类将假「待解析」）
  - #3（中）：l0-classifier 占位 + 置 queued + 建 task 包显式事务，消除 queued 无 task 黑洞窗口
  - #4（中）：占位行 `published_at` 写真值（原 NULL 沉底）；`language` 按契约 C-7 固定 'zh'，移除孤儿 `detectLanguage`
  - #6（低）：新增 `maxAttemptsForTaskType()` 单一真源（`l1_ai_process` 尊重 `AI_MAX_RETRIES`），`requeueTask` 以 `tasks.max_attempts` 行内值判终态
- 验证：tsc 0 错误；全量单测 65/65（隧道 → `news_vitest`）；测试环境部署后服务单次启动稳定（l0-classifier↔dispatcher 循环引用运行时无问题）
- 端到端受限项：X Stream 当前未推送，恢复后观察首条 `X STREAM tweet ingested ... type=` 日志确认分流生效
- summary 遗留清单 #2/#3/#4/#6 已标 ✅；INDEX 近期待办与非迭代工作表已更新
- 下一步：生产随下次 DevOps 部署带上 `744d20a`；Owner 可启动下一迭代规划

---

## 2026-07-27 — 处理 DevOps 登记的 R4 代码遗留 3 项（跨任务待办）

- 本次角色：全栈开发（Developer）；模式：非迭代小改（DevOps 生产部署后登记 INDEX 跨任务待办，Owner 指派开发修）
- 已修复（commit `a3e8e53` + 单测 `6d5c0ed`）：
  - #A-R4-3（P1）：`NewsPage.tsx` `originalUrl` 只放行 `/^https?:\/\//i`——`source_item_url` 是抓取的第三方数据，防 `javascript:` 协议点击型 XSS
  - #A-R4-2（P2）：抽公共 `isAdminAuthenticated()` 入 `admin-guard.ts`（token +（可选 REQUIRE_BOTH）IP 白名单），`adminGuard` 与 `news.ts` 共用，消除鉴权语义两处独立实现；补纯函数单测 4/4（既有测试 app 不挂 guard，重构原本零覆盖）
  - #A-R4-5（P2）：监控 AI Tab 去掉 `ai_* ?? 全量` 兜底，字段缺失显「—」
- 验证：server tsc 0 错误；全量单测 65/65（61+4，SSH 隧道 15432 → 服务器 `news_vitest` 隔离库）；frontend build 通过；测试环境已部署（`deploy.sh test`，bundle `index-NDtxdLR7.js`），公网冒烟通过
- 插曲：冒烟时验证门禁误在测试库创建了空间 `x` / `guard-test`（测试站 nginx 会注入 admin token、测试后端未配 token 走 IP 白名单，均为既有设计非回归），已当场删除，空间恢复为 AI/财经
- INDEX 跨任务待办三行已标 ✅；生产环境代码随下次 DevOps 部署上线
- 下一步：PM 重跑 v0.6.1 迭代关闭检查（三项遗留已清，无 Developer 阻塞）

---

## 2026-07-26 — v0.6.1 实现 R4：三方 R3 Review 同批修复

- 本次角色：全栈开发（Developer）；模式：标准迭代 v0.6.1 实现阶段 R4（修复轮）
- 背景：R3 三方 Review 收齐（DevOps ✅ / Architect ⚠️1高4中4低 / PM ⚠️1低+裁定4项），PM 给出同批修复清单 6 项
- 已修复（commit `5ab883f`，base `0c733c5`）：
  - #A-R3-1（高）：`l1_error` 原文仅对带有效 x-admin-token 的请求返回；公开接口经 `publicL1Error()` 归一化为分类文案。**TDD 红灯抓到真 bug**：`ETIMEDOUT` 小写不含 `timeout` 子串，分类漏判，补 `etimedout` 关键字后 6/6 绿
  - #A-R3-2：`retryable_failed` 归入「解析中」（PM 方案①），`failed_retry` 状态删除
  - #A-R3-3：`level-status.ts` 新增 `ai_completed`/`ai_retryable_failed`/`ai_final_failed`（AI 口径），原全量字段保留兼容；监控 Tab 改用 ai_* 并做 `??` 兜底兼容旧后端
  - #A-R3-5：详情接口补 `raw_items.content` 原文提取（`rawContentText()` 覆盖 x/rss/jin10 字段优先级）+ `source_item_url`；抽屉正文与 summary 相同时去重
  - #A-R3-6/7：删 `pending` 幽灵分支；`displayState` 白名单兜底（未知状态→待解析；`l1Status`+`processType` 均为 null 的旧数据保持富展示）
  - #A-R3-8：注释按 PM 裁定修正（直显类保留来源标识标签）
- **#PM-R3-1 经核实不成立**：api.ts 类型注释本为 AD-05 四维，不存在指控的 `importance/relevance/credibility` key；按意见意图改为显式 `ScoreDimensions` 接口（Review 意见先核实再实现，不盲改）
- 自测证据：server tsc 0 错误；新增单测 `news-public-error.test.ts` 6/6（本地可跑，纯函数不依赖 DB）；frontend build 通过；本地 dev 模拟自测 retryable→解析中、final_failed 失败态、未知状态兜底；真实数据回归 23 卡片正常
- 下一步：PM + Architect 复核 R4 → DevOps 部署（前后端一起）→ PM 重跑迭代关闭检查

---

## 2026-07-25 — v0.6.1 实现 R3：前端展示分层（迭代关闭检查遗留）

- 本次角色：全栈开发（Developer）；模式：标准迭代 v0.6.1 实现阶段 R3
- 背景：PM 2026-07-25 迭代关闭检查发现 PRD R2 §5.10 前端展示分层未实现（实现 R1/R2 三方 Review 全部集中在后端，漏审前端），登记 5 项前端待办叫停关闭
- 已实现（commit `0c733c5`，base `12e2d46`）：
  - `api.ts`：`NewsOut`/`NewsDetailOut` 契约类型 + `getGlobalLevelStatusCounts()`
  - `NewsPage.tsx` 卡片：待解析/解析中角标、失败态底部小字（hover 原因）、基础展示态隐藏评分与标签
  - `NewsPage.tsx` 抽屉：状态条 + 四维评分条形图 + AI 分析 + 背景补全 + 解析中提示 + 失败原因摘要；直显类无状态条；详情合并对旧版后端缺字段做防覆盖
  - `MonitoringPage.tsx`：「AI 处理概览」Tab 六卡片网格 + 失败重试态
  - `AppSidebar.tsx`：底部统计补 AI 待处理/处理中（失败静默降级）
  - 后端 `news.ts`：详情补 `process_type`、列表/详情补 `l1_error`（PRD §5.4/§5.5 失败原因与分层判断依赖）
- 自测证据：server tsc 0 错误；frontend build 通过；本地 dev 以 `VITE_API_PROXY_TARGET=https://test.huiyiyou.cloud` 连测试环境，用临时状态模拟（已移除）逐一截图核对 6 种展示态 + 监控 AI Tab（真实数据 completed=154）+ 侧栏指标；移除模拟后真实数据回归正常
- 已知偏差 3 条（今日/累计口径、language 原文标签依赖后端、待解析角标从严按 AC-04）已登记迭代记录，提请 Review 时裁定
- 另：按 last-out 惯例代提 PM 迭代关闭检查 + Architect 实现 R2 复审遗留文档（commit `5905f19`）
- Owner 订正流程：R3 不走 PM 单方验收，与 R1/R2 一致走三方 Review（已记 corrections，Review 方登记已订正）
- 下一步：PM / Architect / DevOps 三方 Review 实现 R3 → DevOps 部署测试/生产 → PM 重跑迭代关闭检查（收尾）

---

## 2026-07-01 — AI news-l1 跨项目联调入口 + KB search 契约对齐

- 本次角色：全栈开发（Developer）；模式：非迭代跨项目联调任务（coordination `REQ-001`）
- coordination 依据：`/root/Project/niuma-cheng-coordination`；读取并更新 `STATUS.md`、`REQUESTS.md`、`communications/REQ-001-news-l1.md`、`contracts/news-l1.md`、`contracts/kb-search.md`
- Owner 要求：联调不能只做后端触发；需要前端调试页供验收，选择库内数据后发送给 ai 侧处理，并在页面看到返回；ai 侧提出的库内新闻搜索需求也要完成；联调契约必须定清楚传参、返回格式和数量。
- 已完成 xiaobao 侧：
  - 后端新增 AI Hub HTTP 客户端与配置 `AI_HUB_BASE_URL` / `AI_HUB_API_TOKEN` / `AI_HUB_TIMEOUT_MS`
  - `L1_ENGINE=ai` 时 worker 可复用独立 AI Hub 调用路径
  - 抽出 raw_item → `L1Input` 构造函数，联调入口与真实业务共用；补齐 `raw_content.url` 映射，符合 ai 侧 link read 规则
  - 新增 `GET /v1/ai-debug/candidates`、`POST /v1/ai-debug/news-l1-runs`
  - 新增 ai→xiaobao `POST /v1/kb-search`
  - 前端新增 `/debug/ai` 页面和侧栏「联调」入口，可搜索/选择新闻、配置工具上限和超时、发送 AI、展示请求/响应 JSON 与结构化结果
- coordination 已更新：
  - `contracts/news-l1.md` 补齐 `raw_content` URL 规则、`KbResult`、`tool_summary` 口径、JSON 示例
  - 新增 `contracts/kb-search.md` v1：`top_n` 默认 5 / 最大 10，返回 `results[]` 的固定结构
  - 更新 `communications/REQ-001-news-l1.md`、`STATUS.md`、`CHANGELOG.md`
- 验证：
  - `cd server && npm run build` 通过
  - `cd frontend && npm run build` 通过
  - `cd server && npm test -- src/__tests__/x-direct-display.test.ts` 通过（2 passed）
- 测试环境部署与收尾：
  - 已同步后端到 `/srv/niuma-news/test/server/src/`、前端 dist 到 `/var/www/test.huiyiyou.cloud/`，`news-api-test.service` active；`/health`、`/v1/ai-debug/candidates`、`/v1/kb-search` 均 200
  - ai 服务 `http://127.0.0.1:8100/health` 200，xiaobao 测试后端已可调用 ai
  - 修复测试站点 nginx `/v1/` 默认超时导致 AI 慢请求 504：已加 `proxy_connect_timeout 10s`、`proxy_send_timeout 240s`、`proxy_read_timeout 240s`，`nginx -t` 通过并 reload
  - 前端联调页已优化：点击发送后立即展示触发请求和“处理中”响应提示；AI 返回后展示实际 `L1Input` 与完整 `RunResponse`
- 真实联调验证：
  - 公网 `POST https://test.huiyiyou.cloud/v1/ai-debug/news-l1-runs` 通过，约 79s 返回 200，`run_id=run_7e626cf5f391`，`status=succeeded`
  - xiaobao→ai：`run_2a4dbc15f308` succeeded；ai→xiaobao KB 命中：`run_2e0072cba2a3` succeeded 且 `tool_summary.kb_search=1`
  - KB 空结果时 ai 当前标 `degraded:kb_search_failed`，coordination 已记录为 ai 侧语义优化项
- 当前状态：xiaobao 侧联调入口完成、测试环境可验收；主链路不再阻塞。下一步由 Owner 在 `/debug/ai` 抽样验收，ai 侧优化 KB 空结果语义

---

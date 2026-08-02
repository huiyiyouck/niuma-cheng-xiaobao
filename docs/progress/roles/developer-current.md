# 全栈开发工作日志 — Current

> 最近 5 条工作日志。其余条目按时间倒序归档到 `developer-archive.md`。
> 长期摘要、当前关注点、常见风险见 `developer-summary.md`。
> 分层时间：2026-08-01（会话收尾分层，07-25 / 07-01 两条移入 archive；上次 2026-07-29）

---

## 2026-08-02 — 答 ai v0.2 完成帖三件事 + 修复前端三处消费缺陷（非迭代小改）

- 本次角色：全栈开发（Developer）；模式：非迭代小改（ai Developer 08-02 帖点名我方 Developer 核对写回消费预期）
- **核对结论：ai 写回结构与契约逐项相符**；三处专项答复见 coordination 回帖（translation 空串我方零消费无差别 / context 空数组条件渲染零副作用 / processing 键 API+库全链路原样透传不丢弃）
- **核对反抓出我方前端三处消费缺陷（联调必炸雷，已修）**：
  - `NewsPage.tsx` `mapNews`：`tags_v2` 只认数组形态，契约五类 object 全被丢弃 → AI 新闻标签恒空。修：object 扁平语义四类（domain/event/content_type/entity，排除 processing 技术标记）+ 空回退 v0.5 tags
  - `mapNews`：`score_dimensions` 契约嵌套 `{score,reason}` 被 `Number(object)=NaN` 全滤 → 四维条形图恒不渲染（R3 平面数字模拟掩盖）。修：解包 `v?.score`，兼容平面数字
  - 抽屉条形图满分刻度按 0-10 画 1-5 分制（条形恒不过半）。修：`min(5,num)*20%`
- 验证：mapper 四形态确定性验证（ai 样本/遗留 `{}`/数组/全缺失，scratchpad 脚本）全对；frontend build 通过；本地 dev 连测试环境真实数据回归——卡片标签/抽屉状态条/摘要/正文/标签全渲染、零控制台报错；四维条形图端到端待联调真实写回数据（现存测试数据无 dims）
- 交接 DevOps：前端修复随下次部署上 test/prod（联调看展示层前需先上）
- 下一步：联调时间由 Owner 与 ai 侧约；样本 8 条技术侧可全消耗，消耗后 DevOps 复跑幂等 seed 恢复

---

## 2026-08-01 — 任务书三项提前完成（needs_context 迁移 + #5 补算 + #7 重试，非迭代任务）

- 本次角色：全栈开发（Developer）；模式：非迭代任务（INDEX 任务书三项，原绑 ai v0.2 联调触发，Owner 指令提前做掉；三项同批）
- 已完成（TDD：先写 `l1-backfill-retry.test.ts` 6 例红灯 → 实现 → 6/6 绿）：
  - **任务 1 needs_context**：schema.ts `processedNews` 补 `needsContext: boolean`（可空）+ 幂等脚本 `add_processed_news_needs_context.sql`（vitest 库实跑两遍验证：boolean/可空）；test/prod 落库随下次 DevOps 部署（时序红线：须在 ai 写回联调前生效）
  - **任务 2 #5 补算**：`l1-processor.ts` 新增 `backfillScoreTotalTick`——条件按契约 v1.9（completed + 有维度 + total 空）、LIMIT 200、维度残缺跳过并 warn（防 ai 写回脏数据崩 tick）、公式复用 `calcScoreTotal` 单一真源；挂 `worker/index.ts` reclaimLoop（与 reclaim 同节奏 30s）
  - **任务 3 #7 重试**：`l1-tasks.ts` 白名单放开 `l1_ai_process`；新任务建**同类型**（原实现硬编码 `l1_process`）+ `max_attempts` 改走 `maxAttemptsForTaskType`（尊重 `AI_MAX_RETRIES`，原硬编码 3）
- 验证：新测试 6/6（含公式值断言 10.0、复位断言、拒绝路径）；tsc 0 错误；全量单测 **71/71**
- 交接 DevOps（下次部署两件）：① 部署本批代码 ② psql 跑 needs_context 脚本（test+prod）——②落库后在 coordination 回帖销契约 v1.9 的「列迁移待落地」前置
- 顺带发现（未动）：`calcScoreTotal` 的日志格式串用 `%.2f/%.1f` 但 logger 不支持该占位符，输出参数错位（纯日志显示问题，计算正确、单测断言过）；留待后续顺手修
- 下一步：ai v0.2 联调启动时 xiaobao 侧已无待做项；等 DevOps 部署落库

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

## 2026-08-01 — coordination 6i①：`sources.domain_tags` 列默认值修复（非迭代小改）

- 本次角色：全栈开发（Developer）；模式：非迭代小改（coordination REQ-003 待跟进 6i① 落地项，Owner 指令开工）
- 已落码：
  - `schema.ts:67`：`domainTags` 列默认值 `'{}'::jsonb` → `'[]'::jsonb`（契约 v1.6 定性：预期类型是数组，`{}` 系误写）
  - 新增幂等迁移脚本 `server/db/scripts/fix_sources_domain_tags_default.sql`：`ALTER COLUMN SET DEFAULT` + 存量 `{}` 归一 `[]` + 注释内验证 SQL；test/prod 执行归 DevOps 随下次部署（已入 INDEX 部署包待办 ③）
- 排查确认：全代码库无任何路径显式写 `{}` 到该列（zod 层新建源默认 `[]`），列默认值是唯一来源，改默认即断根
- 验证：隔离库 `news_vitest` 实跑脚本两遍（验幂等）——新默认值 `'[]'::jsonb` ✓ / 非数组行数 0 ✓；tsc 0 错误；全量单测 65/65
- **顺带发现（未动，仅登记）**：`schema.ts:69` `content_topics` 有同款问题（语义为数组、默认 `'{}'`，`sources.ts:36` 已有 SQL 层容错）；不在 6i① 范围且不出境给 ai，待 Owner 拍是否顺带清理
- coordination 6i① 状态已更新（代码侧完成、执行随部署）
- 下一步：DevOps 下次部署执行脚本（test+prod）并按注释验证
- **追记（同日，Owner 授权自决后收口升级）**：Owner 明确「技术决策自己拍，方向取最稳最冗余」。据此自决：脚本升级为 `fix_sources_jsonb_array_columns.sql`（原 domain_tags 脚本改名扩展）——① `content_topics` 同款问题一并修（schema.ts 默认值 + 存量归一）② 存量归一从「仅 `{}`」加固为「任意 object → 值数组」（与应用层 `Object.values` 容错同口径）③ 补 **CHECK 约束**两条防再混存（兑现 coordination 已登记的「加类型校验」承诺，此前一直没人落）。验证：vitest 库实跑两遍验幂等 + CHECK 拒写实测（`{}` 插入被拦、默认值路径得 `[]`）+ tsc 0 错误 + 单测 65/65（CHECK 生效下全量回归）。INDEX 部署包 ③ 与 coordination 6i① 引用已同步更新

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

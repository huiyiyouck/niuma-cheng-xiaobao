# 架构师工作日志 — 当前（最近 10 条）

> 分层策略见 `docs/baseline/context-policy.md`。
> 启动默认读本文件 + `architect-summary.md` + `architect-corrections.md`。
> 历史日志见 `architect-archive.md`，按需搜索。

## 2026-07-28 — REQ-003：答 C-11~C-14 + 撤回上轮 `l0_label` 错误结论 + 契约 v1.5

**本次角色**：架构师（跨项目协作，非迭代）
- 落档：coordination `bb530e9`（含 DevOps last-out 代提的 `96a52be`）；xiaobao INDEX + 纠错记录

### 核心：撤回上轮 C-1 的错误结论，找到 `domain_tags` 真源
上轮我答「L0 分类结果存在 `raw_items.l0_label`，GRANT 该列即可消除 `domain_tags` 恒空」——**错的**，害 ai 白 GRANT 一列并改了 PRD（CN-004）。本轮追完整取数链路：

```
sources.domain_tags (schema.ts:67) → l1-processor.ts:243/257-278 → ai-hub.ts:45 → HTTP 请求体
```

**`L1Input.domain_tags` 从来不是 L0 产物，是信息源级静态标签**；`l0_label` 是处理决策标记（取值域：`direct_display` / `normal_candidate` / `high_priority_candidate` / `needs_context_candidate` / 规则跳过原因 / `llm_skip`）。GRANT `sources.domain_tags` 后 ai 侧与 HTTP 模式**完全等价**，不必列为已知限制——比 PM 同日给的「暂无规划」条件口径结果更好（PM 指的是 L0 动态分类能力，与源级静态标签不矛盾，已在帖中说明避免两个说法打架）。DevOps 当日即执行了 GRANT。

### 其余答复
C-11 `priority` 数值大 = 优先（`ORDER BY priority DESC, created_at ASC`）/ C-12 退避越界 `Math.min` 取末值 / C-13 `source_item_url` **不保证**协议前缀（x_twitter 两路径构造完整 URL，rss/jin10 原样透传源数据）+ 同意登记 `raw_item_id` 唯一约束为 ai 幂等前提 / `l1_ai_process` 由 `l0-classifier` 在 L0 通过后且仅 `database` 模式创建、type 字面量确认 / `/v1/kb-search` 是 POST 走 `adminGuard` 需 token。

### 自我纠错（第三次同根因）
帖子 push 后按当前 HEAD 复核，发现 C-5「非同一事务、有毫秒窗口」与 C-12「应用层不读 `max_attempts` 列」**两处引用的是上一轮会话的代码记忆**，而 Developer 已于 `744d20a` 修复两者。已发更正帖 + 同步契约两段。教训写进 corrections：**多角色并行仓里跨会话的代码记忆一律作废，对外断言落笔前必须按当前 HEAD 重新核实**——尤其是自己上一轮登记为「待办」的项，它极可能已被别人清掉。

### 新登记
`news_test` 8 条 `l0_classify` 全 `failed`（L0 链路从未跑通，是两库 `l0_label` 只有一个值的直接原因）→ Developer 待查。

---

## 2026-07-27 — REQ-003 跨项目：答复 ai 侧契约缺项（Architect 名下 11 项）+ 契约订正 v1.3

**本次角色**：架构师（跨项目协作，非迭代）
- 动作：答复 coordination `communications/REQ-003` 中分派给 Architect 的 3 条阻塞 + 8 项中低优先级；订正 `contracts/news-l1-db.md` 至 v1.3
- 落档：coordination `6678d19`（沟通文档 + 契约 + CHANGELOG）；xiaobao INDEX 登记 7 项待办
- 仓位置依据：`project-context.md` 的 `coordination_root=../niuma-cheng-coordination`，答复前确认与 origin/main 同步

### 三条阻塞的结论
- **C-2** `tasks.status` 穷举实现后确认只有 4 值（queued/running/succeeded/failed），给出与 `l1_status` 的四时点对应表。
- **C-3 推翻 ai 侧推断**：ai 推「ai INSERT」（依据触发器 INSERT 后触发的语义，推理本身正确），但与 AC-01/AC-06「L0 通过后立即可见」的产品硬约束冲突——占位行是该约束的落地手段（实现 R2 #A1 修复的产物）。结论维持「xiaobao 占位 INSERT + ai UPDATE」，并澄清 ai 担心的「排序位先按空值排一次」不成立（`news_positions` 不存排序键，排序按 `published_at` 查询时实时算）。
- **C-5 诚实答「几乎必然但非原子」**：dispatcher 全程无 BEGIN/COMMIT（grep 确认），置 queued 与建 task 之间有毫秒级窗口，未给干净的「是」，承诺加事务。

### 纠正 ai 侧 3 条前提，其中 2 条根因在我方
- **C-9**：我方契约写了**不存在的 `tasks.metadata` 列**，导致 ai 推出「关联只能走 jsonb 表达式、可能全表扫」。实际 `raw_item_id` 是一级 uuid + FK，走主键。
- **C-4**：ai 判断「退避完全失效」正确，但根因不是 claim SQL 缺条件，而是**我方 GRANT 漏了 `run_after` 列**——ai 无法写退避时间，置 queued 后立即被重领。
- **Q-4**：rss「无原文链接」不成立——链接在 `raw_items.source_item_url` 列（`rss.ts:40` `url: entry.link`），只是没 GRANT。ai 可撤回「从 tweet_id 构造 URL」的适配层要求。

### 自我纠错（重要）
初次核查时用 `grep | head` 被截断，误判「`score_total` 补算逻辑在代码中根本不存在」并已写入帖子。落契约前复核发现 `calcScoreTotal` **存在**（`l1-processor.ts:13`），随即更正帖子为准确表述：**函数存在，但唯一调用点在 `l1-processor.ts:171`（HTTP/内建 L1 路径），database 模式无触发点**。教训：向外部项目上报「我方缺陷」前必须二次核实，`| head` 截断是这次的直接原因。已记入 [architect-corrections.md](architect-corrections.md)。

### 顺带查出的 xiaobao 侧潜伏缺陷
`x-stream-manager.ts:95/110` 入库路径未适配 v0.6.1：不带 `process_type`（用列默认 `'ai'`）、硬建 `process` task → 绕开 L0 与 ai_worker 链路走旧 `processLLM`，且 `l1_status` 停在 `not_started` → 前端显示「待解析」而实际已处理完。当前生产未显现（DevOps R4 verify 0 行），X Stream 一恢复入库即显现。已登记 INDEX 待办第 2 项。

### 契约 v1.3（第一批：纯事实订正）
删 `metadata` + 补 4 列 / status 枚举与时点对应 / claim SQL 补 `run_after` 退避条件 / `processed_news` 写入方式与 `id`、`published_at` / `score_total` 缺口标注 / `l1_status` 枚举时点订正。第二批（GRANT 三列、`needs_context` 补列、`score_total` 时机）待 DevOps 执行与 PM 拍板后升 v1.4。

---

## 2026-07-26 — v0.6.1 实现 R4（R3 同批修复）Architect 复核

**本次角色**：架构师
- 动作：复核（对 Developer R4 修复 commit `5ab883f` 做条件闭环复核）
- 涉及文档：`v0.6.1.md`（追加 Architect R4 复核 + 门禁 R4 行登记）/ `INDEX.md` / 本文

### 结论
✅ **通过** — R3 六项修复全部关闭；新增 2 中 3 低，均不阻塞定稿，其中 2 项转为部署前核实。

### 关闭验证要点
- **#A-R3-1（高）关闭**：`publicL1Error()` 四分支**全部返回常量**，无任何位置把 raw 拼进返回值（逐分支核对）；`isAdminReq()` 在 token 未配置时返回 false → 降级为全部归一化，失败方向指向安全侧；单测含对 IP/主机名/路径的 `not.toContain` 断言，红灯（ETIMEDOUT 不含 timeout 子串）是真实分类漏洞，属有效 TDD。
- **#A-R3-5 去重逻辑核对**：x_twitter 占位 summary 取 `content.text` 全文不截断，与 `rawContentText` 同源同值 → 不会出现两段重复正文；富展示态「AI 摘要 + 原文正文」并存符合 PRD §5.5。
- **#A-R3-3 向后兼容正确**：新增 `ai_*` 三字段而保留原全量字段，SourceDetail 既有调用不受影响。
- **#PM-R3-1 独立核实 Developer 判断正确**：`git show 0c733c5:api.ts` L188 注释本就是 AD-05 四维，PM 指控不成立；改为显式 `ScoreDimensions` 是合理的意图承接。

### 新增 5 条（均为 R4 修复引入或首次激活，非 R3 遗留）
- **#A-R4-1（中）** 响应随请求头变化却无 `Cache-Control: private`/`Vary`；仓库内无 nginx 配置，若链路有 proxy_cache，admin 原文响应被缓存后投给公开用户会让 #A-R3-1 整体失效 → 建议直接加一行响应头（比核实还便宜）。
- **#A-R4-2（中）** `isAdminReq()` 只验 token，不看 IP 白名单与 `ADMIN_REQUIRE_BOTH`（默认 false，等价；若生产为 true 则是绕过双因子的旁路）；且鉴权语义两处独立实现会漂移 → 抽公共函数 + 请 DevOps 核实生产取值。
- **#A-R4-3（低）** 外链 href 取自抓取数据未做 `^https?://` 协议白名单，R3 时该字段恒 undefined，本轮首次激活该渲染路径。
- **#A-R4-4（低）** 白名单兜底可能让存量非 completed 数据显示**永不消失的「待解析」角标** → 给了部署前 verify SQL。
- **#A-R4-5（低）** `ai_* ?? 全量` 兜底 + 「不含直显类」固定文案，在前后端版本不同步时产生错误标注。

### 流程口径提示
按 `standard-iteration-quick.md` §9-10「不进 R4」的字面口径本轮已越线；实质上 R3 的修复清单是三方已达成一致的确定项而非未收敛争议，故按条件闭环修复轮处理。已在 Review 说明中提请 Owner 知悉：R4 后如再需改动走 Change Note，不开 R5。

### 下一步
PM 复核 R4 → DevOps 部署（带 3 项核实：nginx proxy_cache / ADMIN_REQUIRE_BOTH / #A-R4-4 verify SQL）→ PM 重跑迭代关闭检查。

---

## 2026-07-25 — v0.6.1 实现 R3（前端展示层）Architect Review

**本次角色**：架构师
- 动作：Review（对 Developer 前端展示分层实现 commit `0c733c5` 做实现 R3 架构师 Review，三方之一）
- 涉及文档：
  - `docs/progress/iterations/v0.6.1.md`（追加 Architect R3 Review 记录 + 实现阶段门禁 R3 行 Review 结果登记）
  - `docs/progress/INDEX.md`（当前阶段 + 待办推进）
  - `docs/progress/roles/architect-current.md`（本文）

### 结论
⚠️ **有条件通过**（9 条：1 高 / 4 中 / 4 低）。条件：#A-R3-1 部署前必修；#A-R3-2/#A-R3-3 建议同批修；#A-R3-4/#A-R3-5 提请 PM 裁定。

### 独立发现（经代码事实核查，非文档推断）
- **#A-R3-1（高）** `l1_error` 内部异常原文经**公开** GET `/v1/news`(`:id`) 透传到前台（`admin-guard.ts` L20-28 GET 不鉴权），写入源是 `dispatcher.ts` 的 `err.message`，database 模式下内容还由外部 ai_worker 写。PRD §5.5 要的是「失败原因摘要」，不是异常原文。→ 后端按 `last_error_kind` 归一化，原文留管理侧。
- **#A-R3-3（中）** 监控页「AI 处理概览」六卡口径混用：`completed/retryable_failed/final_failed` 三卡无 `process_type='ai'` 过滤，而 `processor.ts` L100-108 把**直显类也写成 `l1_status='completed'`** → AI 面板混入直显计数。Developer 自测的 `completed=154=total_ai` 是测试环境巧合，掩盖了失真。
- **#A-R3-5（中）** PRD §5.5 各态要求的「正文（原文）」「查看原文外链」恒不渲染——后端 `newsToOut/newsDetailToOut` 从不返回 `content`/`url`，`processed_news` 也无正文列，前端 `fullContent/originalUrl` 恒 undefined。基础展示态受影响最大（该态无 AI 摘要）。v0.6 跨版本遗留。

### 与定稿文档的偏差
- **#A-R3-2（中）** `retryable_failed` 被实现为「解析失败」，设计 §5.1 定稿把它归入「处理中占位 → 解析中」；该状态实际仍在 `ix_raw_items_ai_queue` 待重试队列内，展示「✕失败」误导用户。
- **#A-R3-4（中）** 设计 §5.1 改造清单第 3 条「失败降级 + 管理员手动重试按钮」未实现**且未登记偏差**。

### 低严重度 4 条
`displayState()` 存在库内不存在的 `case "pending"`；`default` 兜底为 `rich` 过于激进（建议白名单只认 `completed`）；`isBasicState()` 不含 `direct` 致直显类仍显示 tags（PRD §5.3 内部口径自相冲突，须 PM 收口）；`NewsOut` 的 `[key: string]: unknown` + `frontend` 无 `tsconfig.json`（build 仅 `vite build` 不做类型检查）使新增契约类型不可校验。

### 独立验证
`server npx tsc --noEmit` 0 错误 ✅ / `frontend npm run build` 通过 ✅（复跑确认 Developer 自测证据属实；但发现 `vite build` 不含类型检查，"build 通过"不等于类型无误）

### Developer 3 条已知偏差裁定
全部 ✅ 同意（今日口径延后 / language 标签依赖已降级前置 / 「待解析」角标按 AC-04 从严实现优于 §5.4 表格）。

### 下一步
PM 完成 R3 Review + 裁定 4 项 → Developer 修 #A-R3-1（部署门禁）→ DevOps 部署 → PM 重跑迭代关闭检查。

---

## 2026-07-15 — v0.6.1 实现 R2 Architect 复审

**本次角色**：架构师
- 动作：复审（对 Developer v0.6.1 实现 R2 修复进行架构师 R2 复审）
- 涉及文档：
  - `docs/progress/iterations/v0.6.1.md`（追加 Architect R2 Review 记录 + 实现阶段门禁状态更新）
  - `docs/progress/INDEX.md`（当前阶段 → 实现 R2 已定稿 + 最近收尾摘要）
  - `docs/progress/roles/architect-current.md`（本文）

### 复审结论
✅ **通过**（高严重度 1/1 全部关闭，低严重度 2/3 关闭，1 条保留为优化建议不阻塞）

### R1 意见关闭验证

**高严重度（1/1 关闭）**：
- #A1 占位 `processed_news` 创建位置错误 → ✅ 移至 `l0-classifier.ts` L0 通过后，`processor.ts` dead code 已清理，数据流三路出口均验证正确

**低严重度（2/3 关闭，1 条保留）**：
- #A2 `l1-processor.ts` 手动 fan-out → ✅ 已移除，触发器覆盖
- #A3 `reclaim.ts` 回收同步 SQL 优化 → ⚠️ 未修改，保留为后续迭代优化建议（不阻塞）
- #A4 `config.ts` 默认值不一致 → ✅ 已改为 `database`，对齐 PRD §6.5

### PM 意见独立复核
5/5 条全部确认关闭（#PM-IMPL-1 高 + #PM-IMPL-2~5 低）

### 收尾
- 关联迭代：v0.6.1
- 遗留问题/风险：
  - 架构师名下无未完成事项
  - 未关闭的低严重度项：#A3（reclaim.ts 优化），建议后续迭代处理
  - DevOps 未关闭项：#DO-4/5/6/7（告警/OnFailure/连接池/回滚文档），不阻塞
  - 下一步：迭代收尾归档

## 2026-07-12 — v0.6.1 实现 R1 Architect Review

**本次角色**：架构师
- 动作：Review（对 Developer v0.6.1 实现 R1 进行架构师 Review）
- 涉及文档：
  - `docs/progress/iterations/v0.6.1.md`（追加 Architect R1 Review 记录 + 实现阶段门禁状态更新）
  - `docs/progress/INDEX.md`（当前阶段 → 实现 R1 Review 中 + 最近收尾摘要）
  - `docs/progress/roles/architect-current.md`（本文）

### Review 结论
❌ **需修改**（1 个高严重度阻塞 + 1 个新发现低严重度 + 确认 PM 的 4 个低严重度）

### Review 要点

**高严重度（1 条阻塞）**：
- #A1 占位 `processed_news` 创建位置错误（dead code）。数据流追踪确认：AI+database 模式下 task 走 `l0_classify → l1_ai_process`，不经过 `processOne` 函数。占位创建代码在 `processor.ts` L34-61 是 dead code。应在 `l0-classifier.ts` L0 通过后创建。与 PM #PM-IMPL-1 同一根因独立确认。

**低严重度（3 条）**：
- #A2 `l1-processor.ts` L228-235 仍保留手动 `news_positions` fan-out（与 PM #PM-IMPL-4 同一问题）
- #A3 `reclaim.ts` 回收同步 SQL 可优化精确度（架构师独立发现，用 RETURNING 替代全表扫描）
- #A4 `config.ts` 默认值 `"http"` 与 PRD 不一致（与 PM #PM-IMPL-5 同一问题）

**已正确实现**（14 项 ADR 落地全部确认）：
- ADR-006~010 全部正确落地
- SECURITY DEFINER 触发器 + 列级 GRANT + REVOKE CREATE 完整
- dispatcher 分流 + l1_ai_process task + max_attempts=3 + reclaim 回收同步
- SQL 迁移完整（DDL + 索引 + 触发器 + GRANT + 数据回填 + 回滚脚本）

### PM 意见核验
5/5 条全部确认成立（#PM-IMPL-1 高 / #PM-IMPL-2~5 低）

### 收尾
- 关联迭代：v0.6.1
- 遗留问题/风险：
  - 架构师名下无未完成事项
  - 等待 DevOps 完成 R1 Review → Developer R2 修复

## 2026-07-12 — v0.6.1 设计文档翻牌定稿

**本次角色**：架构师
- 动作：定稿翻牌（设计文档产出方的最终收口）
- 涉及文档：
  - `docs/progress/iterations/v0.6.1-design.md`（文档状态：待Review → 已定稿）
  - `docs/progress/iterations/v0.6.1.md`（当前阶段 → 实现 R1）
  - `docs/progress/INDEX.md`（当前阶段 + 版本列表）
  - `docs/progress/roles/architect-current.md`（本文）

### 翻牌内容
- 文档状态：待Review → **已定稿（PM / Developer / DevOps R2 复审全部通过）**
- 定稿时间：2026-07-12
- 设计阶段架构师工作闭环：PRD R2 复审 ✅ → 设计 R1 产出 ✅ → R2 汇总修订 ✅ → 翻牌定稿 ✅

### 收尾
- 关联迭代：v0.6.1
- 遗留问题/风险：
  - 架构师名下无未完成事项
  - 下一步：切换到 Developer 启动实现阶段 R1

## 2026-07-12 — v0.6.1 设计文档 R2 修订

**本次角色**：架构师
- 动作：修改（响应 PM / Developer / DevOps 三方设计 R1 Review 共 28 条意见）
- 涉及文档：
  - `docs/progress/iterations/v0.6.1-design.md`（R2 全量重写，28 条意见全部关闭）
  - `docs/progress/iterations/v0.6.1.md`（设计阶段门禁 R1→R2 + Git 关键节点）
  - `docs/progress/INDEX.md`（当前阶段 → 设计 R2 Review 中）
  - `docs/progress/roles/architect-current.md`（本文）

### R2 修订要点

**高严重度 8 条全部关闭**：
1. #PM-1/#DD4/#D2 灰度开关命名 → 统一用 `AI_INTEGRATION_MODE=database|http`，废弃 `L1_ENGINE=ai_worker`
2. #D1 触发器权限死锁 → `SECURITY DEFINER` + `SET search_path = public, pg_temp`
3. #DD1 `processed_news` 无 `updated_at` → 移除 ON CONFLICT 中的 `updated_at`
4. #DD2 tasks GRANT 缺 `updated_at` → GRANT UPDATE 列表追加
5. #DD3 AI 处理中新闻查询排除 → 占位 processed_news 模式（AI 类入库时创建）
6. #DD5 `raw_items.language` 不存在 → 从 GRANT 移除（language 在 processed_news 上）
7. #DD6 `processed_news_id_seq` 不存在 → 移除序列权限（uuid 主键）
8. #D3 运维告警缺失 → 新增 §7.3 运维告警章节（4 类告警 + 阈值）

**中严重度 13 条全部关闭**：queued/pending 映射 / 扩展现有接口 / 卡片抽屉分层 / 人工 SQL / 5 步部署时序 / 连接池配置 / dry-check / REVOKE CREATE / env 对齐 / 列表 SQL / shouldDirectDisplay / 触发器去重 / l1_status 同步

**低严重度 7 条全部关闭**：排序规则 / 参考实现标注 / 产品风险 / 部署验证清单 / 回滚细节 / CTE 批量 UPDATE / max_attempts=3

### 关键技术修正
- 触发器函数改用 `SECURITY DEFINER` 解决 ai_worker 无 news_positions INSERT 权限的死锁
- AI 类入库时创建占位 `processed_news`（原文标题/摘要），ai_worker 完成后 UPDATE 覆盖
- 迁移路径从 drizzle-kit 改为人工 SQL（v0.6 生产经验确认元数据脱轨）
- 分批 UPDATE 改用 CTE 包装（PostgreSQL 不支持 UPDATE ... LIMIT）

### 收尾
- 关联迭代：v0.6.1
- 遗留问题/风险：
  - 架构师名下无未完成事项
  - 等待 PM / Developer / DevOps 三方 R2 复审

## 2026-07-12 — v0.6.1 设计文档 R1 产出

**本次角色**：架构师
- 动作：设计（Architect 产出 v0.6.1 设计文档 R1）
- 涉及文档：
  - `docs/progress/iterations/v0.6.1-design.md`（新建，R1 待 Review）
  - `docs/progress/iterations/v0.6.1.md`（更新阶段门禁：UI 跳过 + 设计阶段 R1）
  - `docs/progress/INDEX.md`（更新当前阶段为设计 R1 Review 中）
  - `docs/progress/roles/architect-current.md`（本文）

### 设计要点
- **核心变化**：AI 处理从 HTTP 同步调用改为数据库契约边界异步解耦
- **ADR-006**：AI 处理改数据库契约，xiaobao 仅标记状态不做 AI 调用
- **ADR-007**：新增 `raw_items.process_type`（direct/ai），不新增表
- **ADR-008**：新增 `ai_worker` 数据库角色 + 列级 GRANT，schema 权属归 xiaobao
- **ADR-009**：AI 失败走 tasks 退避重试，内建 L1 保留兜底
- **ADR-010**：前端展示按 process_type + l1_status 分层，不新增接口

### 关键技术决策
- `l1_status` 枚举与 v0.6 完全兼容，无需修改（5 态已满足）
- `processed_news` 表无 DDL 变更，现有字段完全满足需求
- `news_positions` 关联用 AFTER INSERT 触发器，不增加 worker 复杂度
- 内建 L1（builtin/agent）保留兜底，`ai-hub.ts` 标记废弃但不删除
- 零停机迁移：ADD COLUMN + 分批回填 + 触发器，全量可回滚

### Review 安排
- 指定 Review 方：PM / Developer / DevOps（3 方）
- Architect 不自评，等待三方 Review 结果

### 收尾
- 关联迭代：v0.6.1
- 遗留问题/风险：
  - 架构师名下无未完成事项
  - 等待 PM / Developer / DevOps 完成设计 R1 Review

## 2026-07-12 — v0.6.1 PRD R2 复审

**本次角色**：架构师
- 动作：复审（审 PM 的 v0.6.1 PRD R2）
- 涉及文档：
  - `docs/progress/iterations/v0.6.1-prd.md`（追加 Architect R2 复审记录 + Review 状态表更新）
  - `docs/progress/roles/architect-current.md`（本文）

### 复审结论
- 结论：✅ **通过**
- R1 五条意见核验：5/5 全部完全关闭

### R1 意见关闭情况
- #A1(高) 状态字段策略 → AD-01 扩展现有 l0_status/l1_status，✅完全关闭
- #A2(高) 写回职责 → AD-02 ai 只写状态+processed_news，news_positions 由 xiaobao 触发写，✅完全关闭
- #A3(中) 直显类数据流转 → AD-03 直显类也创建 processed_news，✅完全关闭
- #A4(中) 卡死回收机制 → AD-04 复用 tasks.locked_at + reclaimStaleTick，✅完全关闭
- #A5(低) 字段映射 → AD-05 scoreDimensions/tagsV2 明确，✅完全关闭

### R2 架构重大变化评估
R2 取消翻译前置层（三层→两层入库），翻译由 AI 在深度解析时一并处理。评估为**正面简化**：少一层、少一张表、少一套状态、不引入翻译 API、GRANT 范围更小。

### R2 新增内容评估
- AC-10 权限隔离方案：✅ 优秀（PostgreSQL GRANT 硬隔离）
- §6.4 部署协调：✅ 5 步时序清晰
- §6.5 环境变量增量：✅ 6 个 env 覆盖完整
- §6.6 回滚边界：✅ 无不可回滚改动
- §7 运维事项：✅ 全部覆盖

### 观察（不阻塞）
- #A2-1(低) process_type 默认值 `ai` 与现有 X/Twitter 直显数据兼容性，设计阶段补迁移 SQL

### 收尾
- 关联迭代：v0.6.1
- 遗留问题/风险：
  - 架构师名下无未完成事项
  - 等待 Developer / DevOps 完成 R2 复审，PM 汇总后定稿

## 2026-07-05 — v0.6.1 PRD R1 Architect Review

**本次角色**：架构师
- 动作：Review（审 PM 的 v0.6.1 PRD R1）
- 涉及文档：
  - `docs/progress/iterations/v0.6.1-prd.md`（追加 Architect R1 Review 记录 + Review 状态表更新）
  - `docs/progress/roles/architect-current.md`（本文）

### Review 结论
- 结论：❌ **需修改**
- 意见数量：7 条（3 高 / 3 中 / 1 低）

### 高严重度（3 条）
- #A1 状态字段位置与现有模型冲突 — AC-08 定义的 8 种状态与 `raw_items.l0_status/l1_status` 关系未明确
- #A2 translations 新表与 `processed_news.translation` 字段冗余 — 同一数据存两处易不一致
- #A3 processed_news 与 news_positions 写回职责不清 — 直接影响数据库契约边界清晰度

### 中严重度（3 条）
- #A4 翻译任务与现有 tasks 表关系未定 — 是否复用 tasks 的 claim/locked/attempt 机制
- #A5 直显类新闻数据流转未定 — 是否需要 processed_news 记录、前端展示数据源
- #A6 卡死回收与现有机制关系未定 — 是否复用 tasks.locked_at 超时释放机制

### 低严重度（1 条）
- #A7 score_dimensions/tagsV2 字段命名一致性 — 四维评分和五类标签的字段映射

### 整体评价
- ✅ 技术可行性：数据库解耦、翻译前置、异步处理三条主线技术上可行，无架构红线
- ⚠️ 架构缺口：#A1-#A3 三个高严重度问题涉及核心数据模型设计，必须在 PRD R2 中明确
- ✅ 方向正确：Owner 确认的"数据库为契约边界"方向解决了 HTTP 同步调用的根本问题
- ✅ schema 权属纪律清晰：AC-11 与 Owner 确认完全对齐
- ✅ ai 侧适配层要求合理：AC-12 与 Owner 生态层提醒完全对齐

### 收尾
- 关联迭代：v0.6.1
- 遗留问题/风险：
  - 架构师名下 R1 无后续动作
  - 等待其余 2 方（Developer / DevOps）完成 R1 Review，PM 汇总后产出 R2，届时 Architect 复审

## 2026-06-13 — v0.6 设计文档翻牌定稿

**本次角色**：架构师
- 动作：定稿翻牌（设计文档产出方的最终收口）
- 涉及文档：
  - `docs/progress/iterations/v0.6-design.md`（文档状态：待Review → 已定稿（有条件），补 PM 裁定摘要和条件承接清单）
  - `docs/progress/roles/architect-current.md`（本文）
  - `docs/progress/roles/architect-summary.md`（当前关注点刷新）

### 背景
PM 已于 2026-06-13 裁定 R2 有条件定稿（commit 2831ef8），但设计文档头部状态仍为「待Review」——架构师作为产出方漏翻牌。本次补上。

### 翻牌内容
- 文档状态：待Review → **已定稿（有条件）**
- 定稿时间：2026-06-13
- 定稿裁定：PM 不开 R3，四方 R2 复审均 ⚠️ 有条件通过
- 条件承接：Developer / Tester / DevOps / PM 四方各自承接项已在文档状态段显式列出

### 收尾
- 关联迭代：v0.6
- 遗留问题/风险：
  - 架构师名下无未完成事项
  - v0.6 设计阶段架构师工作已闭环：PRD R1/R2 Review ✅ → UI R1 Review ✅ → 设计 R1 产出 + R2 汇总修订 ✅ → 翻牌定稿 ✅
  - 下一步：切换到 Developer 启动 v0.6 实现阶段 R1

## 2026-06-12 — v0.6 设计文档 R2 汇总修订 + 会话收尾

**本次角色**：架构师
- 动作：汇总修订 + 收尾
- 涉及文档：
  - `docs/progress/iterations/v0.6-design.md`（R2 修订：关闭全部 8 高 + 5 关键中，24 条中/低承接到实施阶段）
  - `docs/progress/iterations/v0.6.md`（设计阶段 R2 行追加）
  - `docs/progress/INDEX.md`（当前状态推进 + 版本列表 + 最近收尾摘要追加）
  - `docs/progress/roles/architect-current.md`（本文）

### R2 汇总修订

5 方 R1 共 41 条意见（8 高 / 17 中 / 16 低），全部 ⚠️ 有条件通过，共识门槛已到。R2 修订策略：**高严重度全部关闭 + 关键中严重度关闭 + 其余中/低承接到实施阶段**。

**关闭的 8 条高严重度**：
1. #T1/#D6/#A12 错误分类映射 → §4.5 新增「外部依赖错误归档对照表」（9 行映射表 + tasks.last_error_kind 归一化）
2. #T2 L1 五阶段失败传播 → §4.3.6 新增「L1 失败传播 + 重试粒度」段（5 阶段传播表 + 重试粒度声明 + 并发隔离声明）
3. #T3 AC-32 告警 SQL 不完整 → §4.6 表扩展为「检测 SQL + 语义映射」+ 新增 tasks.last_error_kind 字段（§2.4）
4. #O1 上传目录可执行清单 → §4.7.1 新增「部署前置工作」（mkdir/chown/chmod/健康检查 4 条）+ 修正 §7.2「root 用户可写」
5. #O2 deploy/nginx 路径不存在 → §4.7 + §6.3 选定选项 A（最小变动：nginx 配置由 DevOps 部署时手工增补）
6. #O3 npm 依赖增量 → §6.3 新增「已知 npm 依赖增量清单」+ 明确禁止 native binding 类依赖（sharp/playwright/canvas）
7. #D1 workerLoop 主循环改造 → §4.4 扩展为完整 dispatcher 改造范围（3 个 sem + 5 个 claim 分支 + routing）
8. #D2 llm.ts 双模型支持 → §4.5 + §6.3 明确 `callLLM<T>` 抽象 helper 实现路径

**关闭的 5 条关键中严重度**：
- #P2/#T5 SQL bug：§3.2 修复 `level-status-counts` SQL 移除多余 `OR ... IS NOT NULL`
- #T8 上传 3 类异常兜底：§4.7 新增「失败兜底」段
- #O8 nginx client_max_body_size：§4.7 补 `client_max_body_size 2m`
- #D4 手动重试 task type：§3.2 明确 `POST /v1/l1-tasks/:task_id/retry` 创建新 task type=`l1_process`
- #D6 LLM prompt scores 字段：§4.3 Stage 4 prompt 改用 `score_dimensions`

**承接到实施阶段 24 条**：
- PM #P3/#P4 口径统一（本次 R2 修订同步统一）
- Tester #T4/#T6/#T7/#T9-#T12（中低）
- DevOps #O4-#O7/#O9-#O11（中低）
- Developer #D3/#D5/#D7-#D10（中低）
- 4 方一致条件 D：实施前必须恢复独立 test DB + `.env.test`

### 收尾
- 关联迭代：v0.6
- 遗留问题/风险：
  - 架构师名下无未完成事项
  - R2 待 PM / Developer / DevOps / Tester 4 方复审
  - 3 项开放问题（外部搜索选型 / X 搜索实现 / 磁盘告警触发线）维持移交实施/DevOps

## 2026-06-12 — v0.6 多阶段连续出场（PRD R2 复审 + 追审 / UI R1 Review / 设计 R1 产出）+ 会话收尾

**本次角色**：架构师
- 动作：复审 + 复审追审 + Review + 产出 + 收尾（同一会话内 4 次出场覆盖 PRD R2 → UI R1 → 设计 R1）
- 涉及文档：
  - `docs/progress/iterations/v0.6-prd.md`（追加 Architect R2 段 + R2 追审段 + Review 状态表更新）
  - `docs/progress/iterations/v0.6-ui-spec.md`（追加 Architect R1 Review 记录 + Review 状态表更新）
  - `docs/progress/iterations/v0.6-design.md`（**新建** 1064 行 7 章 + 4 ADR）
  - `docs/progress/iterations/v0.6.md`（PRD R2 / UI R1 / 设计 R1 阶段状态同步）
  - `docs/progress/INDEX.md`（当前状态推进 + 版本列表 + 最近收尾摘要追加）
  - `docs/progress/roles/architect-current.md`（本文）
  - `docs/progress/roles/architect-archive.md`（移出最旧 1 条 2026-06-06 v0.5 UI 方案 R1 Review）

### 1️⃣ v0.6 PRD R2 复审（✅通过）
- 结论：✅ 通过（含 3 条观察建议，不阻塞定稿）
- R1 11 条意见核验：5 完全关闭 / 3 基本关闭 / 2 合理分流 / 1 降级
- R2 新增内容架构层评估 7 项全部 ✅（状态机 / 错误分类 / 监控段 / 不回归 / 不做项 / 外部依赖边界 / 上传硬约束）

### 2️⃣ v0.6 PRD R2 追审（⚠️ 修订为有条件通过）
- 触发原因：上一段复审专注 R1 关闭核验 + 新增内容高层评估，未对 R2 新增 13 项内容逐条深审
- 结论修订：✅通过 → ⚠️ **有条件通过**
- 新增 9 条意见（4 中 / 5 低）：
  - 中：#A12 §3.2 链接读取超时分类冲突 / #A13 §2.3 L0 状态机不对称（无 retryable_failed）/ #A14 §3.7 AC-30 "或"字 / #A15 §5 库内检索失败行为措辞矛盾
  - 低：#A16-#A20 标签判定规则 / 告警阈值无 placeholder / 并发覆盖在单 Owner 模型下过工程化 / 1MB 文件分辨率上限 / "连续不合法且达上限"放不可重试档逻辑奇怪
- 条件：4 条中严重度建议 R3 修订；如不开 R3 由设计阶段架构师定向回流修订

### 3️⃣ v0.6 UI 方案 R1 Review（⚠️ 有条件通过）
- 结论：⚠️ 有条件通过，10 条意见（2 高 / 5 中 / 3 低）
- 高严重度：
  - #A1 NewsDetail 数据契约与 v0.5 processed_news schema 字段名冲突（importance_score → score_total，tags string[] → 分类对象），1000+ 行历史数据迁移路径未在 UI spec 标注
  - #A2 §4.8 监控菜单角标数据源与 PRD AC-32 新增告警类型覆盖盲区（漏 L0/L1 告警）
- 中严重度：#A3 ContextParagraph.sources 空数组未定 / #A4 SourceLevelStatusCounts 4 字段语义歧义 / #A5 §7 与 §9.2 工作重复 / #A6 "最近 24 小时"硬编码 / #A7 图标加载失败无 SpaceEditDialog 反馈 / #A8 §2.4 与 §2.2 新建组件清单不一致
- 低严重度：#A9 l1-tasks 命名 / #A10 ConfidenceBadge emoji 可访问性 / #A11 §9.2 第 5 条角标轮询无倾向
- 不阻塞观察 7 项：§2.3 22 组件迁移矩阵质量高 / §6.5 StatusBadge 扩展非破坏性 / §3.2 抽屉降级与 AC-25c 严格对齐 / §6.1 字段命名规范 / §9.2 主动列出 5 条设计阶段事项规范

### 4️⃣ v0.6 设计文档 R1 产出（新建 1064 行）
- 结构：7 章 + 4 ADR + 3 项开放问题
  - §1 概述（范围 + 前提 + ADR 索引）
  - §2 数据模型（raw_items × 7 列 / processed_news × 6 列 / channel_spaces × 2 列 / tasks × 3 type / alerts × 4 type / ER 图）
  - §3 API 契约（6 个新 endpoint：`GET /v1/news/:id`、`POST/DELETE /v1/spaces/:id/icon`、`GET /v1/sources/:id/level-status-counts`、`POST /v1/l1-tasks/:task_id/retry`、`GET /v1/global-level-status-counts`；扩展 `/v1/news` `/v1/stats` `/v1/alerts`；TS 类型新增 7 个）
  - §4 核心流程（L0 classifier / L1 processor 5 子阶段 / dispatcher type 分支退避 / 外部服务集成 / 监控告警 / 图标上传 + nginx 配置变更）
  - §5 前端路由变更 + 组件清单
  - §6 schema 迁移 / 零数据迁移 / 代码迁移
  - §7 7 项已知风险 + 4 项 ADR 决策表
- ADR 4 个：ADR-002 raw_items 双字段（拒绝 tasks 单字段 / 独立表）/ ADR-003 jsonb 增量不拆子表 / ADR-004 tasks 复用按 type 分支退避 / ADR-005 后端持久目录（拒绝 bytea / 对象存储）/ ADR-006 ILIKE 不上向量
- 自审修订：删除 §7.1 ADR-007 残缺一行；§5.2 表格 `icon_emoji` → `icon`（与 schema 字段一致）
- 关键决策回应 R1 Review 意见：UI #A1 字段迁移已在 §6.2 v0.5 历史数据兼容性表覆盖 / UI #A2 角标计数口径在 §4.6 已纳入新增告警类型 / UI #A4 已在 §3.2 列出每个 count 的 SQL 语义；PRD R2 追审 #A13 已在 §2.1 通过引入 `retryable` 状态对称化解决；#A12 在 §4.2/§4.3 错误分类表统一为可重试/降级语义

### 收尾
- 关联迭代：v0.6
- 遗留问题/风险：
  - 架构师名下无未完成事项
  - 等待 PM / Developer / DevOps / Tester 4 方完成设计 R1 Review，PM 汇总后产出 R2，届时 Architect 复审
  - 3 项开放问题移交：外部搜索候选选型 → Developer 实现阶段；文件目录权限方案 → DevOps 部署前；磁盘告警触发线 → DevOps 上线后
  - 本次会话内一次性 commit（含 PRD R2 复审 + 追审 + UI R1 Review + 设计文档 R1 + 全部状态同步 + 日志归档）

## 2026-06-09 — v0.6 PRD R1 Review + 架构师日志分页归档 + 会话收尾

**本次角色**：架构师
- 动作：Review（审 PM 的 v0.6 PRD R1）+ 日志分层归档 + 收尾
- 涉及文档：
  - `docs/progress/iterations/v0.6-prd.md`（追加 Architect R1 Review 记录 + Review 状态表更新）
  - `docs/progress/iterations/v0.6.md`（PRD 阶段 Review 结果同步）
  - `docs/progress/roles/architect-current.md`（新建，分层后单文件 559 行 → current 130 行）
  - `docs/progress/roles/architect-summary.md`（新建，长期摘要 + 当前关注点 + 常见 Review 模式 + 风险登记）
  - `docs/progress/roles/architect-archive.md`（新建，旧日志归档）
  - `docs/progress/roles/architect.md`（`git rm` 删除原单文件）
  - `docs/progress/INDEX.md`（角色日志表 architect.md → architect-current.md + architect-summary.md；最近收尾摘要追加本次记录）
- v0.6 PRD R1 Review 结论：❌ **需修改**。共 11 条意见（3 高 / 5 中 / 3 低）。
  - 高严重度：
    - #A1 L0/L1 状态机未定稿（散落多种状态词、无枚举表、无合法转移图、AC-10 回流路径不明）
    - #A2 可重试/不可重试错误未划清（AC-07 把 LLM JSON 错误归入临时错误存疑；AC-08 退避对 429 限速会被打成更严重限速）
    - #A3 4 类外部依赖（LLM/X 搜索/Web 搜索/链接读取）"具体用什么"全甩给设计阶段（产品决策不是架构选型，成本差 1-2 个数量级）
  - 中严重度：
    - #A4 评分 4×(1-5) → 1-10 映射规则未写、精度未定
    - #A5 AC-19 五类标签未定义闭/开集、"处理标签"含义不清、与 `sources.domain_tags/content_topics` 关系不明
    - #A6 补全"来源标签"粒度未定；AC-15 事实/推断/不确定 与 AC-14 来源标签 共存方式未定
    - #A7 库内相关新闻检索算法（ILIKE / 全文 / 向量）会决定是否新增基础设施
    - #A8 空间图标存储位置、MIME 白名单、大小限制、旧文件清理策略均未定
  - 低严重度：
    - #A9 AC-25 mock 措辞与开发期兼容性
    - #A10 AC-23 抽屉是否预留详情页扩展位
    - #A11 §2.6 覆盖页面清单缺与现有 Vue 路由的对齐表
  - 不阻塞观察：v0.5 `tasks` 表 / `raw_items.content` / `processed_news` jsonb 三件套已是良好基线；ADR-001 已落地约束本期 schema 变更走 `db:generate` 增量
  - 整体评价：三条主线技术可行性 OK 无架构红线，但 #A1-#A3 属 PRD 必须收敛的范围决策，设计阶段无法替 PM 决策；#A4-#A8 应在 PRD 给方向
- 日志分页归档结果：current 130 行（< 300 阈值 ✅）+ summary 87 行 + archive 438 行；原 559 行单文件 `git rm` 删除
- 关联迭代：v0.6
- 遗留问题/风险：
  - 架构师名下 R1 无后续动作
  - 等待其余 4 方（UI / Developer / Tester / DevOps）完成 R1 Review，PM 汇总后产出 R2，届时 Architect 复审
  - 本次会话内一次性 commit（含 PRD Review 追加 + 状态表更新 + 迭代记录更新 + 架构师日志分页归档 + INDEX 更新）

## 2026-06-07 — 受保护路径删除 Review：Developer 5 个孤儿前端组件 ✅通过

**本次角色**：架构师
- 动作：受保护路径删除 Review（依据 `docs/baseline/conventions.md §受保护路径删除 Review 门禁`）
- 涉及文档：`docs/progress/ad-hoc/2026-06-07-developer-delete-request-orphan-frontend-components.md`
- 触发：v0.5.1 前端部署阻塞 — Developer 已修复 9 个正用文件的 TS 错误，剩余 17 个错误集中在 5 个孤儿组件（v0.5 重构遗孤，零引用），按门禁规则请求架构师 Review 后由 Developer 执行删除
- 复核方法：
  1. 复核零引用：`src/`、`index.html`、`vite.config.*` + 全 `frontend/` 子串扫描（剔除 node_modules/dist）— 通过
  2. 核查依赖已删 API/类型/字段事实：`lib/api.ts` 已无 `listSubChannels/createSubChannel/updateSubChannel/deleteSubChannel/markVerified`；`lib/types.ts` 已无 `SubChannel/ChannelSpace`；Source 已无 `source_url` — 5 个旧组件 4 个明确引用上述已删导出，第 5 个（SearchFilterBar）整体零挂载属死代码
  3. 核查替代关系一览中的新组件存在 + 真在被引用：4 条全部成立
  4. 本地单分支单 worktree，无编外 PR 风险
- 结论：✅通过。同意 Developer 执行 `git rm` 5 个文件，分独立 commit 提交（与 9 个正用文件修复 commit 拆开），commit message 必须含「删除」字样和删除清单 + Review 留痕（具体格式已在 ad-hoc 文件「执行条件」段落写明）
- 附 1 项观察（不阻塞本次）：`ChannelPills.vue` 实际全仓零引用（NewsPage 中频道筛选已完全内联 `.cc-pill`），与本次待删的 `ChannelFilter.vue` 同属孤儿；但不在本次清单内，建议 Developer 另起一次受保护路径删除 Review 处理，保持本次删除原子可追溯
- 关联事件：v0.5.1 前端部署阻塞解除路径上的关键门禁；INDEX P0 待办状态推进
- 遗留问题/风险：架构师名下无后续动作；下一步 Developer 执行删除并验证 `npm run build` 通过，移交 DevOps 部署

## 2026-06-06 — 会话收尾（v0.5 全流程完成）

**本次角色**：架构师
- 动作：收尾（v0.5 架构师全部工作闭环）
- 今日出场汇总（6 次，覆盖全部 3 个阶段）：

| 时序 | 出场 | 产出 |
|------|------|------|
| 1 | v0.5 PRD R1 Review | 9 条意见（3高/4中/2低）— 状态模型、UNIQUE 约束、m:n 关联 |
| 2 | v0.5 PRD R2 Review | ✅通过 — 9 条全部核验 |
| 3 | v0.5 UI 方案 R1 Review | 5 条意见（1高/2中/2低）— API 契约缺失最大缺口 |
| 4 | v0.5 UI 方案 R2 Review | ✅通过 — 5 条全部核验 + API 契约补全 |
| 5 | v0.5 设计文档 R1 产出 + R2 修订 | 13 表 DDL + 6 组 20+ 端点 + 12 条 R1 意见关闭 → 已定稿 |
| 6 | v0.5 实现 R1/R2 Review | #I1 lifecycleStatus bug 发现 + 修复核验 → ✅通过 |

- v0.5 全部门禁：PRD ✅ → UI 方案 ✅ → 设计 ✅ → 实现 ✅ → 测试 ✅
- 架构师名下无未完成事项
- 下一步：DevOps 本地部署 + Owner 手工验证页面

## 2026-06-06 — v0.5 实现 R2 复审 通过

**本次角色**：架构师
- 动作：Review（审 Developer 的 v0.5 实现 R2）
- 涉及文档：`server/src/api/routes/sources.ts`、`server/src/__tests__/`
- 结论：通过。R1 全部 2 条意见核验通过：#I1 lifecycleStatus bug 已修复、#I2 路径 B 测试已补充（alert 流转 5 条 + channel migrate 2 条 + identity 修改 2 条）
- 53/53 测试通过。实现与设计文档一致，架构边界保持良好。
- 关联迭代：v0.5

## 2026-06-06 — v0.5 实现 R1 Review

**本次角色**：架构师
- 动作：Review（审 v0.5 全栈实现 R1，base=c70a5c8 head=9b83263）
- 涉及文档：`server/src/db/schema.ts`、`server/src/api/routes/`、`server/src/worker/`、`server/src/__tests__/`
- 结论：需修改。共 2 条意见（1 中 + 1 低）。
  - #I1：sources.ts:152 `lifecycleStatus` 未定义，路径 B auto-add 阻塞
  - #I2：路径 B auto-add 无测试覆盖
- 设计符合度：Schema/API/Worker 与设计文档完全一致。X Stream Manager 完整、channel 迁移事务正确、processor fan-out 到位。
- 关联迭代：v0.5

## 2026-06-06 — v0.5 设计文档 已定稿

**本次角色**：架构师
- 动作：定稿（PM/Developer/DevOps 三方 R2 全部通过）
- 涉及文档：`docs/progress/iterations/v0.5-design.md`
- 12 条 R1 意见全部在 R2 中关闭，3/3 Review 通过。设计阶段完成。
- v0.5 当前进度：PRD ✅ → UI 方案 ✅ → 设计 ✅，下一步进入实现阶段
- 关联迭代：v0.5

## 2026-06-06 — v0.5 设计文档 R2 修订

**本次角色**：架构师
- 动作：修改（响应 PM 3 条 + Developer 5 条 + DevOps 4 条 R1 Review）
- 涉及文档：`docs/progress/iterations/v0.5-design.md`、`docs/progress/iterations/v0.5.md`
- 修订覆盖（12 条全部关闭）：
  - 数据模型：#D1 部分唯一索引（阻断）
  - API 合约：DELETE channels action 参数、GET positions channel_id 语义、DELETE→PATCH positions、operational_status CTE、PUT identity 补偿
  - 核心流程：§4.6 频道删除迁移逻辑（新增）、§4.2 失败计数对齐 PRD、§4.3 Stream/systemd 区分
  - 迁移：§6.2 清理脚本改旧表名、§6.3 环境变量汇总（新增）
- 下一步：PM、Developer、DevOps 复审 R2

## 2026-06-06 — v0.5 设计文档 R1 产出

**本次角色**：架构师
- 动作：产出（基于定稿 PRD + UI 方案，创建 v0.5 技术设计文档）
- 涉及文档：`docs/progress/iterations/v0.5-design.md`（新建）、`docs/progress/iterations/v0.5.md`
- 产出覆盖：
  - 数据模型：10 表变更 + 3 新表。sub_channels→channels 重命名、sources 大幅扩展（双维度状态 + 10+ 新字段）、display_positions 替代 channel_sources、news_positions m:n 关联、alerts scope 解耦、source_identity_history
  - 5 项设计决策：operational_status 动态计算、软删除快照、dedup_key 告警去重、debounced 规则同步、事务包裹 DELETE 清理
  - API 合约：6 组 20+ 端点重写，3 个关键响应 Shape
  - 核心流程：Worker per-source 调度、X Stream Manager、告警生命周期、自动启停
  - 数据清理脚本：FK 依赖顺序 + 事务回滚 + pg_dump 前置
- Review 方：PM、Developer、DevOps
- 关联迭代：v0.5

## 2026-06-06 — v0.5 UI 方案 R2 Review

**本次角色**：架构师
- 动作：Review（审 UI 的 v0.5 UI 方案 R2）
- 涉及文档：`docs/progress/iterations/v0.5-ui-spec.md`、`docs/progress/iterations/v0.5.md`
- 结论：通过。R1 全部 5 条意见核验通过：#A1 API 契约已补充（§10，6 组 20+ endpoint）、#A2 身份编辑约束已定义、#A3 约束归属已标注、#A4 mini 模式已定义、#A5 由 API 契约覆盖。
- R2 全部 8 条意见（Architect 4 + Developer 4）正确关闭。UI 方案达到设计阶段准入标准。
- 关联迭代：v0.5

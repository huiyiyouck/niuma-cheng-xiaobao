# 架构师工作日志 — 归档

> 分层策略见 `docs/baseline/context-policy.md`。
> 本文件是按需查询归档。启动默认 **不读**本文件；只在排查历史决策、追溯某次 Review 结论时按需 grep。
> 最近 10 条日志在 `architect-current.md`，长期摘要在 `architect-summary.md`。
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

## 2026-06-06 — v0.5 UI 方案 R1 Review

**本次角色**：架构师
- 动作：Review（审 UI 产出的 v0.5 UI 方案 R1）
- 涉及文档：`docs/progress/iterations/v0.5-ui-spec.md`、`docs/progress/iterations/v0.5.md`
- 结论：需修改。共 5 条意见（1 高 + 2 中 + 2 低）。
  - 高：#A1 缺少 API 契约清单，设计阶段无法接续
  - 中：#A2 Source 身份修改 UI 未体现 PRD 状态约束、#A3 删除最后空间约束 PRD 未定义
  - 低：#A4 浏览页 mini Pill 交互未展开、#A5 SourceCard 抓取条数数据来源不明
- PRD 覆盖：9 个功能章节全部核验通过。路由设计合理。
- 关联迭代：v0.5
- 遗留问题/风险：等待 UI 汇总 Architect/Developer R1 反馈后提交 R2。

## 2026-06-06 — v0.5 PRD R2 Review

**本次角色**：架构师
- 动作：Review（审 PM 的 v0.5 PRD R2）
- 涉及文档：`docs/progress/iterations/v0.5-prd.md`、`docs/progress/iterations/v0.5.md`
- 结论：通过。R1 全部 9 条意见核验通过：
  - 3 项高：状态模型双维度拆分 ✅、UNIQUE 约束调整列 §7 ✅、m:n 关联表列 §7 ✅
  - 4 项中：source_states/fetch_policy 迁移列 §7 ✅、alerts 解耦列 §7 ✅、identity_history 纳入范围+列 §7 ✅、快照内容已定义 ✅
  - 2 项低：sub_channels 重命名列 §7 ✅、fetch_policy 迁移列 §7 ✅
- R2 新增内容（pg_dump 备份、事务回滚、57 条 AC、并发风险登记）无架构风险。
- PRD 达到设计阶段准入标准。下一步：等待 PM 在 UI 方案阶段前委托 UI 产出方案，或等待 Developer/Tester/DevOps 完成 R2 Review 后 PRD 正式定稿。
- 关联迭代：v0.5

## 2026-06-06 — v0.5 PRD R1 Review

**本次角色**：架构师
- 动作：Review（审 PM 的 v0.5 PRD R1）
- 涉及文档：`docs/progress/iterations/v0.5-prd.md`、`docs/progress/iterations/v0.5.md`
- 结论：需修改。共 9 条意见（3 高 + 4 中 + 2 低）。
  - 高严重度：#A1 Source 状态模型拆分（与 UI/Developer/Tester 同源）、#A2 展示位置 UNIQUE 约束冲突、#A3 新闻 m:n 关联表缺失
  - 中严重度：#A4 source_states 移至 Source 级、#A5 alerts 空间解耦、#A6 source_identity_history 缺失、#A7 历史位置快照未建模
  - 低严重度：#A8 sub_channels → channels 重命名、#A9 fetch_policy 移至 Source 级
- 整体评价：三条主线方向正确，但当前 schema 与 PRD 描述的产品行为存在 3 项结构性冲突（状态模型、唯一约束、m:n 关联），设计阶段开始前必须修正。
- 关联迭代：v0.5
- 遗留问题/风险：等待 PM 汇总全部 5 方 R1 Review 后提交 R2。

## 2026-05-31 — 会话收尾（架构师整日 3 次出场汇总）

**本次角色**：架构师
- 动作：收尾（会话结束，今日架构师工作汇总）
- 涉及文档：docs/progress/roles/architect.md、architect-corrections.md
- 今日产出汇总（3 次出场 + 3 个 commit）：

| 时序 | 出场 | commit | 产出 |
|------|------|--------|------|
| 1 | DevOps 数据库迁移机制提案 Review R1 + ADR-001 落档 | `f512dee` | 5 项决策（工具流/路径/baseline/down.sql/migrate 位置）+ 4 项配套（A1-A4） + ADR-001 新建（项目首条） |
| 2 | #B2 评估（两步查询拆 FOR UPDATE） | `6a8c3e5` | 五维对比 → 保留 `FOR UPDATE OF cs` 不改 |
| 3 | Step 2 Architect Review R2 | `ec10001` | 4 项 Developer 微调全部接受 + ADR-001 追加实操修订附注 |

- 整条 P2「数据库迁移机制规范化」的架构师动作全部关闭；最终由 DevOps Step 3 全线落地（commit `f5d3c9a`），整条待办从 INDEX 移除
- 关联事件：v0.4 #B1 教训完整消化 — 从事故 → 选型 → 落地 → 验证 → 操作手册，闭环
- 新增基线产出：`docs/baseline/architecture.md`（项目 ADR 文档，首条 ADR-001 已采纳）
- 纠错记录：追加「会话进行中未主动重读 INDEX」一条，与 PM 同期纠错同类
- 遗留问题/风险：
  - **架构师名下无未完成事项**
  - 可选小清理 `db/schema.sql` 归档归 Developer 下次顺手做（已挂建议，非阻塞）
  - 候选 v0.5 X/Twitter Filtered Stream 材料未走正式 Review，**等待用户启动 v0.5 时由 PM 和架构师接管**

## 2026-05-31 — Step 2 Architect Review R2 ✅ 通过 + ADR-001 实操修订附注

**本次角色**：架构师
- 动作：Review（Developer Step 2 实施复审）+ ADR-001 附注更新
- 涉及文档：
  - `docs/baseline/architecture.md`（ADR-001 追加「实操修订附注（2026-05-31）」+ 索引表状态更新）
  - `docs/progress/ad-hoc/2026-05-31-devops-proposal-db-migration-mechanism.md`（追加 Architect Review R2 记录）
  - `docs/progress/INDEX.md`（跨任务待办 P2 状态更新）
- 触发：Developer 在 §Step 2 末尾留 2 项待 Architect 确认 + 1 项小清理待我决定
- 4 项微调评估结论：
  - **#1 drizzle-kit 0.30.6 → 0.31.10**：✅ 接受。工具链兼容性强制要求，新增约束「drizzle-kit 与 drizzle-orm 必须保持版本约束」进 Step 3 操作手册
  - **#2 baseline 改用 generate 替代 introspect（决策 3 微调）**：✅ 接受。决策 3 本意是"baseline 与生产对齐"，introspect 是手段不是目标；现场核验已确认 schema.ts ≡ 生产 schema 故两条路径等价
  - **#3 baseline 吸收 v0.4 无独立 0001（A3 微调）**：✅ 接受。A3 的真实担忧是「复制粘贴造成双真源残留」，Developer 当前做法根本不存在该动作。"v0.3 baseline"在历史上从未存在过，强拆是形式没价值。**约定：v0.5 起按 db:generate 产 0001/0002……增量；baseline 永不再 regenerate**
  - **#4 根目录 db/schema.sql 保留**：🟡 建议 Developer 下次经过时 `git mv` 到 `_legacy/`，**优先级低，不阻塞 Step 3**
- ADR-001 处理：正文不动（冻结历史规则），追加「实操修订附注」 + 索引表状态改为「已采纳（含 2026-05-31 实操修订附注）」
- baseline 核验：9 表 + 14 外键 + 10 索引 + 1 COMMENT 齐备，质量高
- 关联事件：v0.4 #B1 教训消化 + DevOps 提案 P2 Step 2 闭环
- 遗留问题/风险：
  - **Step 3 → DevOps**（不归我）：A2 移依赖 + systemd unit 改造 + baseline 首次部署 `__drizzle_migrations` 注入 + 操作手册（含 drizzle-kit/orm 版本约束章节）
  - 可选小清理 `db/schema.sql` 归档，等 Developer 下次经过

## 2026-05-31 — #B2 评估（两步查询拆 FOR UPDATE 替代方案）

**本次角色**：架构师
- 动作：评估（v0.4 测试报告 #B2「FOR UPDATE + LEFT JOIN 冲突」修复方案的替代选项评估）
- 涉及文档：
  - `docs/progress/INDEX.md`（跨任务待办行追加 #B2 评估结论）
- 评估范围：`server/src/api/routes/sources.ts:155-194`（DELETE 路由），项目内 `FOR UPDATE` 仅此一处 + worker dispatcher（无 LEFT JOIN 不相关）
- 结论：✅ **保留当前实现**（方案 X：`FOR UPDATE OF cs`），不采纳测试报告建议的方案 Y（两步查询）
- 五维对比：
  - 正确性：X/Y 等价
  - TOCTOU 防护：X/Y 等价（Y Step 1 锁定 + Step 2 同事务读）
  - SQL 清晰度：Y 略胜(自明），X 需注释（PG 方言）
  - 网络往返：X 1 次 / Y 2 次
  - 可移植性：Y 略胜，但 **ADR-001 已锁定 PG + Drizzle 栈，此论点失效**
- 决策理由：
  - 当前实现已通过 Developer R1 + Architect 实现 R2 + Tester T6.3 三道审核，**无 bug**
  - 方案 Y 仅是改写法，无实质优势
  - "SQL 方言不熟"是注释能解决的问题，不值得重写整段
- 附带建议（非必须，归 Developer 决定是否做）：把 `sources.ts:161` 注释从「FOR UPDATE 锁定 channel_sources 行」加强成说明 `OF cs` 的含义（避开 LEFT JOIN 可空侧、即 #B2 根因），方便后来者一眼看懂
- 安全边界：不直接改 Developer 名下的代码，建议写进评估结论由 Developer 决定
- 关联事件：v0.4 测试报告 #B2 + INDEX P2 跨任务待办的 #B2 子项
- 遗留问题/风险：无。INDEX P2 待办的 #B2 子项至此关闭；剩余动作（Step 2 Developer + Step 3 DevOps）不归我

## 2026-05-31 — Review DevOps 数据库迁移机制提案 + ADR-001 落档

**本次角色**：架构师
- 动作：Review（指定 Review 方：审 DevOps 数据库迁移机制规范化提案）+ 首条 ADR 产出
- 涉及文档：
  - `docs/progress/ad-hoc/2026-05-31-devops-proposal-db-migration-mechanism.md`（追加 Architect Review 记录区）
  - `docs/baseline/architecture.md`（**新建**，项目首条 ADR）
  - `docs/progress/INDEX.md`（非迭代工作行 + 跨任务待办行状态更新）
- 结论：✅通过。DevOps 调研充分，5 项待决策事实层已收敛，逐条拍板：
  - **决策 1（工具流）**：方案 A `drizzle-kit generate + journal`（拒 B push 无幂等不能上部署链；拒 C 手写 SQL 双真源是 #B1 根因）
  - **决策 2（迁移路径）**：`server/drizzle/`（与 drizzle.config.ts 默认 out 对齐）
  - **决策 3（v0.3 baseline）**：introspect + 双向对账。**现场核验已确认生产 9 表逐列对齐 schema.ts**，baseline 风险归零
  - **决策 4（down.sql）**：分类强制（破坏性改动 + 数据迁移必配，ADD COLUMN/INDEX 不强制）
  - **决策 5（migrate 位置）**：仅部署机 systemd `ExecStartPre`
- 配套补充意见（DevOps 未覆盖，本次追加）：
  - A1：package.json 加 `db:generate` + `db:migrate`，`db:push` 仅本地开发
  - A2（**Step 3 硬前置**）：drizzle-kit 从 devDependencies 移到 dependencies，否则生产 `npm install --production` 缺失会让 ExecStartPre 直接失败
  - A3：Step 2 生成 0001 用 generate 自动产出后再与 v0.4.sql 比对，不能复制粘贴
  - A4：操作手册位置定为 `docs/knowledge/devops/db-migration-handbook.md`
  - systemd 防护：unit 加 `StartLimitInterval=60` + `StartLimitBurst=3`
- 关联事件：v0.4 测试报告 #B1「alerts.status 列缺失」根因消化
- 遗留问题/风险：
  - **#B2**（两步查询拆 FOR UPDATE）归我评估但是独立查询层议题，本次不处理，后续另开会话看 `sources.ts:162` 现状
  - Step 2 Developer 接手时仍需对账 introspect 与 schema.ts，以 schema.ts 为准
  - 团队遗忘 `db:generate` 一步的风险靠开发文化 + code review 兜底，未来上 CI 可加 `drizzle-kit check`

## 2026-05-30 — v0.4 收尾

**本次角色**：架构师
- 动作：收尾（会话结束，今日工作归档）
- 涉及文档：docs/progress/INDEX.md、docs/progress/iterations/v0.4.md
- 今日产出汇总：
  - PRD Review × 2（R1 8条 + R2 ✅通过）
  - UI 规范 Review × 2（R1 3条 + R2 ✅通过）
  - 技术设计产出 + 修订（7端点 + RSS Fetcher + 状态机 + 前端架构，R2 4条修正）
  - 实现 Review × 2（R1 16项逐条验证 + R2 ✅通过）
  - 总计产出/Review 8 次，发现并关闭意见 15+ 条
- v0.4 状态：PRD ✅ / UI ✅ / 设计 ✅ / 实现 ✅ — 四阶段全部定稿，已部署
- 遗留问题/风险：无

## 2026-05-30 — v0.4 实现 R2 复审

**本次角色**：架构师
- 动作：Review（审全栈开发的 v0.4 实现 R2 修复）
- 涉及文档：docs/progress/iterations/v0.4.md
- 结论：✅通过。R1 3 条意见全部正确修复：#1 AlertList.vue → requestJson、#2 sources.ts → FOR UPDATE 事务、#3 ToastContainer → transition-group。16 项设计符合度全部通过。
- 关联迭代：v0.4
- 遗留问题/风险：无。实现阶段已定稿

## 2026-05-30 — v0.4 实现 R1 Review

**本次角色**：架构师
- 动作：Review（审全栈开发的 v0.4 后端+前端实现）
- 涉及文档：docs/progress/iterations/v0.4-design.md、docs/progress/iterations/v0.4.md
- 结论：❌需修改。设计符合度 16 项逐条验证，15 项通过 + 1 项偏差（Source 删除缺 FOR UPDATE）。确认 PM 全部 3 条意见。
  - #1 🔴阻断：AlertList.vue:28 原生 fetch() → 丢失 admin token
  - #2 🟠中等：sources.ts:162 SELECT 缺 FOR UPDATE + 事务
  - #3 🔵建议：Toast 退出动画未实现
- 整体评价：实现质量高，设计符合度 94%（15/16），架构边界保持良好。修正 #1 #2 后可通过。
- 关联迭代：v0.4
- 遗留问题/风险：等待开发 R2 修复

## 2026-05-30 — v0.4 设计阶段完成

**本次角色**：架构师
- 动作：收尾（设计阶段全部定稿）
- 涉及文档:docs/progress/iterations/v0.4-design.md、docs/progress/iterations/v0.4.md、docs/progress/INDEX.md
- 结论：✅ v0.4 设计阶段已全部完成。三个阶段全部定稿：
  - PRD：R1→R2，架构师 8 条 + 全栈开发 11 条，全部关闭
  - UI 规范：R1→R2，架构师 3 条 + 全栈开发 5 条，全部关闭
  - 技术设计：R1→R2，全栈开发 4 条 + PM 通过，全部关闭
- 关联迭代：v0.4
- 遗留问题/风险：无。架构师工作已全部完成，等待 Developer 启动实现阶段

## 2026-05-30 — v0.4 设计文档 R2 修订

**本次角色**：架构师
- 动作：修改（响应全栈开发 R1 Review 4 条意见）
- 涉及文档：docs/progress/iterations/v0.4-design.md、docs/progress/iterations/v0.4.md
- 结论：✅R2 已修订。接受全栈开发全部 4 条意见（2中等+2轻微），全部在正文中修正：
  - #D1 路由：静态 import → 动态 `() => import()`（§5.1）
  - #D2 HTTP：`createApiClient`+interceptor → `requestJson()` 函数内追加 token（§5.4）
  - #D3 搜索 SQL：`$3::uuid[]` + `ANY()` 多子频道支持（§4.5）
  - #D4 delete-preview：补充 source_states JOIN 完整 SQL（§3.3.2）
- 关联迭代：v0.4
- 遗留问题/风险：等待 PM 和全栈开发 R2 Review

## 2026-05-30 — v0.4 设计文档产出

**本次角色**：架构师
- 动作：产出（基于定稿 PRD + UI 规范 + 现有代码基线，编写 v0.4 技术设计文档）
- 涉及文档：docs/progress/iterations/v0.4-design.md、docs/progress/iterations/v0.4.md
- 产出覆盖：
  - 数据库变更：alerts.status 列
  - API 设计：7 个新端点（PUT channel-spaces/:id、GET delete-preview、DELETE channel-spaces/:id、DELETE channel-sources/:id、PUT sub-channels/reorder、PATCH alerts/:id、POST alerts/acknowledge-all）+ 3 个增强（搜索参数、Source 删除绑定检查、Admin Guard 扩展）
  - 核心流程：RSS Fetcher（rss-parser + 游标复用 source_states.cursor）、告警状态机、频道删除/解绑/搜索/日志路径修复
  - 前端架构：路由变更（/news/admin/logs）、组件树（1保7改2重5新5废1迁）、Toast/Modal 模块级单例设计、HTTP 客户端 token 注入、CSS 变量渐进迁移、3 个新依赖
  - 设计决策：RSS 解析库 rss-parser、Toast/Modal 方案 B、搜索 ILIKE、ADMIN_PROTECT_READS 默认 false
- 关联迭代：v0.4
- 遗留问题/风险：等待 PM 和全栈开发 Review

## 2026-05-30 — v0.4 UI 规范 R2 Review

**本次角色**：架构师
- 动作：Review（审 PM 的 v0.4 UI 规范 R2 修订版）
- 涉及文档：docs/progress/iterations/v0.4-ui-spec.md、docs/progress/iterations/v0.4.md
- 结论：✅通过。R1 全部 3 条意见在 R2 正文中正确关闭。R2 新增内容（§3.7 告警状态管理、§8.1 CSS 迁移策略、§11 组件迁移表）架构合理，无新增风险。UI 规范已达到设计阶段准入标准。
- 关联迭代：v0.4
- 遗留问题/风险：无。等待全栈开发 R2 Review 完成后 UI 规范定稿，进入技术设计阶段

## 2026-05-30 — v0.4 UI 规范 R1 Review

**本次角色**：架构师
- 动作：Review（审 PM 的 v0.4 UI 规范文档）
- 涉及文档：docs/progress/iterations/v0.4-ui-spec.md、docs/progress/iterations/v0.4.md
- 结论：❌需修改。共 3 条意见：
  - 1 项阻断：#1 告警状态管理 UI 缺失——PRD 3.2.5 定义了 active/acknowledged/resolved 三状态 + PATCH/POST 端点，但 UI 规范仅覆盖了静态告警内联条，缺少状态标签样式、单条操作按钮、批量标记按钮、AlertList.vue 改造方案
  - 2 项建议：#2 CSS 变量已在 §8 定义但正文未引用，#3 WebSocket 状态指示器可标注来源
- 整体评价：PRD 覆盖良好，所有组件均有状态覆盖，组件接口清晰。仅告警管理 UI 缺失为 PRD 覆盖缺口，其余不阻塞。
- 关联迭代：v0.4
- 遗留问题/风险：等待 PM 在 R2 补充告警管理 UI 规范

## 2026-05-30 — v0.4 设计阶段启动检查

**本次角色**：架构师
- 动作：设计阶段启动检查
- 涉及文档：docs/progress/INDEX.md、docs/progress/iterations/v0.4-prd.md、docs/progress/iterations/v0.4.md
- 结论：⏸️ 暂缓。PRD 已定稿 ✅，但 UI 阶段状态为"待产出"（既无定稿也无跳过标记），不能直接进入技术设计。
  - v0.4 PRD 已包含原型 HTML + 设计语言规范，但缺少独立的 UI 规范文档
  - 参考 v0.2 流程：PM → UI 规范文档 → 架构师+开发 Review → 设计阶段
  - 用户确认需要独立 UI 规范文档,不跳过
- 关联迭代:v0.4
- 遗留问题/风险：等待 PM 产出 `docs/progress/iterations/v0.4-ui-spec.md`，UI 规范定稿后架构师继续技术设计

## 2026-05-30 — v0.4 PRD R2 Review

**本次角色**：架构师
- 动作：Review（审 PM 的 v0.4 PRD R2 修订版）
- 涉及文档：docs/progress/iterations/v0.4-prd.md、docs/progress/iterations/v0.4.md
- 结论：✅通过。R1 全部 8 条意见在 R2 正文中正确关闭。R2 新增内容（3 个依赖、2 个端点、告警状态机、Toast/Modal 注入方式）无架构风险。PRD 已达到设计阶段准入标准。
- 关联迭代：v0.4
- 遗留问题/风险：无。等待全栈开发 R2 Review 完成后 PRD 定稿

## 2026-05-30 — v0.4 PRD R1 Review

**本次角色**：架构师
- 动作：Review（审 PM 的 v0.4 PRD 初版）
- 涉及文档：docs/progress/iterations/v0.4-prd.md、docs/progress/iterations/v0.4.md
- 结论：❌需修改。共 8 条意见：
  - 2 项阻断：#1 RSS Fetcher 接口契约不完整（type 标识值未定、validate 验证策略未明确）、#2 频道空间 DELETE 级联遗漏 alerts 表
  - 4 项中等：#3 ILIKE 搜索性能边界需明确、#4 前端 token 存储安全性（localStorage XSS 风险）、#5 ADMIN_PROTECT_READS 作用域未定义、#6 Source 删除前绑定检查 TOCTOU 窗口
  - 2 项建议：#7 日志路径修复措辞修正、#8 子频道排序字段已验证存在（sort_order）
- 整体评价：PRD 架构一致性较好，RSS 注册方式/API 命名/DB 变更最小化/游标设计均与现有架构一致。技术可行性无阻塞，阻断项属文档完整性范畴。
- 关联迭代：v0.4
- 遗留问题/风险：等待 PM 在 R2 中回应阻断项后进入设计阶段

## 2026-05-27 — v0.3 实现 R2 Review

**本次角色**：架构师
- 动作：Review（审全栈开发的 R2 修复）
- 涉及文档：docs/progress/iterations/v0.3.md
- 结论：✅通过。R1 全部 5 项均已正确修复——注册表全链路接入（fetchAndIngest+processOne+verifyFetch 三处均用 find()）、Worker 模块拆为 5 个独立文件、2 个索引已补、SSRF 防护已加、Zod 校验生效。Worker 可扩展架构目标已兑现。
- 关联迭代：v0.3
- 遗留问题/风险：无

## 2026-05-27 — v0.3 实现 R1 Review
- 本次角色：架构师
- 动作：Review（审全栈开发的 v0.3 Node.js 迁移实现）
- 涉及文档：docs/progress/iterations/v0.3.md
- 结论：❌需修改。3 项需修：①Fetcher 注册表写了但 dispatcher 没调（架构阻断，新增数据源仍需改 3 处 hardcode）②Worker 模块未按评估方案拆分为独立文件 ③Drizzle schema 缺两个索引。2 项建议：source-detector 加 URL scheme 白名单防 SSRF、news.ts 排序参数用 Zod 校验。API 层翻译质量高，路由/Schema/中间件与 Python 一致。
- 关联迭代：v0.3
- 遗留问题/风险：等待开发 R2 修复

## 2026-05-27 — v0.3 技术预研评估 已定稿
- 本次角色：架构师
- 动作：产出 + 定稿（PM Review ✅通过 R1）
- 涉及文档：docs/progress/iterations/v0.3-tech-eval.md
- 结论：v0.3 后端 Python→Node.js 迁移技术上可行。推荐 Fastify + Zod + Drizzle + 同进程 Worker，Fetcher 插件化接口 + 注册表 + Dispatcher 分发，新增数据源写一个文件即可。砍掉 WebSocket（~117行无用户价值链路）。PM 建议在详细设计阶段产出 API 契约验证清单（边界case对照），接受，纳入后续设计。
- 关联迭代：v0.3（预研阶段）
- 遗留问题/风险：无

## 2026-05-24 — v0.2 实现 R4 Review
- 本次角色：架构师
- 动作：Review（审全栈开发的 R3 修复——verified 状态绑定按钮）
- 涉及文档：docs/progress/iterations/v0.2.md
- 结论：✅通过。R3 #1 已正确修复——verified 行"验证"→"绑定" + emit('bind') → BindSourceModal 预填。组件通信模式合理，向后兼容，verified→active 链路完整。v0.2 实现阶段全部完成。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 实现 R3 Review
- 本次角色：架构师
- 动作：Review（审全栈开发的 v0.2 实现 R3——对齐定稿 UI 规范与设计文档）
- 涉及文档：docs/progress/iterations/v0.2.md
- 结论：❌需修改。1 项与 PM 一致（#1 verified 状态缺少"绑定"按钮）。其余 23 项 UI 规范对照全部通过，后端 API 变更（detect-type 路由位置、多选 OR 解析、sub_channel_id 类型兼容）架构合理。
- 关联迭代：v0.2
- 遗留问题/风险：等待开发修复 #1 后进入 R4

## 2026-05-24 — v0.2 设计文档 R3 定稿
- 本次角色：架构师
- 动作：收尾（PM + 全栈开发 R3 Review 双通过）
- 涉及文档：docs/progress/iterations/v0.2-design.md、docs/progress/iterations/v0.2.md
- 结论：R3 修订（纳入已定稿 UI 规范到头部元数据）获 PM 和全栈开发双通过。v0.2 设计阶段全部完成，设计文档最终定稿。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 设计文档 R3 修订（纳入已定稿 UI 规范）
- 本次角色：架构师
- 动作：修改（将已定稿 v0.2-ui-spec.md 正式纳入设计文档头部元数据）
- 涉及文档：docs/progress/iterations/v0.2-design.md、docs/progress/iterations/v0.2.md
- 结论：R3 修订完成，进入 Review。变更：头部新增"关联 UI 规范"字段指向已定稿 UI 规范文档；PM/Dev Review 状态重置为 ⏳待审。7.3 节已有 UI 规范引用，本次仅补头部元数据。
- 关联迭代：v0.2
- 遗留问题/风险：等待 PM 和全栈开发 R3 Review
- 本次角色：架构师
- 动作：Review（审 PM 的 v0.2-ui-spec.md R2 修订）
- 涉及文档：docs/progress/iterations/v0.2-ui-spec.md（Review 追加于此文件末尾）
- 结论：✅通过。R1 全部 9 项意见（全栈开发 3 项需修改 + 6 项建议改进 + 架构师 A1-A4 确认）均在 R2 正文中正确关闭。UI 规范文档已达到实现阶段参考标准。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 设计 R3 UI 规范 Review（已修正目录位置）
- 本次角色：架构师
- 动作：Review（审 PM 产出的前端 UI 规范文档 v0.2-ui-spec.md + HTML mockup）
- 涉及文档：docs/progress/iterations/v0.2-ui-spec.md（Review 追加于此文件末尾）、docs/progress/iterations/v0.2.md
- 结论：❌需修改（R1）。PRD 覆盖和设计一致性通过，但全栈开发 #1-#3 从架构角度确认需修正。Review 初版误写入 v0.2.md，已迁移到 v0.2-ui-spec.md 末尾（产出文档 Review 应追加到产出文档本身）。
- 关联迭代：v0.2
- 遗留问题/风险：无。等待 PM 汇总 R1 意见后产出 R2。

## 2026-05-24 — v0.2 实现 R2 Review
- 本次角色：架构师
- 动作：Review（审全栈开发的 v0.2 实现 R2 修订）
- 涉及文档：docs/progress/iterations/v0.2.md
- 结论：✅通过。R1 两项意见均已正确修复——Request 导入已追加、_source_out_legacy 已删除。实现阶段完成。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 实现 R1 Review
- 本次角色：架构师
- 动作：Review（审全栈开发的 v0.2 实现 R1）
- 涉及文档：docs/progress/iterations/v0.2.md
- 结论：❌需修改。1 项阻断（与 PM 一致——app/main.py 缺少 Request 导入导致 NameError）+ 1 项轻微（_source_out_legacy 中 d["name"] 赋值被 Pydantic v2 静默丢弃，属死代码）。设计-实现一致性检查 25 项全部通过。
- 关联迭代：v0.2
- 遗留问题/风险：等待开发修复阻断项后进入 R2

## 2026-05-24 — v0.2 设计文档 R2 定稿
- 本次角色：架构师
- 动作：收尾（PM + 全栈开发 R2 Review 双通过）
- 涉及文档：docs/progress/iterations/v0.2-design.md、docs/progress/iterations/v0.2.md
- 结论：v0.2 设计阶段完成，文档已定稿。R2 修订（9项）获 PM 和全栈开发双通过，可进入实现阶段。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 设计文档 R2 修订
- 本次角色：架构师
- 动作：修改（响应 PM R1 + 全栈开发 R1 Review 意见）
- 涉及文档：docs/progress/iterations/v0.2-design.md、docs/progress/iterations/v0.2.md
- 结论：R2 修订完成，共 9 项修改：日志时间范围过滤（PM#1+Dev#1）、域名匹配修正（Dev#2）、空字符串 source_url 检查（Dev#5）、verified→active 触发点（PM#2）、VerifyItem 映射对齐（Dev#3）、TimedRotatingFileHandler 替换 FileHandler（PM#3+Dev#4+Dev#6）、_source_out_legacy 适配器（Dev#7）、9.4 节更新、文档元数据更新。进入 R2 Review。
- 关联迭代：v0.2
- 遗留问题/风险：等待 PM 和全栈开发 R2 Review

## 2026-05-24 — v0.2 设计文档初版产出
- 本次角色：架构师
- 动作：产出
- 涉及文档：docs/progress/iterations/v0.2-design.md、docs/progress/iterations/v0.2.md
- 结论：产出完成，进入 Review。覆盖数据库变更（name→display_name 重命名 + 新增 status/source_url/last_verified_at/verify_error 列）、Source CRUD API、验证/标记端点、统计端点、Admin 日志端点、Worker 清理（删5个旧抓取器+scheduler JOIN过滤+默认NonRetryableError）、API 日志系统、前端数据层适配
- 关联迭代：v0.2
- 遗留问题/风险：设计文档待 PM 和全栈开发 Review

## 2026-05-24 — v0.2 PRD R2 Review
- 本次角色：架构师
- 动作：Review（审 PM 的 v0.2 PRD R2 修订）
- 涉及文档：docs/progress/iterations/v0.2-prd.md、docs/progress/iterations/v0.2.md
- 结论：✅通过。R1 全部 13 条意见已在 R2 正文中关闭。发现 1 处跨章节不一致（3.2.3 vs 6.3 数据清理措辞），建议修正后进入设计阶段。字段策略措辞有轻微歧义（两条方案并列），建议清理。
- 关联迭代：v0.2
- 遗留问题/风险：无阻塞项；6.3/5.1 措辞对齐后即可设计

## 2026-05-24 — v0.2 PRD R1 Review
- 本次角色：架构师
- 动作：Review（审 PM 的 v0.2 PRD）
- 涉及文档：docs/progress/iterations/v0.2-prd.md、docs/progress/iterations/v0.2.md
- 结论：❌需修改。共 13 条意见：
  - 2 项阻断：#1 Source 验证机制架构路径不明确、#2 sources.display_name 与 name 字段关系不清
  - 6 项中等：#3 scheduler 未感知 Source status、#4 数据全清范围、#5 RSS 识别漏判、#6 编辑后状态处理、#7 日志查看器架构、#8 级联遗漏 tasks 表
  - 5 项轻微：#9 preview 长度、#10 mark-verified 幂等性、#11 全局统计路径、#12 共享枚举、#13 NonRetryableError
- 关联迭代：v0.2
- 遗留问题/风险：等待 PM 在 R2 回应阻断项

## 2026-05-20 — v0.1 设计文档初版产出
- 本次角色：架构师
- 动作：产出
- 涉及文档：docs/v0.1-design.md（后移至 docs/progress/iterations/v0.1-design.md）
- 结论：产出完成，进入 Review
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-20 — v0.1 PRD Review
- 本次角色：架构师
- 动作：Review
- 涉及文档：docs/v0.1-prd.md
- 结论：提出技术可行性建议，PRD 修改后通过
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-20~23 — v0.1 设计文档多轮修改
- 本次角色：架构师
- 动作：修改
- 涉及文档：docs/v0.1-design.md（经历 RD review、dev review、3rd review）
- 结论：设计定稿
- 关联迭代：v0.1
- 遗留问题/风险：前端 UX 优化留待后续迭代

## 2026-05-23 — v0.1 迭代完成
- 本次角色：架构师
- 动作：收尾
- 涉及文档：docs/progress/iterations/v0.1.md
- 结论：v0.1 三阶段（PRD→设计→实现）全部定稿，迭代完成
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-23 — v0.1 实现阶段 R3 Review
- 本次角色：架构师
- 动作：Review（审全栈开发 R3 Review 问题修复）
- 涉及文档：docs/progress/iterations/v0.1.md
- 结论：R2 遗留 2 个中等问题（游标截断时序 + auth failure 全覆盖）均正确修复，与设计文档对齐，✅通过
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-23 — v0.1 实现阶段 R2 Review
- 本次角色：架构师
- 动作：Review（审全栈开发 R2 设计对齐修复）
- 涉及文档：docs/progress/iterations/v0.1.md
- 结论：9 项变更中 8 项通过，1 项需修复（_handle_auth_failure 在 user_timeline/resolve_usernames 中缺失）
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-23 — v0.1 设计文档 R3 修订 + 微调
- 本次角色：架构师
- 动作：修改（响应 PM R2 + 开发 R3 + PM R3）
- 涉及文档：docs/progress/iterations/v0.1-design.md、docs/progress/iterations/v0.1.md
- 结论：
  - R3 修订：修复 PM R2 5项——9.1 改技术债务、NonBlankStr 校验、NonRetryableError、空结果游标、listNews 对象参数
  - R3 微调：修复开发 R3 6项——文档状态标记、冗余 if 移除、render_text 格式补充、NonRetryableError 位置明确(worker/errors.py)、import 补充、TOCTOU 文档化
  - 当前待开发复审微调项
  - 2026-05-23 全栈开发复审通过，设计定稿
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-23 — v0.1 设计文档 R2 修订
- 本次角色：架构师
- 动作：产出（修订）
- 涉及文档：docs/progress/iterations/v0.1-design.md、docs/progress/iterations/v0.1.md
- 结论：对齐 PRD R4，重写设计文档；新增数据流总览、技术约束、前端数据层适配章节；更新迭代记录设计阶段门禁表
- 关联迭代：v0.1
- 遗留问题/风险：无

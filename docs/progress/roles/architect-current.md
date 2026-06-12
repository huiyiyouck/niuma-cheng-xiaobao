# 架构师工作日志 — 当前（最近 10 条）

> 分层策略见 `docs/baseline/context-policy.md`。
> 启动默认读本文件 + `architect-summary.md` + `architect-corrections.md`。
> 历史日志见 `architect-archive.md`，按需搜索。

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

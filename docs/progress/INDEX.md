# 项目进度索引

> 本文件是项目级当前状态的唯一真源。启动时 Agent 读此文件即应能判断"现在卡在哪、下一步做什么"，不需要再去翻迭代记录。

## 当前项目状态

- 当前迭代：v0.5
- 当前模式：标准迭代
- 当前阶段：实现阶段 R1 Review中；PM 已通过；Tester 需修改；等待 Architect Review
- 阻塞项：无
- 下一步入口：Architect Review 实现成果；Developer 修复 Tester 发现的 Bug 和测试缺口后提交 R2

## 版本列表

| 版本 | 迭代记录 | PRD | UI | 设计文档 | Summary | 状态 |
|------|----------|-----|----|----------|---------|------|
| v0.1 | [iterations/v0.1.md](iterations/v0.1.md) | [iterations/v0.1-prd.md](iterations/v0.1-prd.md) | 无（早期版本） | [iterations/v0.1-design.md](iterations/v0.1-design.md) | — | 已完成 |
| v0.2 | [iterations/v0.2.md](iterations/v0.2.md) | [iterations/v0.2-prd.md](iterations/v0.2-prd.md) | [iterations/v0.2-ui-spec.md](iterations/v0.2-ui-spec.md) | [iterations/v0.2-design.md](iterations/v0.2-design.md) | — | 已完成 |
| v0.3 | [iterations/v0.3.md](iterations/v0.3.md) | 无（纯迁移） | 无 | [iterations/v0.3-tech-eval.md](iterations/v0.3-tech-eval.md) | — | 已完成 |
| v0.4 | [iterations/v0.4.md](iterations/v0.4.md) | [iterations/v0.4-prd.md](iterations/v0.4-prd.md) | [iterations/v0.4-ui-spec.md](iterations/v0.4-ui-spec.md) | [iterations/v0.4-design.md](iterations/v0.4-design.md) | [iterations/v0.4-summary.md](iterations/v0.4-summary.md) | ✅ 已完成（有条件关闭 2026-05-31）|
| v0.5 | [iterations/v0.5.md](iterations/v0.5.md) | [iterations/v0.5-prd.md](iterations/v0.5-prd.md) | [iterations/v0.5-ui-spec.md](iterations/v0.5-ui-spec.md) | [iterations/v0.5-design.md](iterations/v0.5-design.md) | — | 实现阶段 R1 Review中 |

## 当前 Change Notes

| Change Note | 关联工作 | 状态 | 下一步 |
|-------------|----------|------|--------|

## 当前非迭代工作

| 日期 | 模式 | 记录 | 状态 | 下一步 |
|------|------|------|------|--------|
| 2026-05-31 | Proposal | [DevOps 提案：数据库迁移机制规范化](ad-hoc/2026-05-31-devops-proposal-db-migration-mechanism.md) | ✅ 全线完成 — Step 1（Architect R1）+ Step 2（Developer）+ R2（Architect 复审）+ Step 3（DevOps 部署侧）+ #B2（Architect 独立评估）；ADR-001 落 [`docs/baseline/architecture.md`](../baseline/architecture.md)；操作手册落 [`docs/knowledge/devops/db-migration-handbook.md`](../knowledge/devops/db-migration-handbook.md) | — |
| 2026-05-31 | Ops Task | [清理 v0.3 Python 遗留 systemd unit + Node 后端 systemd 化](ad-hoc/2026-05-31-ops-cleanup-legacy-systemd-units.md) | ✅已完成（旧 unit 全清 + Node 后端已切换为 systemd 管理，崩溃重启已验证） | — |
| 2026-05-31 | Incident | [Node.js 后端源码被基线同步 commit 误删](ad-hoc/2026-05-31-incident-server-source-deleted-by-baseline-sync.md) | 已完成：恢复→推送 GitHub→重启→健康检查通过 | （留观，无后续动作） |
| 2026-06-02 | Product Brief | [信息评分方法论](ad-hoc/2026-06-02-product-brief-scoring-methodology.md) | 草稿（Owner 已确认方法论范围，待正式 PRD 化） | PM 收编进 v0.5 PRD；Architect / Developer / Tester 后续按正式迭代流程 Review |
| 2026-06-02 | Product Brief | [信息源管理重构](ad-hoc/2026-06-02-product-brief-source-management-redesign.md) | 草稿（Owner 已确认产品方案，待正式 PRD 化） | PM 收编进 v0.5 PRD；Architect / UI 后续按正式迭代流程 Review |
| 2026-06-01 | Product Brief | [信息平台演进方向](ad-hoc/2026-06-01-product-brief-information-platform-evolution.md) | 草稿（方向已确认，细节待迭代） | 作为 v0.5+ 迭代方向性输入材料 |
| 2026-05-30 | Product Brief | [X/Twitter 指定账号实时监听](ad-hoc/2026-05-30-product-brief-x-filtered-stream.md) / [技术实施规划](ad-hoc/2026-05-30-tech-plan-x-filtered-stream.md) | 已完成，登记为 v0.5 输入材料 | 用户启动 v0.5 后，交由 PM 和架构师正式 Review |

## 候选迭代输入材料

| 候选版本 | 材料 | 来源 | Review 状态 | 启动入口 |
|----------|------|------|-------------|----------|
| v0.5 | [X/Twitter 指定账号实时监听 Product Brief](ad-hoc/2026-05-30-product-brief-x-filtered-stream.md) / [Shared Filtered Stream 技术实施规划](ad-hoc/2026-05-30-tech-plan-x-filtered-stream.md) / [信息平台演进方向](ad-hoc/2026-06-01-product-brief-information-platform-evolution.md) / [信息源管理重构 Product Brief](ad-hoc/2026-06-02-product-brief-source-management-redesign.md) / [信息评分方法论 Product Brief](ad-hoc/2026-06-02-product-brief-scoring-methodology.md) | 编外成员 + PM 讨论沉淀 | 已收编进 `iterations/v0.5-prd.md` R1 | 按 PRD 动态 Review 计划推进 |

## 最近收尾摘要

| 日期 | 角色 | 工作 | 结论 | 下一步入口 |
|------|------|------|------|------------|
| 2026-06-06 | Tester | v0.5 PRD R2 Tester 复审 | 通过：R1 全部 13 条已关闭（2 高/7 中/4 低）；附 1 条中严重度观察（失败计数矛盾，设计阶段消除）。PRD 已定稿 | 切换到 UI 进入 UI 方案阶段 |
| 2026-06-06 | Tester | v0.5 PRD R1 Tester Review | 需修改：状态模型混用导致 AC 不可测试、外部 API 失败场景缺失 2 项高严重度；并发/空白状态/数据清理回滚/告警抖动/30s同步可测试性/迁移冲突 7 项中严重度；评分 AC 主观性/不回归/迁移粒度/计数口径 4 项低严重度 | 等待 PM 汇总 R1 并提交 R2；届时由 Tester 复审 |
| 2026-06-06 | Developer | v0.5 PRD R1 Developer Review | 需修改：状态模型和"未使用"未定义 2 项阻断；告警动作未定义 1 项高；删除迁移冲突/创建回流/历史快照/搜索筛选 AND-OR 4 项中；空间管理/分页/计数口径 3 项低 | 等待 PM 汇总 R1 并提交 R2；届时由 Developer 复审 |
| 2026-06-02 | UI | v0.5 PRD R1 UI Review | 需修改：Source 状态模型存在 1 项高严重度问题；告警流转、频道删除迁移冲突、新建 Source 回流存在 3 项中严重度问题；空间级管理范围存在 1 项低严重度问题 | 等待 PM 汇总其余角色 R1 Review 并提交 R2；届时由 UI 复审 |
| 2026-06-02 | PM | v0.5 三条主线规划 + 标准迭代启动 + PRD R1 + 会话收尾 | ✅ 已完成当日规划工作；v0.5 停留在 PRD R1 Review中；PM 日志已分层归档 | UI / Architect / Developer / Tester / DevOps 分别 Review `iterations/v0.5-prd.md` |
| 2026-05-31 | DevOps | Step 3：drizzle 迁移机制部署侧落地 | ✅ 全 8 步完成 — baseline 注入 / A2 移依赖 / systemd ExecStartPre + StartLimitBurst / #B1 复现拦截已验证 / 操作手册落档；整条 P2 关闭从待办移除 | — |
| 2026-05-31 | PM | v0.4 迭代关闭检查 + 归档摘要 | ✅ 可关闭（有条件关闭）— 8 项检查全部通过；`v0.4-summary.md` 已创建；INDEX 状态更新为「v0.4 已关闭」 | 用户决定下一步（启动 v0.5 / 其他） |
| 2026-05-31 | WM | 三项基线修正提案合并落地（#1 受保护路径删除 Review 门禁 / #2 前后端契约变更同步检查 / #3 INDEX 跨任务待办模板化） | commit dfede2b 推送 origin/main；11 文件净增 136 行；触发源 2026-05-30 基线同步事故 + v0.3 砍 WS 后前端残留 5 个月 + Developer 元流程提案 | 新约束即刻生效 |
| 2026-05-31 | Tester | v0.4 测试报告 R1 翻牌定稿 | ✅ 已定稿 — PM/Developer 双 Review 通过 + PM 3 项收口决定全部闭环（事项 1 不升 R2 / 事项 2 进 INDEX P2 / 事项 3 条件已列清） | PM 或 WM 执行 v0.4 迭代关闭检查 |
| 2026-05-31 | Tester | v0.4 测试工作收尾：用户视觉验证 ✅ + RSS 实机延后决策落档 | ✅ 有条件通过；PRD 22 项最终覆盖 21 ✅ / 1 ⏸（RSS 实机抓取经用户决策延后至后续迭代） | PM 复审测试报告 → 迭代关闭 |
| 2026-05-31 | Developer | v0.4 视觉验证 Bugfix 批次：6 bug + WS 架构对齐 | commit e736980 推送 GitHub；DELETE 400/空 body 解析/Modal 不统一/复选框对齐/启用响应性/创建空间事件名/前端 WS 残留 全部修复；线上验证通过 | 待用户继续 v0.4 视觉验证或决定迭代关闭 |
| 2026-05-31 | Developer | Incident：基线同步 commit 误删 server/ 源码 → 从 git 历史恢复并重启服务 | server/ 38 文件 + deploy/systemd/news-api.service 已恢复并推送 GitHub（commit ec8073e）；新 PID 3870357 启动健康检查通过；v0.4 线上服务连续可用、未中断 | 下班；旧 systemd unit 清理与 server 是否进 systemd 待 DevOps 决定 |

## 跨任务待办

> 列入此表通常说明事项跨多个任务、归属角色明确但尚未启动；
> 若已有可独立的 ad-hoc 或基线修正提案，优先走对应流程。完成后从本表移除。
>
> **字段与写权限**：
> - **优先级**（P0/P1/P2）：登记时由提出方设定，归属角色可调整。
> - **待办**：一句话描述。
> - **归属角色**：登记时由提出方判定；写入后只能由归属角色本人变更（如转交）。
> - **来源**：任何角色的日志、ad-hoc、Incident、Review 结论、Owner 口述等；登记后不再改。
> - **状态**：**只能由归属角色更新**；其他角色发现状态过期可在会话里提醒，不可代改。
> - Owner 始终可以更新任何字段，作为兜底。

| 优先级 | 待办 | 归属角色 | 来源 | 状态 |
|--------|------|----------|------|------|
| P1 | 完成 v0.5 PRD 规划：确认三条主线范围（X/Twitter 实时监听、信息源管理重构、评分体系方法论） | PM | 2026-06-01 PM v0.5 规划讨论阶段性收尾 | ✅ 已完成：三条主线已收编进 v0.5 PRD R1，标准迭代已启动 |
| P1 | 展开并确认「信息源管理重构」产品方案：信息源 Tab、频道空间/子频道树、绑定规则、删除预览、验收边界 | PM | 2026-06-01 PM v0.5 规划讨论阶段性收尾 | ✅ 已完成：Product Brief 已确认 |
| P2 | 确认并产出「评分体系方法论」文档范围：维度、评分锚点、综合分、状态草稿、LLM 输出结构、版本化；本轮不落地代码 | PM | 2026-06-01 PM v0.5 规划讨论阶段性收尾 | ✅ 已完成：Product Brief 已确认；不讨论评分后分流 |
| P2 | 领域标签管理：支持自定义增删改标签选项（当前为固定硬编码 AI/财经/开源/科技/其他），非 v0.5 范围 | PM | 2026-06-06 UI 方案讨论 — UI 侧提出标签管理需求 | 待 PM 评估，纳入后续迭代规划 |

## Bootstrap 记录
- 时间：2026-05-23（估计，基于早期 commit）
- 状态：已完成（v0.1 启动时）
- Git 状态：已初始化
- 下一步：—

## 角色日志

| 角色 | 日志 | 纠错记录 |
|------|------|----------|
| PM（产品经理） | [roles/pm-current.md](roles/pm-current.md) / [roles/pm-summary.md](roles/pm-summary.md) | [roles/pm-corrections.md](roles/pm-corrections.md) |
| UI（界面设计师） | [roles/ui.md](roles/ui.md) | — |
| Architect（架构师） | [roles/architect.md](roles/architect.md) | [roles/architect-corrections.md](roles/architect-corrections.md) |
| Developer（开发工程师） | [roles/developer.md](roles/developer.md) | [roles/developer-corrections.md](roles/developer-corrections.md) |
| DevOps（运维/部署工程师） | [roles/devops.md](roles/devops.md) | [roles/devops-corrections.md](roles/devops-corrections.md) |
| Tester（测试工程师） | [roles/tester.md](roles/tester.md) | — |
| WM（工作流管理者） | [roles/wm.md](roles/wm.md) | [roles/wm-corrections.md](roles/wm-corrections.md) |

# 项目进度索引

> 本文件是项目级当前状态的唯一真源。启动时 Agent 读此文件即应能判断"现在卡在哪、下一步做什么"，不需要再去翻迭代记录。

## 当前项目状态

- 当前迭代：无（v0.4 已关闭）
- 当前模式：未选择
- 当前阶段：工作台已初始化，v0.4 归档完成（2026-05-31），等待用户决定下一步
- 阻塞项：无
- 下一步入口：用户决定是否启动 v0.5 或执行其他工作

## 版本列表

| 版本 | 迭代记录 | PRD | UI | 设计文档 | Summary | 状态 |
|------|----------|-----|----|----------|---------|------|
| v0.1 | [iterations/v0.1.md](iterations/v0.1.md) | [iterations/v0.1-prd.md](iterations/v0.1-prd.md) | 无（早期版本） | [iterations/v0.1-design.md](iterations/v0.1-design.md) | — | 已完成 |
| v0.2 | [iterations/v0.2.md](iterations/v0.2.md) | [iterations/v0.2-prd.md](iterations/v0.2-prd.md) | [iterations/v0.2-ui-spec.md](iterations/v0.2-ui-spec.md) | [iterations/v0.2-design.md](iterations/v0.2-design.md) | — | 已完成 |
| v0.3 | [iterations/v0.3.md](iterations/v0.3.md) | 无（纯迁移） | 无 | [iterations/v0.3-tech-eval.md](iterations/v0.3-tech-eval.md) | — | 已完成 |
| v0.4 | [iterations/v0.4.md](iterations/v0.4.md) | [iterations/v0.4-prd.md](iterations/v0.4-prd.md) | [iterations/v0.4-ui-spec.md](iterations/v0.4-ui-spec.md) | [iterations/v0.4-design.md](iterations/v0.4-design.md) | [iterations/v0.4-summary.md](iterations/v0.4-summary.md) | ✅ 已完成（有条件关闭 2026-05-31）|

## 当前 Change Notes

| Change Note | 关联工作 | 状态 | 下一步 |
|-------------|----------|------|--------|

## 当前非迭代工作

| 日期 | 模式 | 记录 | 状态 | 下一步 |
|------|------|------|------|--------|
| 2026-05-31 | Proposal | [DevOps 提案：数据库迁移机制规范化](ad-hoc/2026-05-31-devops-proposal-db-migration-mechanism.md) | ✅ Architect Review R1 通过（2026-05-31）— 5 项决策已下 + 项目首条 ADR-001 已落 [`docs/baseline/architecture.md`](../baseline/architecture.md) | Step 2 → Developer 接手（baseline introspect + 归并 v0.4.sql 为 0001 + 老路径清理）；Step 3 → DevOps 在 Step 2 完成后实施（含 A2 移依赖 + systemd `ExecStartPre` + 验证 + 操作手册） |
| 2026-05-31 | Ops Task | [清理 v0.3 Python 遗留 systemd unit + Node 后端 systemd 化](ad-hoc/2026-05-31-ops-cleanup-legacy-systemd-units.md) | ✅已完成（旧 unit 全清 + Node 后端已切换为 systemd 管理，崩溃重启已验证） | — |
| 2026-05-31 | Incident | [Node.js 后端源码被基线同步 commit 误删](ad-hoc/2026-05-31-incident-server-source-deleted-by-baseline-sync.md) | 已完成：恢复→推送 GitHub→重启→健康检查通过 | （留观，无后续动作） |
| 2026-05-30 | Product Brief | [X/Twitter 指定账号实时监听](ad-hoc/2026-05-30-product-brief-x-filtered-stream.md) / [技术实施规划](ad-hoc/2026-05-30-tech-plan-x-filtered-stream.md) | 已完成，登记为 v0.5 输入材料 | 用户启动 v0.5 后，交由 PM 和架构师正式 Review |

## 候选迭代输入材料

| 候选版本 | 材料 | 来源 | Review 状态 | 启动入口 |
|----------|------|------|-------------|----------|
| v0.5 | [X/Twitter 指定账号实时监听 Product Brief](ad-hoc/2026-05-30-product-brief-x-filtered-stream.md) / [Shared Filtered Stream 技术实施规划](ad-hoc/2026-05-30-tech-plan-x-filtered-stream.md) | 编外成员整理 | 未进入正式 Review | 用户明确启动 v0.5 后，由 PM 和架构师接管 |

## 最近收尾摘要

| 日期 | 角色 | 工作 | 结论 | 下一步入口 |
|------|------|------|------|------------|
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
| P2 | 数据库迁移机制规范化：建立 drizzle 迁移文件管理 + 部署自动迁移步骤（v0.4 #B1 教训）+ 评估 #B2 替代方案（两步查询拆 FOR UPDATE） | DevOps（主）+ Architect（评估） | [v0.4 测试报告](iterations/v0.4-test-report.md) §「正式修复建议」 / PM 2026-05-31 决定 | ✅ **Step 1 已拍板**（Architect Review R1 2026-05-31 通过，详见 [DevOps 提案](ad-hoc/2026-05-31-devops-proposal-db-migration-mechanism.md) §「Architect Review 记录区」+ 首条 [ADR-001](../baseline/architecture.md)）。<br/>✅ **#B2 评估完成**（Architect 2026-05-31）：保留当前实现 `FOR UPDATE OF cs`，不采纳两步查询替代方案。<br/>✅ **Step 2 已完成 + Architect R2 复审通过**（2026-05-31）：Developer 4 项实操微调全部接受（drizzle-kit 升级 / baseline 用 generate 替代 introspect / baseline 直接吸收 v0.4 / `db/schema.sql` 归档建议）；ADR-001 已追加实操修订附注。<br/>剩余动作：⏳ **Step 3 → DevOps**（A2 移依赖 + systemd `ExecStartPre` + `StartLimitInterval/Burst` + 首次部署 baseline 注入 `__drizzle_migrations` + 操作手册含 drizzle-kit/orm 版本约束章节）。<br/>📋 Step 3 实施计划详见 [`devops.md` 2026-05-31 P2 评估段末尾](roles/devops.md) + Developer 已在 [DevOps 提案 §Step 2 末尾](ad-hoc/2026-05-31-devops-proposal-db-migration-mechanism.md) 显式提醒硬前置风险。<br/>🟡 可选清理（不阻塞 Step 3）：根目录 `db/schema.sql` 归档到 `server/drizzle/_legacy/`，归 Developer 下次经过时顺手做 |

## Bootstrap 记录
- 时间：2026-05-23（估计，基于早期 commit）
- 状态：已完成（v0.1 启动时）
- Git 状态：已初始化
- 下一步：—

## 角色日志

| 角色 | 日志 | 纠错记录 |
|------|------|----------|
| PM（产品经理） | [roles/pm.md](roles/pm.md) | [roles/pm-corrections.md](roles/pm-corrections.md) |
| Architect（架构师） | [roles/architect.md](roles/architect.md) | [roles/architect-corrections.md](roles/architect-corrections.md) |
| Developer（开发工程师） | [roles/developer.md](roles/developer.md) | [roles/developer-corrections.md](roles/developer-corrections.md) |
| DevOps（运维/部署工程师） | [roles/devops.md](roles/devops.md) | [roles/devops-corrections.md](roles/devops-corrections.md) |
| Tester（测试工程师） | [roles/tester.md](roles/tester.md) | — |

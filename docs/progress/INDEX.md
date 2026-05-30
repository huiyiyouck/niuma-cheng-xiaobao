# 项目进度索引

> 本文件是项目级当前状态的唯一真源。启动时 Agent 读此文件即应能判断"现在卡在哪、下一步做什么"，不需要再去翻迭代记录。

## 当前项目状态

- 当前迭代：v0.4 — UI 重构 + 功能点检与异常处理完善
- 当前模式：标准迭代
- 当前阶段：测试阶段 — 测试已执行，发现 2 个阻断缺陷，待 Developer 修复
- 阻塞项：2 个阻断缺陷（#B1 数据库迁移未执行、#B2 Source 删除 FOR UPDATE bug）
- 下一步入口：Developer 修复 #B1 #B2 → Tester 回归验证

## 版本列表

| 版本 | 迭代记录 | PRD | UI | 设计文档 | Summary | 状态 |
|------|----------|-----|----|----------|---------|------|
| v0.1 | [iterations/v0.1.md](iterations/v0.1.md) | [iterations/v0.1-prd.md](iterations/v0.1-prd.md) | 无（早期版本） | [iterations/v0.1-design.md](iterations/v0.1-design.md) | — | 已完成 |
| v0.2 | [iterations/v0.2.md](iterations/v0.2.md) | [iterations/v0.2-prd.md](iterations/v0.2-prd.md) | [iterations/v0.2-ui-spec.md](iterations/v0.2-ui-spec.md) | [iterations/v0.2-design.md](iterations/v0.2-design.md) | — | 已完成 |
| v0.3 | [iterations/v0.3.md](iterations/v0.3.md) | 无（纯迁移） | 无 | [iterations/v0.3-tech-eval.md](iterations/v0.3-tech-eval.md) | — | 已完成 |
| v0.4 | [iterations/v0.4.md](iterations/v0.4.md) | [iterations/v0.4-prd.md](iterations/v0.4-prd.md) | [iterations/v0.4-ui-spec.md](iterations/v0.4-ui-spec.md) | [iterations/v0.4-design.md](iterations/v0.4-design.md) | — | 设计阶段已定稿 → 实现阶段 |

## 当前 Change Notes

| Change Note | 关联工作 | 状态 | 下一步 |
|-------------|----------|------|--------|

## 当前非迭代工作

| 日期 | 模式 | 记录 | 状态 | 下一步 |
|------|------|------|------|--------|

## 最近收尾摘要

| 日期 | 角色 | 工作 | 结论 | 下一步入口 |
|------|------|------|------|------------|

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

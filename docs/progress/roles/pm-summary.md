# PM 工作日志摘要

## 当前状态

- 当前迭代：v0.5
- 当前阶段：PRD 阶段 R1 Review中
- 当前角色产出：`docs/progress/iterations/v0.5-prd.md`
- 下一步入口：切换到 UI、Architect、Developer、Tester、DevOps 角色分别 Review v0.5 PRD R1。

## v0.5 关键上下文

v0.5 已于 2026-06-02 正式启动，包含三条主线：

1. **信息源资产化重构**
   - 固定两级结构：空间 → 频道；没有子频道。
   - 页面使用两层 Tab，不使用树形目录。
   - Source 独立于空间和频道，可以投放到多个位置。
   - 同一个 Source 全局只抓取一次，再向启用位置分发。
   - 标签体系纳入录入、编辑、展示、搜索和筛选。
   - 待修复 Source 可以保存，但验证成功前不能添加到空间或频道。
   - 当前旧业务数据无保留价值：实施时全部清空，不做迁移，不保留旧 API 兼容。

2. **X/Twitter 实时监听**
   - 一个 X Source 对应一个账号。
   - 所有 X Source 共用一个 Filtered Stream 长连接。
   - 首次启用展示位置时新增规则；最后一个启用位置暂停或移除时删除规则。
   - Source 级补偿抓取默认 24 小时。

3. **信息评分方法论**
   - 本轮只交付方法论文档，不实现评分代码。
   - 首版启用时效性、影响力、置信度；预留行动性、独特性。
   - LLM 只输出维度分和理由，系统按空间或频道权重版本计算场景分。
   - Source 关注级别暂不参与计算。
   - 不讨论日报、推送、自动分流或阈值。

## v0.5 PRD R1 Review 计划

| Review 方 | 重点 |
|-----------|------|
| UI（界面设计师） | 管理页、Source 详情、告警入口和状态表达 |
| Architect（架构师） | 数据模型、共享抓取、历史新闻保留、快照和清理边界 |
| Developer（开发工程师） | 前后端契约、Worker 和工程成本 |
| Tester（测试工程师） | 验收标准、异常路径和清空后从零开始流程 |
| DevOps（运维/部署工程师） | X API 环境依赖、单实例约束和不可逆数据清理 |

## 重要风险

- 生产数据清理不可逆，必须由 Architect Review 表级范围和依赖顺序，DevOps 执行前输出统计，并由 Owner 明确确认。
- X API 套餐、连接数、规则数、计费策略和预算告警需要在上线前重新核验。
- `sub_channels` 是否统一重构为 `channels`，由 Architect 在设计阶段评估。
- 评分方法论不得在本轮静默扩展为代码实现。

## 历史迭代摘要

- v0.1：完成早期后端、Worker、前端和多轮 Review 闭环。
- v0.2：完成 Source 重构、前端体验、日志系统和 UI 规范。
- v0.3：完成 Python FastAPI → Node.js Fastify + TypeScript 纯迁移。
- v0.4：完成 UI 重构、RSS Fetcher、频道 CRUD、解绑、告警状态、鉴权、搜索和部署闭环；于 2026-05-31 有条件关闭。

## 长期机会

- `docs/knowledge/opportunities/event-timeline-impact-chain-analysis.md`
  - 将源头新闻、后续发酵和跨空间/频道变化串联为事件时间线与影响链。
  - 归入 v0.6+ 候选方向，不进入 v0.5 实现范围。

## 日志分层

- 最近记录：`docs/progress/roles/pm-current.md`
- 历史归档：`docs/progress/roles/pm-archive.md`
- 纠错记录：`docs/progress/roles/pm-corrections.md`

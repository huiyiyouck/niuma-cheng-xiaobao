# 团队知识库索引

> 本索引用于快速定位项目级知识。Agent 启动时只读索引，不全文读取知识库。

## Product（产品）

- [AI 能力渐进式上线策略](product/ai-capability-rollout-strategy.md) — 代码已实现 + 开关默认关闭 + 独立服务承接的渐进式发布模式，含适用/不适用场景（v0.6 AI 处理收口决策沉淀）

## UI（界面）

## Architecture（架构）

- [系统架构概览](architecture/system-architecture.md) — 系统架构、ADR 清单、数据流、扩展点

## Engineering（工程）

- [Node.js 进程 unlink-while-open 应急恢复套路](engineering/nodejs-unlink-while-open-recovery.md) — 源码丢失但进程还活的应急判断 + 恢复步骤 + 陷阱（v0.4 Incident 实战沉淀）
- [Vue 3 setup 中 const 解构 props 非响应式陷阱](engineering/vue3-setup-props-non-reactive-pitfall.md) — 子组件"不刷新"症状的常见根因 + computed/watch 修法 + Review checklist 建议
- [外部 Portal 作为真理源的反向同步模式](engineering/external-portal-as-truth-source.md) — 外部平台已有完整管理能力时内部被动同步的架构模式、关键约束、适用与不适用场景（v0.5.1 X 反向同步实战沉淀）
- [软删除表的唯一约束必须排除 deleted_at](engineering/soft-delete-unique-index.md) — 软删除后允许重建时必须使用 `WHERE deleted_at IS NULL` 的部分唯一索引，避免「列表没有但新增报已存在」
- [显式空环境变量被 .env 回退覆盖致环境隔离失效](engineering/env-empty-value-fallback-breaks-isolation.md) — `process.env[key] || env[key]` 让空值禁用失效，测试拿生产 X token 抢唯一 stream 连接致持续 429；含告警去重需覆盖 active 状态（2026-06-16 排障沉淀）
- [原型驱动前端重构：1:1 还原 + mock 先行 + 后端渐进对接](engineering/prototype-driven-frontend-refactor.md) — Figma 原型前端重构的三阶段实施路径（底座+静态还原 → 契约对接 → 交互精修），含原型优先/前端先行/渐进式接后端等关键原则（v0.6 前端重构沉淀）
- [链路改造必须先枚举全部写入路径](engineering/enumerate-all-write-paths-on-pipeline-change.md) — 以目标表为锚点反查全部写入者并列对照表进设计文档；四轮 Review 未抓住 x-stream 旁路漏改的教训（v0.6.1 关闭检查沉淀）
- [跨项目契约起草：字段表逐字段对照真源](engineering/contract-drafting-field-level-verification.md) — 契约字段表禁止凭记忆写，每行指向可核查真源 + grep 两侧实际消费；O-1/C-10 两次 P0 契约冲突的教训（v0.6.1 REQ-003 沉淀）

## Testing（测试）

## DevOps（运维/部署）

- [全栈部署检查清单](devops/full-stack-deploy-handbook.md) — 前端构建 + 后端 systemd + nginx 反代全链路部署审计与检查表、翻牌标准、故障排查（v0.5.1 DevOps 失误沉淀）
- [数据库 Schema 迁移操作手册](devops/db-migration-handbook.md) — drizzle 迁移机制（generate → commit → systemd ExecStartPre 自动 migrate）的执行说明、版本约束、首次部署 baseline 注入、故障排查（含 v0.5.1 新增「三方漂移」现象 4）、回滚步骤（v0.4 #B1 教训后规范化）
- [Node 依赖变更同步检查手册](devops/dependency-change-handbook.md) — Developer 改 `package.json` 后到部署机生效的检查链路、`ERR_MODULE_NOT_FOUND` 故障排查、`devDependencies` vs `dependencies` 边界、systemd `StartLimitBurst` 锁定的恢复（v0.5.1 事故沉淀）

## Decisions（决策）

## Opportunities（机会池）

- [事件时间线与影响链分析](opportunities/event-timeline-impact-chain-analysis.md) — 将源头新闻、后续发酵和跨空间/频道变化串联为事件时间线与影响链，作为 v0.6+ 候选方向

## Retrospectives（复盘）

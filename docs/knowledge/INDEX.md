# 团队知识库索引

> 本索引用于快速定位项目级知识。Agent 启动时只读索引，不全文读取知识库。

## Product（产品）

## UI（界面）

## Architecture（架构）

- [系统架构概览](architecture/system-architecture.md) — 系统架构、ADR 清单、数据流、扩展点

## Engineering（工程）

- [Node.js 进程 unlink-while-open 应急恢复套路](engineering/nodejs-unlink-while-open-recovery.md) — 源码丢失但进程还活的应急判断 + 恢复步骤 + 陷阱（v0.4 Incident 实战沉淀）
- [Vue 3 setup 中 const 解构 props 非响应式陷阱](engineering/vue3-setup-props-non-reactive-pitfall.md) — 子组件"不刷新"症状的常见根因 + computed/watch 修法 + Review checklist 建议

## Testing（测试）

## DevOps（运维/部署）

- [数据库 Schema 迁移操作手册](devops/db-migration-handbook.md) — drizzle 迁移机制（generate → commit → systemd ExecStartPre 自动 migrate）的执行说明、版本约束、首次部署 baseline 注入、故障排查、回滚步骤（v0.4 #B1 教训后规范化）

## Decisions（决策）

## Opportunities（机会池）

## Retrospectives（复盘）

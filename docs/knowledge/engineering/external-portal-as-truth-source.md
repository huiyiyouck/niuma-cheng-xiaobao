# 外部 Portal 作为真理源的反向同步模式

---
name: external-portal-as-truth-source
description: 外部平台（如 X Developer Portal）作为唯一真理源时，内部系统被动同步的架构模式
metadata:
  type: reference
---

## 背景

v0.5 原始设计为「平台推规则到 X」：本地 Source → `POST /2/tweets/search/stream/rules` 同步到 Twitter。部署后发现 Owner 在 X Developer Portal 手动维护规则（如 `from:OpenAI`），本地 DB 没有对应 Source。Worker 启动时 `setRules([])` 把 Portal 手动建的规则清空——双真理源冲突。

## 模式

当外部平台（Portal / Console / Dashboard）已有完整的数据管理能力，且内部人员习惯在 Portal 直接操作时，采用「外部真理源 + 内部被动同步」：

```
外部 Portal（真理源）
    ↓ pull / 定时 / 手动触发
内部系统（消费者）
    ↕ 只读 + 有限写（标签 / 备注 / 暂停 / 恢复等非核心字段）
```

## 关键约束

1. **禁止双向写入核心字段**：身份 / 名称等核心字段由真理源定义，内部系统不可修改。
2. **暂停 ≠ 删除**：暂停时数据继续入库但前端隐藏；恢复后历史立刻可见。避免删除后需重新回填。
3. **同步时机**：启动全量 + 定时增量 + 手动触发兜底。5 分钟适合实时性要求高的场景，24 小时适合低频变更。
4. **diff 策略**：三路对比（Portal 有 / 本地无 → 新增；Portal 无 / 本地有 → 软删除；两边都有 → 覆盖更新）。
5. **标签覆盖语义**：核心字段（如 `rule.tag → display_name`）每次同步覆盖，内部不可编辑。非核心字段（标签 / 备注 / 关注级别）内部维护。

## 适用场景

- 外部平台已有成熟的管理界面和审批流程
- 团队习惯在外部平台直接操作
- 内部系统需要对外部数据的聚合/增强/展示，不需要反向写入

## 不适用场景

- 内部系统是唯一的数据生产者（此时内部应为真理源）
- 外部平台无 API 可读取当前状态（无法 diff）
- 需要双向实时同步（需 CRDT 或冲突解决机制，超出本模式范围）

## 关联

- v0.5.1 X 信息源反向同步实施（`server/src/worker/x-rule-sync.ts`）
- [[devops-full-stack-deploy-not-just-backend]]

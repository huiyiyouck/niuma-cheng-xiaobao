# 系统架构概览

## 元信息
- 类型：Architecture
- 来源：原始文件 `docs/baseline/architecture.md`（2026-05-30 迁移至知识库）
- 创建日期：2026-05-23
- 相关角色：Architect（架构师）
- 相关迭代：v0.1

## 内容摘要

### 系统架构

```
前端(Vue3) ←→ FastAPI(8000) ←→ PostgreSQL(Supabase)
                   ↕
              Worker(抓取+LLM)
```

- **后端 API**：FastAPI + SQLAlchemy async，提供 REST API + WebSocket
- **Worker**：独立 asyncio 进程，asyncpg 直连数据库，负责定时抓取 + LLM 处理
- **数据库**：PostgreSQL (Supabase)，schema 定义在 `db/schema.sql`
- **前端**：Vue 3 + TypeScript + Vite

### 关键数据流

```
Scheduler(定时扫描 channel_sources)
  → Fetcher(调用各 fetch_*.py 抓取外部数据)
  → raw_items(原始数据入库)
  → LLM Processor(翻译、摘要、要点、标签、实体、评分)
  → processed_news(结构化新闻入库)
  → WebSocket push → 前端实时更新
```

### ADR 清单

| ADR | 决策 | 状态 |
|-----|------|------|
| ADR-001 | Worker 使用 asyncpg 直连而非通过 API | 已采纳 |
| ADR-002 | 子频道去重用 URL 而非内容哈希 | 已采纳 |
| ADR-003 | LLM 全字段结构化输出 | 已采纳 |
| ADR-004 | 游标通用化设计（fetch_state JSONB） | 已采纳 |
| ADR-005 | X/Twitter 数据源集成 | 已采纳 |

详细理由和影响见下方各 ADR 条目。

### ADR-001: Worker 使用 asyncpg 直连而非通过 API
- 决策：Worker 直连 PostgreSQL，不与 FastAPI 共享连接池
- 理由：Worker 和 API 是独立进程，通过 API 会增加延迟和不必要的耦合
- 影响：连接池独立配置，Worker 需单独管理数据库连接

### ADR-002: 子频道去重用 URL 而非内容哈希
- 决策：基于 source_item_url 的子频道内去重
- 理由：URL 去重比内容哈希更可靠（避免同一文章不同格式导致的哈希差异）
- 影响：需要 source_item_url 索引（`ix_raw_items_url`）

### ADR-003: LLM 全字段结构化输出
- 决策：LLM 一次性输出标题、摘要、要点(bullets)、标签(tags)、实体(entities)、重要性评分(score)
- 理由：减少 LLM 调用次数，保证字段间一致性
- 影响：单次 prompt 较长，需合理设置 max_tokens

### ADR-004: 游标通用化设计
- 决策：各 Source 类型的抓取位置统一存储在 `channel_sources.fetch_state` JSONB 字段中
- 理由：不同 Source 的游标格式不同（RSS 用 ETag/Last-Modified，Twitter 用 since_id，HF 用日期），通用 JSONB 字段支持扩展
- 影响：Fetcher 实现时自行解析 fetch_state

### ADR-005: X/Twitter 数据源集成
- 决策：使用 X API v2 Basic 套餐，支持 search 和 user_timeline 两种模式
- 理由：补充实时社交媒体信息来源
- 影响：需 X_BEARER_TOKEN 环境变量，API 有 7 天历史限制和速率限制

### 数据库核心表关系
```
channel_spaces 1──N sub_channels
channel_spaces 1──N channel_sources ──N sources
channel_sources 1──N raw_items
channel_spaces 1──N processed_news ──N sub_channels
```
完整 DDL 见 `db/schema.sql`。

### 扩展点
- 新增 Source 类型：实现 `worker/fetch_*.py` + 在 `worker/main.py` 的 fetch 分发中注册
- 新增角色：创建 `docs/baseline/role-{角色id}.md`，双向更新已有角色手册的审人/被审关系，更新迭代记录模板增加对应阶段门禁

## 适用场景
- 新加入的 Architect（架构师）需要了解系统全貌
- 新迭代设计文档需要参考现有架构
- 需要做跨模块改造时了解边界

## 不适用场景
- 具体代码实现细节（见源码）
- 部署环境配置（见 `docs/knowledge/devops/`）

## 证据/链接
- 原始文件：已删除的 `docs/baseline/architecture.md`
- DDL：`db/schema.sql`

## 后续动作
- 新 ADR 直接写入本目录下的独立 ADR 文件
- 架构变更后更新此文件

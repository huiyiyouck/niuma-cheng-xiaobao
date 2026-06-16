# LangGraph Agent Hub 技术预研提案

- 日期：2026-06-16
- 模式：Tech Spike / Proposal（非迭代技术预研输入）
- 产出角色：Developer（开发工程师）
- 当前状态：经 Owner 多轮讨论收敛（2026-06-16 第二轮，见 §12），待 PM（产品经理）和 Architect（架构师）Review
- 建议版本：v0.6.1 补充迭代候选
- 执行约束：本提案只沉淀方案，不在 v0.6 启用 LLM / Agent 新闻处理链路，不启动标准迭代，不改生产运行策略

## 1. 背景

v0.6 已完成 OpenClaw `news-l1` 的本机 smoke 和 `news_test` 单条真实 raw item / worker 端到端验证，证明当前新闻平台的 L1 处理契约可用：

- `raw_items` 可进入 `l1_process` 任务。
- Agent 输出可转换为平台 `L1Output`。
- `processed_news` 可写入。
- `news_positions` 可 fan-out。
- `tags_v2.processing` 可标记处理引擎，例如 `engine:agent`。

但 Owner 最新判断是：不再把 OpenClaw agent 作为新闻平台长期的信息处理中枢，而是考虑使用 LangGraph 搭建一个独立 Agent 中枢。该中枢先服务新闻聚合平台，后续也可接入其他项目。

## 2. Developer 结论

可行，且方向合理。

建议采用“独立 Agent Hub 服务”而不是把 LangGraph 直接嵌入当前 Node.js 新闻平台 worker。

理由：

- 新闻平台的核心职责应保持为抓取、入库、调度、展示和业务状态管理。
- LangGraph 更适合作为多步骤 agent 编排运行层，承载工具调用、状态检查点、失败恢复、人工介入和后续多项目复用。
- 独立服务边界可以避免新闻平台被 agent 编排细节污染，也方便未来其他项目复用。
- 当前 OpenClaw 验证产出的 `L1Output` 契约、写库链路和 worker 状态处理可以直接作为 LangGraph PoC 的验收基线。

## 3. 版本建议

### v0.6

建议可以进入收尾，不把 LLM / Agent 新闻处理链路作为 v0.6 关闭门槛。

v0.6 当前处理方式建议保持：

- 不启用 LangGraph。
- 不启用 OpenClaw 作为默认生产 L1 引擎。
- 不放开 worker 大批量跑 LLM/Agent 新闻处理。
- 已经完成的 OpenClaw 验证只作为技术证据和后续迁移参考。

### v0.6.1

建议将 LangGraph Agent Hub 作为 v0.6.1 补充迭代候选，由 PM 创建 PRD 或由 Architect 先发起架构方案后再进入标准迭代。

建议定位：

```text
v0.6.1：Agent Hub v0.1，替换新闻 L1 处理链路的技术预研与最小落地
```

## 4. 建议目标

v0.6.1 的目标不应是“万能 Agent 平台”，而是先完成一个可控的最小闭环：

```text
新闻平台 raw_item -> Agent Hub news-l1 graph -> L1Output -> processed_news
```

第一版目标：

- 建立独立 `agent-hub` 服务。
- 使用 LangGraph 编排 `news-l1` workflow。
- 新闻平台通过 HTTP 调用 Agent Hub，而不是直接执行 agent CLI 或内嵌 LangGraph。
- 保持当前 `L1Output` 输出契约不变，降低前后端影响面。
- 在 `news_test` 跑 3-5 条真实 raw item 小批量验证。

## 5. 建议架构

```text
news-platform
  - source 抓取
  - raw_items / tasks / processed_news / news_positions
  - worker 调 Agent Hub
  - 前端展示

agent-hub
  - LangGraph workflows
  - news-l1 graph
  - tools: web search / link reader / KB search / model call
  - output schema validation
  - run 状态 / checkpoint / trace

shared infra
  - PostgreSQL
  - search provider
  - model provider
  - logs / metrics
```

## 6. v0.6.1 建议范围

### In Scope

- 新建独立 Agent Hub 服务（建议 Python + FastAPI + LangGraph）。
- 提供 `POST /v1/runs/news-l1`。
- 输入沿用当前平台 `L1Input`：
  - source identity
  - domain tags
  - raw content / raw text
  - KB 检索结果
  - link content
  - search summary
- 输出沿用当前平台 `L1Output`：
  - title
  - summary
  - translation
  - context
  - analysis
  - score_dimensions
  - tags
  - needs_context
- Agent Hub 返回 run id、耗时、工具调用摘要、错误类型。
- 新闻平台新增 Agent Hub client。
- `server/src/worker/l1-processor.ts` 支持 `L1_ENGINE=agent_hub`。
- 保留 `builtin` 或当前 OpenClaw 路径作为临时 fallback，直到 v0.6.1 Review 确认移除。
- 在 `news_test` 小批量验证 3-5 条 raw item。

### Out of Scope

- 不做通用可视化工作流编辑器。
- 不做多租户权限和计费。
- 不做通用插件市场。
- 不做所有项目统一接入。
- 不做前端管理页配置 Agent 工作流。
- 不在 v0.6 收尾阶段启用生产 LLM/Agent 处理。

## 7. 初版 API 草案

### `POST /v1/runs/news-l1`

请求：

```json
{
  "source_identity": "jiamigou",
  "domain_tags": ["加密货币", "RWA"],
  "raw_content": {},
  "raw_text": "原始新闻文本",
  "kb_results": [],
  "link_content": null,
  "search_summary": "后台搜索摘要",
  "options": {
    "max_tool_calls": 4,
    "timeout_ms": 180000
  }
}
```

响应：

```json
{
  "run_id": "run_xxx",
  "status": "succeeded",
  "elapsed_ms": 85000,
  "tool_summary": {
    "web_search": 1,
    "link_read": 0,
    "kb_search": 1
  },
  "output": {
    "title": "中文标题",
    "summary": "中文摘要",
    "translation": {
      "zh": "中文翻译"
    },
    "context": [],
    "analysis": "分析",
    "score_dimensions": {
      "timeliness": { "score": 3, "reason": "" },
      "impact": { "score": 3, "reason": "" },
      "confidence": { "score": 3, "reason": "" },
      "clarity": { "score": 3, "reason": "" }
    },
    "tags": {
      "domain": [],
      "entity": [],
      "event": [],
      "content_type": [],
      "processing": ["engine:agent_hub"]
    },
    "needs_context": false
  }
}
```

## 8. 技术风险

| 风险 | 影响 | 建议 |
|------|------|------|
| 新增服务增加部署复杂度 | DevOps 成本上升 | v0.6.1 先单机 systemd 部署，后续再容器化 |
| 单条处理耗时过长 | worker 吞吐低 | Agent Hub 支持超时、run id、后续可异步化 |
| 新闻平台 tasks 与 Agent Hub runs 状态重复 | 排障困难 | 新闻平台 `tasks` 仍为业务真源，Agent Hub run 为处理证据 |
| 成本失控 | 模型 / 搜索费用不可控 | 每次 run 限制工具调用次数、搜索次数、最大 token |
| 输出不稳定 | 写库失败或展示异常 | 使用严格 schema validation，不合格进入 retry/fallback |
| 过早泛化 | 拖慢新闻平台 | v0.1 只做 `news-l1`，不做多项目抽象 |

## 9. Review 建议

建议 PM Review：

- v0.6 是否可以在“不启用 LLM/Agent 处理链路”的前提下收尾。
- v0.6.1 是否接受作为补充迭代。
- v0.6.1 的产品范围是否只限定为新闻 L1 处理链路替换。
- 是否需要在前端暴露任何 Agent 处理状态。

建议 Architect Review：

- 独立 Agent Hub 服务边界是否成立。
- Agent Hub 与新闻平台的同步 / 异步调用方式。
- `L1Output` 是否继续作为跨服务稳定契约。
- LangGraph checkpoint / persistence 是否需要独立库或复用现有 PostgreSQL。
- OpenClaw 相关代码在 v0.6.1 中是保留 fallback 还是删除。

建议 DevOps 后续 Review：

- Agent Hub systemd 部署方案。
- 环境变量和密钥隔离。
- 日志、超时和健康检查。
- 与生产 / test 环境的目录和服务隔离。

## 10. 建议验收标准

v0.6.1 PoC 通过条件：

- Agent Hub 独立服务可启动。
- `POST /v1/runs/news-l1` 可返回合法 `L1Output`。
- 新闻平台 worker 可通过 `L1_ENGINE=agent_hub` 调用 Agent Hub。
- `news_test` 中 3-5 条真实 raw item 端到端处理成功。
- `processed_news.tags_v2.processing` 标记 `engine:agent_hub`。
- 失败时 `raw_items.l1_status` 正确进入 retryable / final_failed。
- 单条耗时、工具调用次数、错误原因可追踪。
- v0.6 原有前端展示不需要改动或只做兼容字段读取。

## 11. Developer 建议结论

建议采纳这个方向，但不要把它塞进 v0.6 收尾。

推荐路径：

1. v0.6：按当前 UI / API / 测试环境验证完成度收尾，不启用 LLM/Agent 处理链路。
2. PM：评估是否创建 v0.6.1 PRD。
3. Architect：基于本提案出 Agent Hub 架构方案。
4. Developer：在 v0.6.1 中做 LangGraph Agent Hub PoC。
5. Tester：定义 3-5 条 raw item 验证集和失败场景。

最终判断：

```text
可行，建议立项为 v0.6.1 补充迭代候选；v0.6 可先收尾，不把 LLM/Agent 处理作为当前版本门槛。
```

---

## 12. Owner 讨论收敛更新（2026-06-16 第二轮）

> 本节是上述草案经 Owner 多轮讨论后的收敛结论与新增评估。草案主体保留，本节为增量真源。

### 12.1 已拍板的决策

| # | 决策 | 来源 |
|---|------|------|
| D1 | 评分体系**方案保留、代码废弃**：四维加权方法论 + `L1Output` 输出契约保留；`l1-processor.ts` 内建 LLM 五阶段 + OpenClaw 嵌入路径作为新闻平台内实现整体废弃 | Owner |
| D2 | AI 处理与新闻平台**解耦为独立服务**，新闻平台退化为调用方 | Owner |
| D3 | **技术栈分立**：新闻平台保持 Node.js；AI 处理中枢用 **Python**。对 v0.3「全栈 Node 统一」决策的**有限度、有意识反转**，边界严格限定在 AI 中枢这一个服务，平台主体不回退 | Owner（认账） |
| D4 | AI 处理**异步化**：worker 不同步等待中枢返回 | Owner |
| D5 | 中枢定位为**新闻平台多种 AI 能力的统一承载**（news-l1 + 影响力扩展 + 时间线复盘…），平台搭建期即规划；**非**泛化多项目平台，第一版不为无关外部项目做抽象 | Owner |

### 12.2 新闻分两类（产品更正，待 PM 收口广播）

Owner 更正：新闻分两类，前端需区分——

- **第一类**：抓取入库后直接展示，不经 AI 处理。
- **第二类**：经 AI 中枢处理后展示。

工程影响：本质是 L0 分类职责延伸（不需深加工 → 第一类；需要 → 第二类进中枢）；前端需**显式标记字段**（建议 `is_ai_processed` / `processing_level`，不靠 `tags_v2.processing` 隐式推断）。**此为产品定义更正，需 PM 收口写入 PRD / project-context 并广播，Developer 不替拍。**

### 12.3 服务器容量评估（4 核 8G，实测 2026-06-16）

实测：CPU load 0.3（近全闲）/ 内存 available 6.1G / 磁盘剩 14G / **Swap=0** / OpenClaw Gateway 占 551M（废弃后可回收）。

结论：**带得起，前提是 AI 推理走外部 API**（中枢是 IO-bound 协调者，CPU 不动、内存几百 MB）。本地跑模型则免谈（无 GPU、8G 装不下、CPU 推理不可用）。

两个真实约束：① **Swap=0**——多 AI 服务常驻 + run 堆积时，内存是唯一会先爆的资源，建议加 2-4G swap 或设进程内存上限；② 真瓶颈是外部 API 速率/成本，非机器资源。

### 12.4 LangGraph 选型判断

中枢用 LangGraph 编排**多 workflow** 合理——影响力扩展 / 时间线复盘等非固定流水线场景正是其价值所在。每条 workflow 自主程度逐条定：**news-l1 建议固定流水线**（质量可控、可复现、成本可控）；影响力 / 时间线复盘可更 agent 化。待 Architect 确认。

### 12.5 异步化带出的工程问题（交 Architect 架构阶段）

1. 结果回填：回调（中枢 POST 回平台）vs 轮询（平台查 run 状态）。
2. `tasks` 状态机改造：同步 claim → 提交即释放 worker 槽 + 异步回填。
3. 幂等去重：worker 重启 / 重试不重复处理（现有 `ON CONFLICT(raw_item_id)` 兜底 + run 提交层去重）。
4. run 超时回收：跨服务，类比 `taskStaleSeconds`。
5. 背压：中枢慢于平台提交时的限流 / 队列上限。
6. 状态真源：`tasks` 为业务真源，中枢 run 仅处理证据（写死）。

### 12.6 边界划分

评分加权 `calcScoreTotal` **留新闻平台**（权重是业务规则，平台是业务真源，调权重不应牵动中枢部署）；中枢只产四维 `score` + `reason`。

### 12.7 仍待定（不阻塞沉淀，架构阶段承接）

- news-l1 内部流水线 vs agent（§12.4 已有 Developer 建议）。
- 异步回填方式（§12.5 #1）。
- 两类新闻标记字段（待 PM）。

### 12.8 角色边界与下一步

本节为 Developer 技术评估产出，到此为止。推进需：**PM 立 v0.6.1 PRD（含 §12.2 产品更正）+ Architect 出架构方案（含 D3 技术栈、§12.5 异步模型、§12.6 边界）**。

OpenClaw 嵌入代码废弃（D1）的实际删除属 `server/` 受保护路径，须走架构师 Review 门禁，建议在 v0.6.1 实现阶段统一处理；v0.6 收尾前应顺手把 `config.ts` 的 `L1_ENGINE` 默认值从 `agent` 收回安全态（`builtin`）。

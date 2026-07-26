# 全栈开发工作日志 — Current

> 最近 5 条工作日志。其余条目按时间倒序归档到 `developer-archive.md`。
> 长期摘要、当前关注点、常见风险见 `developer-summary.md`。
> 分层时间：2026-06-09（v0.6 PRD R1 Review 收尾时按 `context-policy.md` 分层归档）

---

## 2026-07-26 — v0.6.1 实现 R4：三方 R3 Review 同批修复

- 本次角色：全栈开发（Developer）；模式：标准迭代 v0.6.1 实现阶段 R4（修复轮）
- 背景：R3 三方 Review 收齐（DevOps ✅ / Architect ⚠️1高4中4低 / PM ⚠️1低+裁定4项），PM 给出同批修复清单 6 项
- 已修复（commit `5ab883f`，base `0c733c5`）：
  - #A-R3-1（高）：`l1_error` 原文仅对带有效 x-admin-token 的请求返回；公开接口经 `publicL1Error()` 归一化为分类文案。**TDD 红灯抓到真 bug**：`ETIMEDOUT` 小写不含 `timeout` 子串，分类漏判，补 `etimedout` 关键字后 6/6 绿
  - #A-R3-2：`retryable_failed` 归入「解析中」（PM 方案①），`failed_retry` 状态删除
  - #A-R3-3：`level-status.ts` 新增 `ai_completed`/`ai_retryable_failed`/`ai_final_failed`（AI 口径），原全量字段保留兼容；监控 Tab 改用 ai_* 并做 `??` 兜底兼容旧后端
  - #A-R3-5：详情接口补 `raw_items.content` 原文提取（`rawContentText()` 覆盖 x/rss/jin10 字段优先级）+ `source_item_url`；抽屉正文与 summary 相同时去重
  - #A-R3-6/7：删 `pending` 幽灵分支；`displayState` 白名单兜底（未知状态→待解析；`l1Status`+`processType` 均为 null 的旧数据保持富展示）
  - #A-R3-8：注释按 PM 裁定修正（直显类保留来源标识标签）
- **#PM-R3-1 经核实不成立**：api.ts 类型注释本为 AD-05 四维，不存在指控的 `importance/relevance/credibility` key；按意见意图改为显式 `ScoreDimensions` 接口（Review 意见先核实再实现，不盲改）
- 自测证据：server tsc 0 错误；新增单测 `news-public-error.test.ts` 6/6（本地可跑，纯函数不依赖 DB）；frontend build 通过；本地 dev 模拟自测 retryable→解析中、final_failed 失败态、未知状态兜底；真实数据回归 23 卡片正常
- 下一步：PM + Architect 复核 R4 → DevOps 部署（前后端一起）→ PM 重跑迭代关闭检查

---

## 2026-07-25 — v0.6.1 实现 R3：前端展示分层（迭代关闭检查遗留）

- 本次角色：全栈开发（Developer）；模式：标准迭代 v0.6.1 实现阶段 R3
- 背景：PM 2026-07-25 迭代关闭检查发现 PRD R2 §5.10 前端展示分层未实现（实现 R1/R2 三方 Review 全部集中在后端，漏审前端），登记 5 项前端待办叫停关闭
- 已实现（commit `0c733c5`，base `12e2d46`）：
  - `api.ts`：`NewsOut`/`NewsDetailOut` 契约类型 + `getGlobalLevelStatusCounts()`
  - `NewsPage.tsx` 卡片：待解析/解析中角标、失败态底部小字（hover 原因）、基础展示态隐藏评分与标签
  - `NewsPage.tsx` 抽屉：状态条 + 四维评分条形图 + AI 分析 + 背景补全 + 解析中提示 + 失败原因摘要；直显类无状态条；详情合并对旧版后端缺字段做防覆盖
  - `MonitoringPage.tsx`：「AI 处理概览」Tab 六卡片网格 + 失败重试态
  - `AppSidebar.tsx`：底部统计补 AI 待处理/处理中（失败静默降级）
  - 后端 `news.ts`：详情补 `process_type`、列表/详情补 `l1_error`（PRD §5.4/§5.5 失败原因与分层判断依赖）
- 自测证据：server tsc 0 错误；frontend build 通过；本地 dev 以 `VITE_API_PROXY_TARGET=https://test.huiyiyou.cloud` 连测试环境，用临时状态模拟（已移除）逐一截图核对 6 种展示态 + 监控 AI Tab（真实数据 completed=154）+ 侧栏指标；移除模拟后真实数据回归正常
- 已知偏差 3 条（今日/累计口径、language 原文标签依赖后端、待解析角标从严按 AC-04）已登记迭代记录，提请 Review 时裁定
- 另：按 last-out 惯例代提 PM 迭代关闭检查 + Architect 实现 R2 复审遗留文档（commit `5905f19`）
- Owner 订正流程：R3 不走 PM 单方验收，与 R1/R2 一致走三方 Review（已记 corrections，Review 方登记已订正）
- 下一步：PM / Architect / DevOps 三方 Review 实现 R3 → DevOps 部署测试/生产 → PM 重跑迭代关闭检查（收尾）

---

## 2026-07-01 — AI news-l1 跨项目联调入口 + KB search 契约对齐

- 本次角色：全栈开发（Developer）；模式：非迭代跨项目联调任务（coordination `REQ-001`）
- coordination 依据：`/root/Project/niuma-cheng-coordination`；读取并更新 `STATUS.md`、`REQUESTS.md`、`communications/REQ-001-news-l1.md`、`contracts/news-l1.md`、`contracts/kb-search.md`
- Owner 要求：联调不能只做后端触发；需要前端调试页供验收，选择库内数据后发送给 ai 侧处理，并在页面看到返回；ai 侧提出的库内新闻搜索需求也要完成；联调契约必须定清楚传参、返回格式和数量。
- 已完成 xiaobao 侧：
  - 后端新增 AI Hub HTTP 客户端与配置 `AI_HUB_BASE_URL` / `AI_HUB_API_TOKEN` / `AI_HUB_TIMEOUT_MS`
  - `L1_ENGINE=ai` 时 worker 可复用独立 AI Hub 调用路径
  - 抽出 raw_item → `L1Input` 构造函数，联调入口与真实业务共用；补齐 `raw_content.url` 映射，符合 ai 侧 link read 规则
  - 新增 `GET /v1/ai-debug/candidates`、`POST /v1/ai-debug/news-l1-runs`
  - 新增 ai→xiaobao `POST /v1/kb-search`
  - 前端新增 `/debug/ai` 页面和侧栏「联调」入口，可搜索/选择新闻、配置工具上限和超时、发送 AI、展示请求/响应 JSON 与结构化结果
- coordination 已更新：
  - `contracts/news-l1.md` 补齐 `raw_content` URL 规则、`KbResult`、`tool_summary` 口径、JSON 示例
  - 新增 `contracts/kb-search.md` v1：`top_n` 默认 5 / 最大 10，返回 `results[]` 的固定结构
  - 更新 `communications/REQ-001-news-l1.md`、`STATUS.md`、`CHANGELOG.md`
- 验证：
  - `cd server && npm run build` 通过
  - `cd frontend && npm run build` 通过
  - `cd server && npm test -- src/__tests__/x-direct-display.test.ts` 通过（2 passed）
- 测试环境部署与收尾：
  - 已同步后端到 `/srv/niuma-news/test/server/src/`、前端 dist 到 `/var/www/test.huiyiyou.cloud/`，`news-api-test.service` active；`/health`、`/v1/ai-debug/candidates`、`/v1/kb-search` 均 200
  - ai 服务 `http://127.0.0.1:8100/health` 200，xiaobao 测试后端已可调用 ai
  - 修复测试站点 nginx `/v1/` 默认超时导致 AI 慢请求 504：已加 `proxy_connect_timeout 10s`、`proxy_send_timeout 240s`、`proxy_read_timeout 240s`，`nginx -t` 通过并 reload
  - 前端联调页已优化：点击发送后立即展示触发请求和“处理中”响应提示；AI 返回后展示实际 `L1Input` 与完整 `RunResponse`
- 真实联调验证：
  - 公网 `POST https://test.huiyiyou.cloud/v1/ai-debug/news-l1-runs` 通过，约 79s 返回 200，`run_id=run_7e626cf5f391`，`status=succeeded`
  - xiaobao→ai：`run_2a4dbc15f308` succeeded；ai→xiaobao KB 命中：`run_2e0072cba2a3` succeeded 且 `tool_summary.kb_search=1`
  - KB 空结果时 ai 当前标 `degraded:kb_search_failed`，coordination 已记录为 ai 侧语义优化项
- 当前状态：xiaobao 侧联调入口完成、测试环境可验收；主链路不再阻塞。下一步由 Owner 在 `/debug/ai` 抽样验收，ai 侧优化 KB 空结果语义

---

## 2026-06-28 — v0.6 bug 收尾：AI 不放开 + X/Twitter 直显

- 本次角色：全栈开发（Developer）；模式：标准迭代 v0.6 实现阶段 bug 收尾
- Owner 决策：v0.6 当前只做 bug 收尾，**AI 处理不放开**；Twitter 抓到的东西直接展示在新闻页，AI 处理后续交给独立 AI 中枢管理；若无更多 bug，下一步交 DevOps 部署生产
- 已实现代码侧收口：
  - `config.ts` 新增 `ENABLE_AI_PROCESSING`，默认 `false`
  - `dispatcher.ts` 新增 `taskTypeForNewRawItem()`：默认 X/Twitter 新 raw item 排普通 `process`；仅显式启用 AI 时排 `l0_classify`
  - worker 主循环在 AI 未启用时不 claim `l0_classify` / `l1_process`，避免误跑内建 L0/L1 或 OpenClaw 路径
  - `processor.ts` 对 X/Twitter 始终直显；AI 未启用时其他 source 也直显兜底；直显路径写 `processed_news` + fan-out `news_positions`，并将 raw 标记为 `l0_status=skipped` / `l1_status=completed`
  - 新增迁移 `0007_backfill_x_direct_display.sql`，回填已有 X raw item 为可展示新闻，并把遗留 queued L0/L1 任务标记为 succeeded
- TDD 证据：先新增 `x-direct-display.test.ts`，红灯为“X 仍调用 LLM / taskTypeForNewRawItem 不存在”；实现后 `npm test -- src/__tests__/x-direct-display.test.ts` 通过
- 编译验证：`cd server && npm run build` 通过
- DevOps 交接：生产部署需执行迁移 `0006_drop_dp_channel_unique` + `0007_backfill_x_direct_display`；生产环境保持不设置 `ENABLE_AI_PROCESSING=true`
- 下一步：Owner 继续报具体 bug；若无 bug，切 DevOps 生产部署

---

## 2026-06-16 — 建 niuma-cheng-ai 独立中枢骨架 + 跨项目协作机制设计（移交 WM）

- 本次角色：全栈开发（Developer）；模式：Owner 指挥的项目创建 + 跨项目协作设计（非迭代）
- Owner 拍板直接建 AI 中枢独立项目；Developer 确认「建骨架零技术难度、无大风险、可逆」，纠正上一轮把流程洁癖当技术风险
- 已建 `~/Project/niuma-cheng-ai`（独立 git 仓库，init commit `0ee6c9a`）：
  - Python 3.12 + FastAPI + LangGraph；端口 8100（避开 8000/8001/18789）
  - 契约 `schemas.py`（L1Input / L1Output / RunResponse，按提案 §6/§7；评分 score_total 留平台、中枢只产四维 score+reason 见 §12.6）
  - API `main.py`（`/health` + `POST /v1/runs/news-l1`）
  - news-l1 LangGraph **固定流水线** kb→link→search→llm（§12.4 判断，节点占位返回结构化 stub，tags.processing=`["engine:agent_hub","stub"]`）
  - 依赖已装、冒烟测试 **2 passed**；真实节点逻辑 / 异步对接 / 状态持久化待 v0.6.1 架构定稿
- 跨项目协作：Owner 要求两项目协作机制，产出 [跨项目协作机制设计提案](../ad-hoc/2026-06-16-proposal-cross-project-collaboration.md)——三层结构（xiaobao / ai / coordination）+ 协调仓库内容（契约单一真源 / STATUS / CHANGELOG / decisions）+ 工作约定（开工前 pull / 改契约先改协调仓库 / 完成影响对方的事更新 STATUS 点名）
- 分工（Owner 指定）：跨项目协作 + 整个团队工作流同步**移交 WM**；`niuma-cheng-coordination` 仓库 **Owner 自建** GitHub；niuma-cheng-ai 团队工作流需**该项目新会话 Bootstrap**
- 边界：跨项目协作属 WM 域基线修正，Developer 只产设计输入，**未碰 `docs/baseline/`**
- 下一步：Owner 找 WM 收编跨项目协作进 baseline + 定 ai 工作流初始化方式；Owner 建 coordination 仓库

---

## 2026-06-16 — LangGraph AI 处理中枢方案二轮收敛 + L1_ENGINE 默认值安全修复

- 本次角色：全栈开发（Developer）；模式：Tech Spike / Proposal 续（非迭代评估）+ 安全修复
- Owner 多轮讨论收敛 LangGraph「AI 处理中枢」方向，结论全部沉淀进提案 §12（草案主体保留，§12 为增量真源）
- 已拍板决策（提案 §12.1 D1-D5）：
  - D1 评分体系**方案保留、代码废弃**（四维加权方法论 + `L1Output` 契约留；`l1-processor.ts` 内建五阶段 + OpenClaw 嵌入整体废弃）
  - D2 AI 处理解耦为独立服务，新闻平台退化为调用方
  - D3 **新闻平台 Node + AI 中枢 Python**——v0.3「全栈 Node 统一」的有限度、有意识反转，边界仅限中枢一个服务
  - D4 AI 处理异步化
  - D5 中枢承载新闻平台**多种 AI 能力**（news-l1 + 影响力扩展 + 时间线复盘…），非泛化多项目；第一版不为无关项目做抽象
- 产品更正（提案 §12.2，待 PM 收口广播）：新闻分两类——①直接入库展示 ②经 AI 处理后展示；前端需显式标记字段
- 服务器评估（提案 §12.3，4 核 8G 实测）：load 0.3 / available 6.1G / **Swap=0** / OpenClaw Gateway 占 551M。结论**带得起，前提外部 API 推理**（IO-bound）；本地跑模型免谈；隐患是 Swap=0 + 外部 API 成本，非机器资源
- LangGraph 选型（提案 §12.4）：中枢编排多 workflow 合理；news-l1 内部建议固定流水线，影响力/时间线可更 agent 化
- 异步工程问题清单（提案 §12.5）+ 边界划分（§12.6 `calcScoreTotal` 留平台）交 Architect 架构阶段
- **安全修复**：`config.ts` `L1_ENGINE` 默认 `agent`→`builtin`。根因——生产 `server/.env` 未设该项，完全依赖代码默认值；OpenClaw 嵌入生产未验证（Gateway scope pending / 成本未控）且方向已废弃。`tsc` 0 错误。test scheduler 关闭（SCHEDULER_SCAN_SECONDS=999999）运行时不命中、生产 inactive 下次起服生效，**无需重启**
- 遗留处理：OpenClaw 嵌入代码（`openclaw.ts` + `l1-processor.ts` agent 分支）方向上 v0.6.1 废弃，删 `server/` 受保护路径须走架构师门禁，留 v0.6.1 实现阶段统一删；本次按 last-out 规则统一 commit 全部遗留（含上个会话 OpenClaw 批次的正常实现产出 callLLM/L0L1 骨架/API endpoint）
- 下一步：Owner 决定切 **PM 立 v0.6.1 PRD**（含两类新闻产品更正）→ **Architect 出 Agent Hub 架构方案**（含 D3 技术栈、§12.5 异步模型、§12.6 边界）

---

## 2026-06-16 — LangGraph Agent Hub 方案评估与 v0.6.1 候选提案

- 本次角色：全栈开发（Developer）；模式：Tech Spike / Proposal（非迭代技术预研输入）
- Owner 新决策倾向：不使用 OpenClaw agent 作为新闻平台长期信息处理中枢，改为考虑使用 LangGraph 搭建独立 Agent 中枢，先服务新闻聚合平台，后续接入其他项目
- Developer 判断：方向可行，且比把 OpenClaw CLI/agent 直接嵌入新闻平台更适合长期演进；建议独立 `agent-hub` 服务承载 LangGraph，新闻平台通过 HTTP 调用，不在 Node worker 内直接嵌入 LangGraph
- 已新增提案：[LangGraph Agent Hub 技术预研提案](../ad-hoc/2026-06-16-spike-langgraph-agent-hub-proposal.md)
- 关键结论：v0.6 可先收尾，不启用 LLM/Agent 新闻处理链路；LangGraph Agent Hub 建议作为 v0.6.1 补充迭代候选，由 PM 创建 PRD 或 Architect 先出架构方案
- 约束：本次只沉淀方案，不启动标准迭代，不改生产运行策略，不运行新的 LLM/Agent 处理

---

## 2026-06-16 — OpenClaw news-l1 Agent 集成验证 smoke

- 本次角色：全栈开发（Developer）；模式：v0.6 实现阶段专项验证（Owner 指定：验证用 OpenClaw agent 处理平台新闻）
- 已确认当前工作树已有 OpenClaw 集成改动：`L1_ENGINE=agent` 默认开启、`server/src/worker/openclaw.ts` 新增 `webSearch()` / `processL1ViaAgent()` / `validateL1Output()`，`l1-processor.ts` 改为 agent 优先、失败后内建 LLM 仅翻译兜底
- 验证结果：
  - `cd server && npm run build` 通过，TypeScript 0 错误
  - `openclaw status` 可见 `news-l1` agent 会话和本地 Gateway 服务；Gateway 有 scope upgrade pending 提示，但不阻断 `--local` agent smoke
  - `openclaw capability web search --query ... --json --limit 3` 通过，provider=tavily，返回真实搜索结果
  - `openclaw agent --agent news-l1 --local --message ... --json --timeout 120` 通过，耗时约 67s，返回严格 JSON；`toolSummary.calls=1` 且工具为 `web_search`
  - 代码级 smoke：直接调用 `webSearch()` + `processL1ViaAgent()`，成功得到平台 `L1Output` 结构（title / summary / translation / context / analysis / score_dimensions / tags / needs_context），四维评分和 tags 可被当前校验层接住
- 端到端补验（同日）：在 `news_test` 插入 1 条 `l1_process` queued 任务并调用一次 `workerLoop()`；真实 raw item `39e44f28-47b4-4eee-a5ca-bfd75c422d05` 处理成功，任务 `6de4139b-3284-421f-bc2d-f91d240f1b62` → `succeeded`，`raw_items.l1_status=completed`，新建 `processed_news` `609c20aa-ab65-4b95-8933-ce8d7d5f40ff`，标题「加密KOL「加密狗」预告高确定性RWA项目套利机会及低损耗对冲教程」，`score_total=2.8`，`tags_v2.processing` 含 `engine:agent`，`source_refs.search_fetched=true`，fan-out `news_positions=1`；耗时约 117s
- 发现：`tasks` 表无 `metadata` 列，历史记录中“手动重试创建 `l1_process` + `metadata.triggered_by='manual'`”只能改为“创建 `l1_process`，不记录 metadata”；已修正 `l1-tasks.ts` 注释
- 结论：OpenClaw `news-l1` agent 技术验证结果保留；但按 2026-06-28 Owner 收口决策，v0.6 不放开 AI 处理，不再做 3-5 条小批量观察，后续 AI 处理由独立 AI 中枢管理

---

## 2026-06-15 — v0.6 前端左中右布局重构 + 三页 UI/交互精修 + 管理页 bug 修复批 + 后端约束 bug

- 本次角色：全栈开发（Developer）；模式：实现阶段联调精修（Owner 主导的连续前端打磨 + 一个后端 bug）；7 个 commit（eb06ee0 → 6e085d2）

### 布局与视觉（eb06ee0）
- 顶部导航 → 左中右 app shell（新增 `AppSidebar`）；空间走 URL `?space=` 驱动；统计下放左栏底部并全局显示（浏览态当前空间 / 其它页全站）
- 浏览页：空间分段控件 + 频道描边 chip 合并一行（三行压两行）；评分四档配色（低分红）；新闻卡圆角/hover/标题/实体标签精修
- 详情面板：修复异步回写导致关闭后弹回的 bug；右滑抽屉（列表居中让位、ESC/X 关、列表可滚动切换）；加载骨架 + 空态

### 管理/监控页交互修复（4c2ebc5 / 95ee755 / 611e22f / 182ad9d）
- 乐观更新（暂停恢复秒变 / 新建空间 append 末尾 / 删除立即移除）+ 空间卡拖拽排序 + 已停止灰·抓取中绿状态色
- 全局 Toaster（移除 Vite 下失效的 next-themes 依赖）+ 各写操作 toast + 统一居中 `Loading` 组件
- 同步反馈：toast 提前到乐观更新时与前端变化同步；创建/编辑对话框等待提交完成再关 + 转圈动画 + 失败留弹窗
- loading 补全：信息源库/源详情/空间管理源列表·频道列表/添加源抽屉/添加位置频道下拉/监控告警日志/浏览页频道
- 一空间一位置（Owner 决策）：前端按空间级拦截重复添加；源详情移除语义错的源级「恢复抓取」按钮

### 后端 bug（6e085d2）
- `display_positions` 历史残留全表唯一约束 `..._channel_id_key` 未排除软删除 → 位置软删除后无法重加，误报「该信息源在此位置已存在」
- 新增迁移 `0006_drop_dp_channel_unique` DROP 该约束（一空间一位置由应用层 + `uq_dp_source_space` 保证）；test 库已 DROP 实测 409→成功；生产部署 drizzle migrate 自动执行

### 运维侧临时（不在 git）
- IP 直连 test 入口：nginx `test.huiyiyou.cloud` 配置加 `listen 80 default_server` → test 独立目录（绕开公司域名拦截，http://115.191.43.79）；属临时验证入口，标注「验证后可删」
- 同步把生产「去软链接化」登记为 DevOps P1 待办（20fffc3）

### 下一步
- Owner 继续验证；7 commit 待 push（Owner 未决定）；浏览页新闻列表骨架是否统一成 Loading 待定；OpenClaw 集成已于 2026-06-16 完成本机代码层 smoke，待真实 raw_item / worker 小批量验证

---

## 2026-06-14 — v0.6 联调精修收口：测试环境部署 + 角标/新闻列表/stats 修复 + 监控页改造 + 添加位置弹窗

- 本次角色：全栈开发（Developer）；模式：实现阶段联调精修
- 实际完成 7 项修复/增强：

### 测试环境部署
- `frontend/dist/` rsync 到 `/var/www/test.huiyiyou.cloud/`，nginx 已配 HTTPS + `/v1/`→8001
- `news-api-test.service` active (PID 1262289，:8001，news_test 库)
- 生产 dist 未被本次覆盖（上次 6-13 事故已规避）

### 角标接真实 API
- `RootLayout.tsx`：`unhandledAlertsCount = 3` mock → `getUnreadAlertsCount()` 真实调用
- mount 拉一次 + 60s 轮询 + 切前台刷新 + 进监控页 800ms 再刷
- 当前测试库真实告警数：21-27 条

### NewsPage 数据层修复（3 处根因）
- `entities` 对象数组 `[{name,type}]` 规范化为字符串，修复 React 渲染崩溃（列表全空）
- `tags_v2` 空对象 `{}` → 回退 v0.5 `tags` 数组
- `sort=time` → `published_desc`（后端只接受枚举），修复 400 Bad Request
- `getGlobalStats()` → `getSpaceStats(selectedSpace)`（404→200 + 字段对齐）

### 监控页三步改造
- **一键处理**：右上⻆调用 `PATCH /v1/alerts/batch`（`status=acknowledged`），confirm 二次确认
- **日志染色**：ERROR 整行红 + 消息红字 / WARN 整行黄 / INFO 默认；级别 Badge 用现有 shadcn variant
- **告警→日志跳转**：点击「关联日志」→ 切日志 Tab → 顶部蓝条「已定位到告警相关日志」+ 60s 时间窗 + 关键词过滤 → 命行左侧蓝条 + 蓝色底色 + Target 图标 → `scrollIntoView`
- 告警卡片美化：左色条 + 严重度图标盒（AlertCircle/AlertTriangle/Info）+ 相对时间 + 幽灵按钮 + hover 微浮

### 添加位置弹窗
- 新建 `components/ui/AddPlacementDialog.tsx`（复用 shadcn Dialog/Select/Button/Label）
- 语义区别于 AddSourceDrawer（"为源添加位置" vs "在空间-频道下加源"）
- 兼容性：`sourceName?` / `existingPlacements?`（防重复）/ `onConfirm` 回调把 API 控制权交调用方
- `SourceDetailPage.tsx:457` TODO 已关闭

### UI 组件库纪律（已记录，不执行）
- Owner 提出三原则：复用优先 / 集中存放 / 兼容性 → 记入 `memory/ui-component-library-discipline.md`
- Owner 拍板：v0.6 联调精修完成后才启动专项提取，本次不执行
- 布局重构方案（左中右 app shell + 导航融合 + 按页定宽 + 触发右抽屉）已讨论定方向，记入同一 memory
- 本次 AddPlacementDialog 率先按纪律执行（复用/集中/兼容），commit message 含「复用：shadcn Dialog 等 4 件；新建：1；改造：0」

### Git 节点
- 前端变更 6 文件：RootLayout / NewsPage / MonitoringPage / SourceDetailPage / api.ts / AddPlacementDialog
- 文档变更：developer-current.md / v0.6.md / INDEX.md / memory 增补
- 未推送（收尾 commit 完成后一起推送）

### 下一步
- Owner 浏览器验证 test 环境完整功能后 → 放开 worker 跑 v0.6 评分/标签数据 或 切换到服务器做 OpenClaw 集成
- UI 组件库专项 + 左中右布局重构：v0.6 收尾后单独启动

---

## 2026-06-13 — v0.6 前端联调 + 独立测试环境 + systemd 持久化

- 本次角色：全栈开发（Developer）；模式：实现阶段 前端联调 + 测试环境搭建（Owner 指定）
- 前后端合并：`git pull` 合入后端会话 11 commit（批 A+B+C），线性无冲突
- 独立测试环境（Owner 要求隔离联调）：`news_test` 库（5432，迁移 0000-0005 + 生产数据副本排除 tasks）+ `news-api-test.service`（:8001 / news_test / 关 scheduler / systemd 开机自启+崩溃自愈）+ test nginx `/v1`→8001 + certbot HTTPS；生产 8000 已停（Owner 同意）
- 前端 4 页 mock→真实 /v1 API：News / Monitoring / SourceDetail / Admin(空间管理+信息源库)；v0.6 空字段(score_total/tags_v2)降级 v0.5(importance_score/tags/entities)；修 entities 对象数组显示成 JSON 的 bug
- 主题色 bug：旧 `style.css` 的 `--primary(#3498db)` 覆盖原型 `#030213`，调 `main.ts` 引入顺序修复（AI 按钮 rgb(3,2,19) 验证）
- NewsPage 按 Owner 更新后的原型重做：居中列表 `max-w-[800px]` + 挤压式滑入详情面板（NewsDetailPanel）
- 写操作接真实 API：源详情 删除(deleteSource)/展示位置 暂停恢复移除(toggle/removeDisplayPosition)、信息源库 刷新/同步X规则(syncXRules)
- Git 节点：a193458..4b95e8d（前端联调 + 测试环境 + 精修批1/2）
- 剩余精修（交后续）：空间页写操作(源暂停移除、空间/频道 增删改)+ 对话框完整化(编辑空间/频道/添加源)+ NewsDetailPanel 小瑕疵
- 下一步：Owner「先收口再继续」，收口后继续剩余精修

---

## 2026-06-13 — v0.6 实现阶段 R1：后端全量实现（批次 A+B+C）+ OpenClaw 调研 + 收尾

- 本次角色：全栈开发（Developer）
- 模式：标准迭代 v0.6 实现阶段 R1（Owner 指定只做后端，不做前端）

### 批次 A · 数据层 + 测试基建
- drizzle schema 扩展：`raw_items` ×9 列（L0/L1 状态）+ 2 部分索引、`processed_news` ×6 列（jsonb 增量）、`channel_spaces` ×2 列（图标上传）、`tasks.last_error_kind`
- 手写迁移 `0005_v0.6_l0_l1_schema.sql`（本地无 PostgreSQL，无法跑 `drizzle-kit generate`）
- #D12 历史保护 DML：`UPDATE raw_items SET l1_status='completed'` 覆盖存量 processed_news
- 恢复 vitest 配置（`include` → `src/__tests__/`）+ `.env.test` 独立测试库

### 批次 B · 后端 Worker
- `llm.ts`：`callLLM<T>` 通用 helper（双模型 + 重试 + token 用量日志）+ `processLLM` 重构为封装 + `classifyL0LLM` / `processL1LLM`
- `dispatcher.ts`：BACKOFF_CONFIG type 分支退避 + `requeueTask` 终态处理（`setL0Failed` / `setL1FinalFailed`）+ workerLoop 5 claim 分支（fetch/process/l0_classify/l1_process，#D11 不含 l1_retry）+ X 源专属 L0 路由
- `l0-classifier.ts`（新建）：规则引擎（5 条）+ LLM 语义判定 → L1 task 创建
- `l1-processor.ts`（新建）：5 阶段串行（KB ILIKE → 链接 fetch → 外部搜索 P2 空壳 → LLM 主调用 → 写库+fan-out）+ 综合分加权计算（T×0.25+I×0.35+C×0.25+X×0.15）
- `l1-monitor.ts`（新建）：AC-32 4 类告警
- `config.ts`：+6 个 v0.6 env（L0/L1 model、timeout、L1_CONCURRENCY）
- `index.ts`：`l1Sem` 独立并发池

### 批次 C · 后端 API
- 新增 6 endpoint：`GET /v1/news/:id` 完整详情、`POST/DELETE /v1/spaces/:id/icon`（multipart 上传/删除）、`GET /v1/sources/:id/level-status-counts`、`GET /v1/global-level-status-counts`（#D5 落点）、`POST /v1/l1-tasks/:task_id/retry`（#D11 手动重试 → l1_process）
- 修改 3 endpoint：`GET /v1/news` 列表扩展 score_total/tags_v2/source + 扁平兼容字段、`GET /v1/stats` v0.6 口径（l1_status='completed'）+ 前端契约对齐（SpaceStats / StatsOverview）、alerts type 新增值兼容
- 依赖：`@fastify/multipart`

### 前端契约对齐修复
- stats 字段名：从 `today_completed/total_completed/enabled_sources/channels` 改回前端期望的 `today_new/total_news/active_sources/channel_count` + 全局 `StatsOverview` 五字段
- news 字段：保留 `source_id`/`source_display_name`/`raw_item_id` 扁平字段 + 新增 `source: {id,name}` 嵌套对象，双向兼容

### LLM 日志增强
- `callLLM`：每次调用记录 model/prompt_len/retries/timeout，成功后 latency/parse方法/token用量，重试 warn，耗尽 error
- L0/L1：记录 source/attention/raw_len/kb_count/上下文来源 + 四维评分 + 综合分加权公式分解
- logger.ts：Console 传输层 `info`→`debug`，所有级别终端可见
- index.ts：Worker 60s 心跳日志

### OpenClaw 调研
- 已确认服务器部署 OpenClaw Gateway（18789 端口），WebSocket 协议 + CLI（`npx openclaw` v2026.6.6）
- CLI 已验证：`agent` 子命令支持 `--json` 结构化输出
- #D11 定案：v0.6 L1 Stage 3 保持空壳；L1 处理链路后续替换为 OpenClaw Agent 调用
- SSH 隧道已配置（`ssh -L 18789:localhost:18789`），认证 token 在服务器本地，需在服务器侧直接运行 CLI
- 待切换到服务器验证：Agent 配置、模型可用性、结构化输出格式是否符合 l1-processor 写入契约

### 部署
- 迁移已在服务器执行（`0005_v0.6_l0_l1_schema.sql`），`raw_items`/`processed_news`/`channel_spaces`/`tasks` 全部新列已就绪
- 后端 API 全量端点验证通过（8/8 + stats 修复）
- `tsc --noEmit` 0 错误
- 未推送（本地领先 origin/main 8 commits）

### Git 节点
```
8a26828 待办登记
d5658de 日志增强
26c568b LLM 日志
d224093 契约对齐
4f4cae6 stats 修复
8b2f437 v0.6.md sync
6e813ab 批次 C
66e771a v0.6.md sync
190ad77 批次 B
d11fae8 批次 A
```

### 下一步
- 切换到服务器 → OpenClaw Agent 集成验证 → v0.6 迭代关闭或 v0.7 规划
- 前端（批次 D）：Owner 已指定 Developer 不做，由其他会话或其他角色承担

### 关联
- 关联迭代：v0.6（实现阶段 R1 后端完成，前端未启动，OpenClaw 待验证）
- 关联文档：`v0.6.md` 实现阶段 R1 门禁 / `v0.6-design.md` Review 条件承接状态
- 下一步入口：切换到服务器验证 OpenClaw → 决定 v0.6 关闭或继续


---

## 2026-06-13 — v0.6 实现阶段 R1：前端先行（Owner 调整）+ test 环境部署

- 本次角色：全栈开发（Developer）
- 模式：标准迭代 v0.6 实现阶段 R1（入场时设计 R2 已有条件定稿；Owner 中途将推进顺序调整为**前端先行**，后端暂停）
- Owner 前端规则（已落 memory `v0.6-frontend-rebuild-rules`）：**Vue + 1:1 还原原型 `/root/news-aggregation-platform` + 引入 Tailwind v4/shadcn 主题（显式偏离 UI spec §4.1，Owner 兼 PM 认可）+ 组件化可复用 + 4 页搭完一起 review**
- 已完成（`vite build` 0 错误 + playwright 截图自查 1:1 通过）：
  - Tailwind v4 底座 + 移植原型 shadcn 主题；路由/导航；`NewsPage` / `MonitoringPage` / `SourceDetailPage`(主体) 三页 1:1 还原；复用组件 `StatCard/ScoreBadge/Badge/NewsCard`；mock 层 `lib/mock.ts`
- 部署：test 测试环境 **http://test.huiyiyou.cloud**（HTTP，独立目录 `/var/www/test.huiyiyou.cloud`，nginx `sites-available/test.huiyiyou.cloud`）；⚠️ 生产 `news.huiyiyou.cloud` 的 `frontend/dist` 已被本会话 `vite build` 覆盖为 v0.6 开发版，恢复 v0.5 需 DevOps
- 剩余（交下一 5 小时周期新会话）：**AdminPage 双 Tab + 7 个子组件（2169 行）** + 源详情抽屉接入 + #D9 旧路由 `git rm`；完整交接见 `v0.6.md` 实现阶段「前端先行实施进展」段
- 用量说明：本 5 小时周期剩余 <20%，不足以做完 AdminPage（其工作量大于已完成的底座+3 页），交下个周期接续
- 跨角色提示：部署属 DevOps 域，本次 test 临时部署由 Owner 直接授权；生产 dist 被覆盖一事已在 `v0.6.md` 标注待 DevOps 决策
- 下一步：新会话 Developer 按 `v0.6.md` 交接段继续 AdminPage

---

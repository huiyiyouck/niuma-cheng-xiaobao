# 全栈开发工作日志 — 归档

> 旧日志归档。启动时默认不读，按需 grep。
> 最近条目见 `developer-current.md`；长期摘要和常见风险见 `developer-summary.md`。
> 归档时间：2026-07-29（v0.6.1 关闭后收尾，2026-06-13 至 06-28 共 10 条移入；上次 2026-06-09）

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

---

## 2026-06-08 — 信息源库搜索 500 修复

- 本次角色：全栈开发（Developer）
- 模式：Bugfix / 生产修复
- 触发：Owner 提供日志 `HTTP GET /v1/sources?search=Claude+code官方账号&page_size=20 → 500`

### 根因

- `/v1/sources` 搜索会同时匹配 `display_name`、`identity`、`notes`、`content_topics`
- 代码使用 `jsonb_array_elements_text(s.content_topics) AS t WHERE t ILIKE ...`
  - `t` 是表别名，不是文本列
  - 生产 X 同步源的 `content_topics` 当前为 `{}` 对象，`jsonb_array_elements_text` 只能展开数组
- 因此带 `search` 的请求触发 Postgres 异常：`cannot extract elements from an object`

### 修复

- `server/src/api/routes/sources.ts`：
  - 搜索 `content_topics` 时改为显式列别名 `AS topic(value)`
  - 仅当 `jsonb_typeof(content_topics) = 'array'` 时展开，否则按空数组处理
  - `total` 计数改为复用相同筛选条件，避免搜索分页总数不准

### 验证与部署

- `cd server && npm run build`：通过，`tsc` 0 错误
- `systemctl restart news-api.service`：已重启
- 本机 `/health`：200
- 本机和公网均验证：
  - `/v1/sources?search=Claude+code官方账号&page_size=20` → 200，返回 1 条 `Claude code官方账号`
  - `/v1/sources?page_size=20` → 200，返回 4 条
- `news-api.service` active

---

## 2026-06-08 — 生产前端字号与管理页视觉校准

- 本次角色：全栈开发（Developer）
- 模式：Bugfix / 视觉对齐
- 触发：Owner 反馈生产前端“字体有点小”，与运行图存在 UI 样式差异；功能符合预期

### 修改

- 全局视觉层 `style.css`：
  - `body` 增加 14px 基础字号和 1.5 行高
  - 页面标题、说明文字、按钮、筛选下拉、徽章、错误条、加载态、模态标题、表单标签/输入框、MiniTag、TypeBadge 统一上调一档
- 管理页关键组件：
  - `AdminTabs.vue`：Tab 字号 13px → 14px
  - `SpacePills.vue`：空间名称、空间统计、操作图标上调
  - `SpaceManagementTab.vue`：频道栏、当前上下文、频道计数、新建频道入口上调
  - `SourceCard.vue`：信息源卡片标题、元信息、身份、告警条、展示位置、移动下拉上调
  - `SourceLibraryTab.vue`：搜索框、统计、筛选提示上调
  - `SourceTable.vue` / `SourceTableRow.vue`：表头、行正文、信息源名称/身份、使用位置 hover 与 popover 上调
  - `StatusBadge.vue`、`Pagination.vue`：状态徽章和分页控件同步上调

### 验证与部署

- `cd frontend && npm run build`：通过，`vue-tsc` 0 错误，Vite 138 modules
- 软链接部署模式下 `frontend/dist` build 即上线
- 新产物：`index-C86--L2V.js` / `index-Dj2gUCgE.css`，`AdminPage-Cn6FLtJ0.js` / `AdminPage-CDelNH4K.css`
- `nginx` active，`news-api.service` active

---

## 2026-06-08 — 前端动态 import 旧 chunk 兼容修复

- 本次角色：全栈开发（Developer）
- 模式：Bugfix / 临时部署修复
- 触发：Owner 浏览器报错 `TypeError: Failed to fetch dynamically imported module: https://news.huiyiyou.cloud/assets/NewsPage-CjeHC2FU.js`

### 根因

- 线上 HTML 已更新到 `/assets/index-BgpYEGiZ.js`，但浏览器仍缓存旧入口 `/assets/index-DWBXrqru.js`
- Vite 默认 build 会清空 `dist/assets`，旧入口引用的懒加载 chunk（如 `NewsPage-CjeHC2FU.js`）被删除
- nginx 原配置对不存在的 `/assets/*.js` 也会 SPA fallback 到 `index.html`，动态 import 会拿到 HTML 或失败

### 修复

- 生产 `frontend/dist/assets` 补回旧入口可能引用的 chunk 兼容副本：
  - `NewsPage-CjeHC2FU.js`
  - `AdminPage-DsflA_7q.js`
  - `BaseButton-BC0alJHh.js`
  - `EmptyState-CKMjG1m6.js`
  - `LoadingState-BoFPC-Lf.js`
  - `LogsPage-QNntuyJf.js`
  - `AlertsPage-YHRnXhjU.js`
  - `SourceDetailPage-BDZtCarT.js`
- nginx `news.huiyiyou.cloud` 配置：
  - `/assets/` 不存在直接 404，不再 fallback 到 `index.html`
  - `/index.html` 和 SPA fallback 增加 `Cache-Control: no-cache, no-store, must-revalidate`
  - hash 静态资源保留长期缓存
- `frontend/vite.config.ts` 设置 `build.emptyOutDir = false`，后续 build 保留旧 hash 资源，避免缓存旧入口时 chunk 丢失

### 验证

- `nginx -t`：通过
- `systemctl reload nginx`：完成，`nginx` active
- `cd frontend && npm run build`：通过，旧兼容 chunk 未被删除
- `news-api.service` active

---

## 2026-06-08 — 管理页原型对齐：信息源库表格与空间显示修复

- 本次角色：全栈开发（Developer）
- 模式：Bugfix / 原型对齐（非迭代）
- 触发：Owner 反馈“空间管理中的空间怎么更新没了”“信息源库也要跟原型图保持一致”“信息源没有展示上去”

### 修改

- `SpaceManagementTab.vue`：
  - 补回 `SpacePills` 组件导入，修复空间管理页空间选择区渲染异常
- `SourceLibraryTab.vue`：
  - 信息源库从卡片列表切回既有 `SourceTable` 组件，避免卡片/表格两套主渲染路径重复
  - 保留并复用 `BaseButton`、`FilterSelect`、`Pagination`、`SlidePanel`
  - 修复可用性筛选参数映射：前端 `awaiting_repair/source_removed` 转成后端 `needs_fix/removed`
- `SourceTable.vue` / `SourceTableRow.vue`：
  - 表格列按 v0.5 原型拆为“信息源 / 类型 / 标签 / 可用性 / 运行 / 使用位置 / 最近抓取 / 历史新闻 / 操作”
  - 复用 `StatusBadge`、`TypeBadge`、`MiniTag`、`BaseButton`
  - 使用位置显示“ N 个位置（M 启用）”，hover 展示空间、频道、启用状态明细
- `server/src/api/routes/sources.ts`：
  - `GET /v1/sources` 列表补返回 `display_positions` 明细，支撑信息源库表格“使用位置”列
  - 补齐 Source 详情 positions SQL 的 `channel_space_id/channel_id`

### 生产数据修复

- API 确认空间仍存在：`AI`、`财经`
- 发现频道被更新后只剩 `AI/模型动态` 和 `财经/Web3`
- 已补回原型频道：
  - AI：行业资讯、开源项目、学术前沿（保留模型动态）
  - 财经：宏观政策、市场动态、行业资讯、公司资讯（保留现有 Web3，不覆盖 Owner 现有分配）

### 验证与部署

- `cd frontend && npm run build`：通过，`vue-tsc` 0 错误，Vite 138 modules
- `cd server && npm run build`：通过，`tsc` 0 错误
- `systemctl restart news-api.service`：已重启
- `systemctl is-active news-api.service`：`active`
- 本机 `/v1/sources?limit=4`：已返回 4 个信息源，且每条带 `display_positions`
- 本机 `/v1/spaces`：`AI channel_count=4`，`财经 channel_count=5`
- 说明：本机访问 `https://news.aivc.xiaobao.me` 当前连接失败，但本机后端 API 与服务进程正常；需后续观察外部反代/TLS 链路

---

## 2026-06-08 — 管理页原型对齐：空间卡片与分栏细节

- 本次角色：全栈开发（Developer）
- 模式：Bugfix / 原型对齐（非迭代）
- 触发：Owner 要求“管理里面需要根据原型图进行修改，尽量跟原型图保持一致”

### 修改

- `SpacePills.vue`：
  - 空间选择区改成更接近原型的卡片式样式，补“空间排序”图标按钮外观
  - 新建/编辑空间弹窗支持描述字段
  - 卡片圆角、间距、图标框和操作按钮收紧到原型风格
- `SpaceManagementTab.vue`：
  - 空间卡片区包裹为原型里的 `pill-section`
  - 左右分栏改为固定 240px 频道栏 + 自适应信息源列表
  - 频道栏增加排序图标按钮外观，整体边框/圆角/行高对齐原型
- `SourceCard.vue`：
  - 删除重复渲染的多展示位置操作块，避免管理页出现两组相同操作

### 验证与部署

- `cd frontend && npm run build`：通过，`vue-tsc` 0 错误，Vite 132 modules
- 软链接部署模式下 `frontend/dist` 构建即上线
- 公网首页已引用新 bundle：`/assets/index-Cn1YU1yc.js`

---

## 2026-06-08 — v0.5 Bugfix：X Stream fetch failed 误告警

- 本次角色：全栈开发（Developer）
- 模式：Bugfix（非迭代，v0.5 生产运行中发现问题）
- 触发：告警 `x_stream_disconnected` — X Stream 连续断开 7 次 `"fetch failed"`
- 记录：[2026-06-08-bugfix-x-stream-fetch-failed-alert.md](../ad-hoc/2026-06-08-bugfix-x-stream-fetch-failed-alert.md)

### 根因

上一轮只把 `reader.read()` 阶段的 `"terminated"` 识别为服务器/代理层长连接轮转；生产中 `fetch()` 建连阶段或代理 socket 层抛出的 `"fetch failed"` 仍进入通用异常分支，连续 3 次后生成 `x_stream_disconnected` 告警。

### 修复

`server/src/worker/x-stream-manager.ts` 新增瞬时断流分类：

- 递归收集 `err.message` / `err.code` / `err.cause`
- 将 `terminated`、`fetch failed`、`ECONNRESET`、`ETIMEDOUT`、`EPIPE`、`UND_ERR_SOCKET`、undici connect/header/body timeout 等识别为长连接常规重连路径
- 对上述错误清零 `consecutiveDisconnects`，1s 快速重连，不创建 `x_stream_disconnected` 告警
- 保留 HTTP 401/403、429 和非瞬时异常的原告警路径

### 验证

- `cd server && npm run build`：通过，`tsc` 0 错误
- 未执行 `npm test` 作为有效验证：当前项目因 2026-06-08 生产库误删事故已禁用 vitest 集成测试，恢复测试前必须先建立独立 test DB

### 后续

- 待 DevOps 部署后观察生产日志：`fetch failed` 应只写 `X STREAM transient network failure, reconnecting without alert`，不再生成 `x_stream_disconnected`

### 追加诊断与修复：断流期间漏收

进一步检查日志和代码后确认：断流确实会导致收不到信息。

- 日志显示 2026-06-08 `03:01:02Z` 到至少 `03:14:40Z` 持续 `fetch failed`，无 `X STREAM connected`
- 同时 `X RULE SYNC initial failed: fetch failed`，说明到 X API/代理链路实际不可达
- `scheduler.ts` 此前排除了 `x_twitter`，设计中的 timeline 补偿抓取没有运行

已追加修复：

- `scheduler.ts` 移除 `s.type != 'x_twitter'`
- `policyEverySeconds()` 对 `x_twitter` 优先使用 `compensation_interval_sec`，默认 24h
- 后续启用展示位置的 X Source 会周期性创建 fetch task，通过 user timeline API 补抓断流窗口内容，并用 `source_item_id` 去重

验证：`cd server && npm run build` 通过。

### 临时部署（Owner 授权）

Owner 明确表示本次属于 Bugfix 阶段并授予 Developer 临时部署权限，不切换常规 DevOps 流程。

部署结果：

- `server npm install --no-audit --no-fund`：up to date
- 发现 `news-api.service` failed 但 `/health` 可用，根因是残留手工 Node 进程 `622361` 占用 8000，systemd 重启时报 `EADDRINUSE`
- `kill -TERM 622361` 后端口释放
- `systemctl reset-failed news-api.service`
- `systemctl restart news-api.service`
- `news-api.service` 已恢复 `active (running)`，MainPID `629597`
- 本机 `/health`：`{"status":"ok"}`
- 公网 `/v1/alerts/unread-count`：200
- 日志确认 `X RULE SYNC done: +0 ~4 -0 ↻0` + `X STREAM connected`

追加发现：4 个 X Source 当前 `enabled_positions=0`，所以即使后端 Stream 已恢复，前端空间/频道列表仍不会展示这些账号内容；需要 Owner 在 UI 里把 X Source 添加到空间/频道展示位置。

### 生产空间初始化

Owner 要求“根据原型图把空间创建好”。已在生产库创建：

- 空间：AI、财经
- AI 频道：模型动态、行业资讯、开源项目、学术前沿
- 财经频道：宏观政策、市场动态、行业资讯、公司资讯
- 展示位置：
  - OpenAI官方账号 → AI / 模型动态
  - Claude code官方账号 → AI / 模型动态
  - 加密狗 → 财经 / 市场动态
  - Solanamobile官方账号 → 财经 / 公司资讯

验证：

- 公网 `/v1/spaces` 返回 AI、财经，均 `channel_count=4`、`source_count=2`
- X 补偿抓取已触发：openai 20、anthropicai 20、solanamobile 19、jiamigou 15
- 新闻已生成并 fan-out：AI / 模型动态 40 条，财经 / 公司资讯 19 条，财经 / 市场动态 15 条
- `process` 队列清零

注意：当前 DB 唯一索引仍限制同一 Source 在同一空间只有一个活跃展示位置，本次未绕过约束。

---

## 2026-06-08 — 生产事故：npm test 清空数据库 + 紧急止血

- 本次角色：全栈开发（Developer）
- 模式：Incident（生产数据丢失）
- 触发：用户反馈浏览页面只剩"统计空间"，无频道、无 Source、无新闻
- commit：`64d052b`

### 事故根因

`vitest` 直连生产数据库 `localhost:5432/news`（`server/.env` 的 `DATABASE_URL`），测试 helpers `cleanTestData()` 在 `beforeAll` 中 `DELETE FROM` 全部 11 张表。2026-06-08 09:26 跑 `npm test` 验证 X Stream 修复时触发。

### 数据损失

| 表 | 状态 |
|----|------|
| channel_spaces | 全部丢失（只剩测试创建的"统计空间"） |
| channels | 全部丢失 |
| sources（手动创建） | 全部丢失 |
| display_positions | 全部丢失 |
| processed_news / raw_items / tasks / alerts 等 | 全部丢失 |
| sources（X 同步） | XRuleSyncer 启动后从 X Portal 恢复（09:44） |

无备份、无 WAL 归档，数据不可恢复。

### 止血措施

`vitest.config.ts`：`include` 指向不存在的 `__tests_disabled__/` + `passWithNoTests: true`，`npm test` 现在 exit 0 不执行任何测试。恢复需：独立 test DB + `.env.test` + 改回 include。

### 遗留

- 需重建空间/频道/非 X Source 数据（用户手动操作）
- 4 个已有测试失败（v0.5.1 后未同步），与本次无关
- 建议长期方案：`vitest` 用独立 test DB + 事务回滚代替 DELETE

---

## 2026-06-08 — v0.5 Bugfix：X Stream terminated 误告警 + sources.ts TS2367 死代码

- 本次角色：全栈开发（Developer）
- 模式：Bugfix（非迭代，v0.5 生产运行中发现问题）
- 触发：告警 `x_stream_disconnected` — X Stream 连续断开 4 次 "terminated"
- commit：`3f6454a`

### 根因

X Filtered Stream 长连接，Twitter 服务器/代理层周期性轮转 TCP 连接，`reader.read()` 抛 `"terminated"` 是正常行为。代码把所有非 AbortError 异常都计入 `consecutiveDisconnects`，连续 3 次触发误告警。

### 修复

| 文件 | 改动 |
|------|------|
| `x-stream-manager.ts` | `"terminated"` 错误直接 return（不计入计数器），connectLoop 快速重连（1s） |
| `worker/index.ts` | `ProxyAgent` 加 `bodyTimeout: 0`，禁用 undici body 超时 |
| `sources.ts` | 删除 POST/POST verify 中 2 处 `x_twitter` 死代码分支（v0.5.1 已在上方 return 400 拦截），修复 TS2367 |

### 验证

- `tsc --noEmit`：0 错误 ✅（修复前 2 个 TS2367）
- `npm test`：53 tests, 49 passed / 4 failed（4 个失败全部已有问题，stash 验证确认）
- push：已推送 origin/main

### 遗留

- 4 个已有测试失败（`channel-spaces migrate_to_root 409` + `sources RSS 创建` + `X Twitter 创建` + `Source 详情`），推测 v0.5.1 后测试数据/逻辑未同步更新，不阻塞本次修复，下次 Developer 出场可顺带修复

---

## 2026-06-07 — v0.5.1 前端 TS 错误 P0 全部解除（删除门禁后半段）

- 本次角色：全栈开发（Developer）
- 动作：执行 Architect ✅通过 的删除请求 + 构建验证 + 移交 DevOps
- 触发：Architect Review 通过 5 个孤儿组件删除请求（见架构师日志 2026-06-07 / commit `b02cbd4`）

### 执行步骤

1. **删除 commit（`a79acfb`）**——按 Architect 执行条件严格落实：
   - 标题第一行含「删除」字样
   - body 含完整删除清单 + Review 留痕（架构师 ✅通过 + architect.md 日期/条目索引）
   - 与 9 个正用文件修复 commit（`ebd9d1e`）**完全分开**
   - 不夹带 `ChannelPills.vue`（Architect 已提醒同属孤儿但本次不在 Review 范围；下次另起 Review）

   ```
   git rm 5 个 .vue 文件 → 5 files changed, 759 deletions(-)
   ```

2. **构建验证**：`npm run build` exit 0
   - vue-tsc：0 错误（原 31 错误全部清零）
   - vite build：135 modules transformed → dist/ 完整产出
   - 产出 size：index 114k js / 11k css（gzip 43.6k / 2.8k）

3. **push**：`ebd9d1e` + `b02cbd4`（Architect 留痕代提）+ `a79acfb` 三 commit 全部 push origin/main

### 顺手登记的提醒（来自 Architect Review）

`ChannelPills.vue` 实际全仓零引用（NewsPage 频道筛选已完全内联 `.cc-pill`），与本次已删的 `ChannelFilter.vue` 同属孤儿。**不在本次 Review 范围**，建议在下次合适时机另起一次受保护路径删除 Review 请求处理。已在 INDEX 跨任务待办登记 P2。

### 移交 DevOps

- 前端代码 + dist 已就绪
- 下一步：DevOps 把 `frontend/dist/` 同步到生产 `/var/www/news.huiyiyou.cloud/`
- 关联迭代：v0.5（v0.5.1 部署阻塞最终解除）
- 关联 commits：`ebd9d1e`（修复 9 个正用文件）+ `b02cbd4`（Architect Review 留痕）+ `a79acfb`（删除 5 个孤儿）+ `cda1a75`（收尾归档）+ `f5baf99`（ChannelPills 申请，已撤回）+ `e35bcf1`（ChannelPills 删除 + 撤回申请）

### 追加：ChannelPills.vue 处理（第 6 个孤儿 · Owner 直接同意路径）

Architect Review 时附带观察到的第 6 个孤儿（`ChannelPills.vue`，自身 TS 编译通过、不阻塞构建、零引用），最初按规范提交了独立删除 Review 申请（`f5baf99`）。Owner 在会话中明确：作为项目负责人，已确认零引用 + 已在 ad-hoc 登记的死代码可直接同意，无需再走 Architect Review（依据 `conventions.md §受保护路径删除门禁 §例外情况` 第 3 条）。

执行（`e35bcf1`）：
- `git rm` `ChannelPills.vue`（244 行）+ 同时撤回申请文档
- commit body 含「删除清单」+「Review 跳过路径说明」（援引 conventions.md 例外条款 + Owner 直接授权）
- 构建验证：`npm run build` 仍 0 错误

### 遗留问题/风险

- **[基线修正提案] v0.5 重构留 6 个孤儿前端组件未及时删除（5 个直接阻塞 + 1 个静默死代码）**——根因是 `role-developer.md §跨轮契约变更同步` 基线只覆盖了「砍后端能力时前端 grep 引用扫描」，没覆盖「前端重构替代旧组件时清理旧文件」。**建议方案**：在 §跨轮契约变更同步 节追加一条「前端组件替代时必须同步删除被替代组件」规则，要求 commit 包含 `grep -rn "OldComponent" frontend/src/` 零引用证明（类似已删 API 的对称约束）。本次会话内已通过事后 6 文件删除消化历史欠账，但机制层面仍有缺口。建议 WM 启动会话时扫到本提醒后处理。

- **[移交 DevOps] 前端 dist 部署到生产服务器**——本地 dist 已构建（135 modules，gzip 43.6k js / 2.8k css），等待 DevOps 同步到 `/var/www/news.huiyiyou.cloud/`。整个 v0.5/v0.5.1 部署能否最终关闭迭代取决于这一步 + Owner 浏览器验证。

---

## 2026-06-07 — v0.5.1 前端 TS 错误修复（P0 阻塞解除前半部分）

- 本次角色：全栈开发（Developer）
- 动作：Bugfix（v0.5 重构遗孤）+ 提交删除请求
- 触发：2026-06-07 DevOps v0.5.1 上线时 `npm run build` 失败（31 个 TS 错误），公网前端仍是 5-31 旧版本，阻塞 v0.5/v0.5.1 前端验证

### 错误分类盘点

- 31 个 TS 错误来自 14 个文件，分两类：
  - **A. 5 个孤儿组件（22 个错误）**：v0.5 重构后被新版组件完全替代，`src/` 内零引用，但旧文件未删除
    - `InlineAddSource.vue` → `SearchSourceModal.vue` + `SourceCreateForm.vue`
    - `SubChannelManager.vue` → `SpaceManagementTab.vue` 内置频道列表
    - `VerifyDialog.vue` → `SourceVerifyDialog.vue`
    - `ChannelFilter.vue` → `ChannelPills.vue` + NewsPage 内置 context-card
    - `SearchFilterBar.vue` → `SourceLibraryTab.vue` 内置筛选 + `FilterSelect.vue`
  - **B. 9 个正用文件（9 个错误）**：可直接修复

### 本会话已完成（B 类 9 个错误清零）

| 文件 | 修法 |
|------|------|
| `SourceCreateForm.vue` | `"research"` → `"paper_institute"`（对齐 `SourceRole` 类型） |
| `SourceLibraryTab.vue` | 同上 + 删未使用 `UUID` import |
| `SourceDetailPage.vue` | 同上 + 删未使用 `Space/Channel/BaseFormField` import + template 中 `source` 加 non-null 断言 |
| `SpaceManagementTab.vue` | `ChannelDeletePreview` fallback 对齐新形状（`position_count/has_space_root_position`） |
| `SpacePills.vue` | `SpaceDeletePreview` fallback 对齐新形状（`channel_count/position_count/news_count`） |
| `api.ts` | `mapLifecycleStatus`/`domain_tags` 加类型断言 |
| `NewsListItem.vue` | 删未使用 `ref` import |
| `SearchSourceModal.vue` | 删未使用 `typeLabel` 函数 |
| `NewsPage.vue` | 删未使用 `SpacePills/ChannelPills` import |

构建验证：`npm run build` exit 2，剩余 17 个错误全部集中在 5 个孤儿文件中（B 类清零）。

### 待 Architect Review（A 类）

按 `docs/baseline/conventions.md §受保护路径删除 Review 门禁`，`frontend/src/` 删除必须经架构师 Review。已提交：
- 删除请求：[`ad-hoc/2026-06-07-developer-delete-request-orphan-frontend-components.md`](../ad-hoc/2026-06-07-developer-delete-request-orphan-frontend-components.md)
- INDEX 已登记：当前非迭代工作 + P0 待办状态更新为 🟡

Owner 已明确："不允许加 @ts-nocheck 绕过，部署推迟到 Architect 删除后"——本会话 Developer 严格遵守，未对孤儿文件做任何修改。

### 顺手扫尾的契约一致性

`"research"` 标签在 3 处出现（`SourceCreateForm.vue` / `SourceLibraryTab.vue` / `SourceDetailPage.vue`），后两处虽然 TS 没报（string literal 数组未声明类型），但若不一并修改，"角色筛选"和"详情页角色编辑"运行时会失效（后端只认 `paper_institute`）——属于"本次任务必须扫尾"范围，一并修复。

- 关联迭代：v0.5（v0.5.1 部署阻塞解除工作）
- commit：待提交（待 Architect Review 完成后，删除 commit 与本修复 commit 一起 push）
- 下一步：Owner 切换 Architect 角色 Review 删除清单 → Developer 接力执行 git rm + commit + 构建验证 → DevOps 重新部署

---

## 2026-06-07 — v0.5 Owner 试用 Bugfix 批次 + 收尾

- 本次角色：全栈开发（Developer）
- 动作：Bugfix + 功能补全 + 会话收尾归档
- 触发：Owner 浏览器试用 v0.5，逐页走查发现问题

**前后端契约对齐（根因：v0.5 实现阶段前后端字段名/URL 全面不匹配）**：
- 空间管理：Channel API URL 修正（updateChannel/deleteChannel 补 spaceId）、DisplayPosition toggle/remove/move URL 对齐后端 PATCH 路由
- 详情页：Source 字段名统一（lifecycle_status→availability_status, identity→source_identity, positions→display_positions）、后端 API 结构从嵌套改平面
- 全局：api.ts 中 createSpace/updateSpace/listSpaceSources/addDisplayPosition/batchUpdateAlerts 等十余处契约修正

**空间/频道/源管理**：
- 频道新增 description 字段（全栈：DB 迁移 → schema → 路由 → 前端表单）
- 新建频道弹窗标题显示所属空间名
- SourceCard 全部视图显示归属频道 + 位置切换下拉（移动功能）
- 空间根节点 Source 移除按钮修复
- 移除后刷新频道计数

**信息源库**：
- 重复「新建信息源」按钮去重
- 表格改卡片（SourceLibraryCard）+ 单列全宽
- 新建源从内联改为 SlidePanel 侧边抽屉
- SearchSourceModal 已添加源灰显 + 禁用
- 空 domain_tags 兼容（{}→[]）

**详情页**：
- 按原型重构双栏布局：基本资料/标签与备注/抓取状态/身份变更历史（左）+ 使用概况/展示位置/操作（右）
- 标签与备注内联编辑（领域/角色/级别/备注）
- 「添加到空间」弹窗改为列表式（含已添加校验 + 重复防护）
- 全局暂停联动展示位置（已暂停遮罩 + 禁用按钮）
- 暂停/恢复按钮 tooltip 说明

**告警页**：
- 批量一键确认/忽略/恢复
- 计数按筛选条件修正（后端 total 之前不管 WHERE 条件）
- UI 重构（Tab Pill + 卡片式行 + 严重度圆点）

**Worker & 抓取**：
- Worker 串行改真正并行（fetchConcurrency + processConcurrency 个独立 worker）
- RSS 抓取从 rss-parser 内置 HTTP 改为 fetch（走全局代理）
- 全局代理配置统一到 Worker 入口（X_PROXY_URL / https_proxy）
- X Stream 429 限流 5 分钟退避
- 金十 MCP 协议接入（fetcher + processor 直显模式，不走 LLM）

**数据库**：
- channels.description 列 + 远程 DB 手动执行
- sources.display_name 唯一索引
- display_positions 空间级唯一约束（一个 Source 同一空间只能一个位置）

**新增文件**：
- `SourceLibraryCard.vue` — 信息源库卡片
- `SlidePanel.vue` — 侧边抽屉基础组件
- `jin10-mcp.ts` — 金十 MCP Fetcher
- `0003_channels_description.sql` / `0004_sources_display_name_unique.sql` — DB 迁移

- 关联迭代：v0.5
- commit：`75ca9ae`（31 files, +2483/-970）
- 遗留：金十 MCP 完整 UI 接入（待办 P1），频道图标（待办 P2），源级代理控制（待办 P2），空间图标上传（待办 P2）
- 下班；v0.5 Owner 试用 Bugfix 批次完成，准备上线部署

## 2026-06-06 — Developer 最终收尾

- 本次角色：全栈开发（Developer）
- 动作：会话级收尾归档
- 当日完整产出链：
  1. **PRD R1/R2 Review**
  2. **UI 方案 R1/R2 Review**
  3. **设计文档 R1/R2 Review**
  4. **全栈实现 R1/R2**（53/53 测试通过，3/3 Review 通过）
  5. **测试报告 R1 Review**（57/57 AC，零缺陷）
  6. **DevOps 部署反馈修复**（前后端契约对齐：路由+参数名+状态值）
  7. **原型图对齐**（全局字体/AdminTabs/弹窗/搜索栏/告警页/浏览页）
  8. **本地部署验证**（零 404）
  9. **清理 38 个编译残留文件**（`.vue.js`/`.js` 导致旧路由生效）
- 当日 commit：11 个
- 遗留：前端组件需进一步重构统一（空间管理卡片/弹窗/搜索栏风格已对齐，但组件级别仍有优化空间）
- 关联迭代：v0.5
- 下班；前端重构留待明天

## 2026-06-06 — Developer 会话收尾

- 本次角色：全栈开发（Developer）
- 动作：会话级收尾归档
- 当日 Developer 出场：1 段独立工作（v0.5 全流程）
- 当日产出链：
  1. **PRD R1/R2 Review**（Developer 视角：可实现性 + 工程成本）
  2. **UI 方案 R1/R2 Review**（交互复杂度 + 组件边界 + 实现成本）
  3. **设计文档 R1/R2 Review**（数据模型 + API 契约 + Worker 流程）
  4. **全栈实现 R1/R2**（后端 schema/API/Worker/X Stream Manager + 前端 17 组件/2 页面，53/53 测试通过）
  5. **测试报告 R1 Review**（57/57 AC 全覆盖，零缺陷）
- 当日 commit 总数：7 个
- 关联迭代：v0.5
- 下一步：DevOps 部署到本地 → 用户手动验收页面
- 下班；今天 Developer 棒交完，v0.5 实现+测试已完成，待 DevOps 部署

## 2026-06-06 — v0.5 测试报告 R1 Review

- 本次角色：全栈开发（Developer）
- 动作：Review
- 涉及文档：docs/progress/iterations/v0.5-test-report.md
- 结论：✅通过。57/57 AC 全覆盖，53/53 测试可复现，零缺陷，零阻塞。
- 遗留项评估：X Stream 实机验证/数据清理脚本生产执行/前端组件测试/并发竞争—均不阻塞迭代关闭
- 关联迭代：v0.5

## 2026-06-06 — v0.5 实现阶段定稿

- 本次角色：全栈开发（Developer）
- 动作：定稿
- R2 复审结果：PM ✅ / Architect ✅ / Tester ✅（3/3 通过）
- 最终验证：53/53 测试通过 / TS 零错误 / Vite Build 成功 / 跨轮契约干净
- 最终 commit：aca2922
- 关联迭代：v0.5
- 遗留：无，实现阶段已定稿，下一步进入测试阶段

## 2026-06-06 — v0.5 实现阶段 R2

- 本次角色：全栈开发（Developer）
- 动作：修改（响应 Tester R1 Review）
- base_commit：9b83263 → head_commit：aca2922
- 修复内容：
  - Bug：sources.ts `lifecycleStatus` 变量名 → `row.lifecycle_status`，修复 auto_add_to_space 静默失效
  - 测试：alerts 状态流转 5 个、channel-spaces migrate_to_root 2 个、sources identity 修改实现
  - 46→53 测试，全部通过
- 关联迭代：v0.5
- 遗留：等待 PM、Architect、Tester 复审 R2

## 2026-06-06 — v0.5 实现阶段 R1

- 本次角色：全栈开发（Developer）
- 动作：产出（全栈代码实现）
- base_commit：c70a5c8
- head_commit：9b83263
- 涉及范围：
  - **后端**：schema.ts 重写（11表+3新表）、6组API路由重写、Worker per-source 调度重构、X Stream Manager 新建、数据清理脚本、drizzle 迁移、46/46 测试通过
  - **前端**：17 新组件、2 新建页面（AlertsPage/SourceDetailPage）、管理页重写、App.vue TopNav 改造、NewsPage 微调、废弃 5 旧组件、TypeScript 零错误 + Vite 构建成功
  - **调试修复**：source-detector.ts enum→const 对象、news.ts DISTINCT ON 排序修复、sources.ts CTE 重写为简单子查询、channel-spaces.ts 重名 409 处理、sources 创建不自动验证、vitest 文件并行改顺序执行
  - **数据库**：SSH 隧道连接副数据库、v0.5 迁移已执行
- 关联迭代：v0.5
- 遗留：等待 PM、Architect、Tester Review

## 2026-06-06 — v0.5 设计文档 R2 Review

- 本次角色：全栈开发（Developer）
- 动作：Review（复审）
- 涉及文档：docs/progress/iterations/v0.5-design.md、docs/progress/iterations/v0.5.md
- 结论：✅通过。R1 全部 5 条意见（1 阻断/2 中/2 低）已正确关闭。
  - #D1 部分唯一索引修复 NULL 语义
  - #D2 DELETE→PATCH 软删除一致性
  - #D3 新增 §4.6 频道迁移完整事务
  - #D4 CTE 实现模式标注
  - #D5 身份修改两步流程 + 补偿说明
  - R2 新增内容（频道迁移逻辑/环境变量/Stream-systemd 交互）均可实现
- 关联迭代：v0.5
- 遗留：无。设计文档已达到实现阶段准入标准，等待 DevOps Review。

## 2026-06-06 — v0.5 设计文档 R1 Review

- 本次角色：全栈开发（Developer）
- 动作：Review
- 涉及文档：docs/progress/iterations/v0.5-design.md、docs/progress/iterations/v0.5.md
- 结论：❌需修改。1 项阻断 + 2 项中 + 2 项低。
  - 阻断：#D1 display_positions UNIQUE 约束在 channel_id IS NULL 时因 PostgreSQL NULL 语义允许重复。
  - 中：#D2 DELETE /api/positions 端点命名与软删除不一致；#D3 频道删除迁移逻辑未展开。
  - 低：#D4 operational_status 计算字段筛选的 SQL 复杂度；#D5 Source 身份修改的事务边界。
- 关联迭代：v0.5
- 遗留：等待 PM、DevOps Review + Architect 修改后复审。

## 2026-06-06 — v0.5 UI 方案 R2 Review

- 本次角色：全栈开发（Developer）
- 动作：Review（复审）
- 涉及文档：docs/progress/iterations/v0.5-ui-spec.md、docs/progress/iterations/v0.5.md
- 结论：✅通过。R1 全部 4 条意见（1 中/3 低）已正确关闭。
  - #UI-D1 Pill 拆分为 PillItem + PillInput 子组件，编辑/排序互斥
  - #UI-D2 排序降级为箭头按钮，拖拽留后续迭代
  - #UI-D3 表格响应式改为 overflow-x: auto 横向滚动
  - #UI-D4 impact 改为结构化 Props，避免 v-html
  - R2 新增 §10 API 契约清单（6 组 20+ endpoint）可实现性良好
- 关联迭代：v0.5
- 遗留：无。UI 方案已定稿，Architect + Developer 双通过。

## 2026-06-06 — v0.5 UI 方案 R1 Review

- 本次角色：全栈开发（Developer）
- 动作：Review
- 涉及文档：docs/progress/iterations/v0.5-ui-spec.md、docs/progress/iterations/v0.5.md
- 结论：❌需修改。1 项中严重度 + 3 项建议。
  - 中：#UI-D1 SpacePills/ChannelPills 单个 Pill 承载六种交互，组件边界模糊，拖拽与编辑态交叉未定义。
  - 低：#UI-D2 拖拽排序未明确技术方案（原生 vs 库）；#UI-D3 表格→卡片响应式需维护两套渲染逻辑；#UI-D4 DeleteConfirmDialog impactSummary HTML 支持存在 XSS 风险。
- 关联迭代：v0.5
- 遗留：等待 Architect Review + UI 修改后复审。

## 2026-06-06 — v0.5 PRD R2 Review

- 本次角色：全栈开发（Developer）
- 动作：Review（复审）
- 涉及文档：docs/progress/iterations/v0.5-prd.md、docs/progress/iterations/v0.5.md
- 结论：✅通过（附 1 条中严重度观察，不阻塞定稿）。
  - R1 全部 10 条意见（2 阻断/1 高/4 中/3 低）已正确关闭。
  - R2 新增 1 条中严重度：§4.6 失败计数口径与异常处理表在部分解析失败的判定上存在矛盾（"部分解析失败→视为失败" vs "单条内容解析失败→仍视为成功"），设计阶段由架构师确认后即可消除。
- 关联迭代：v0.5
- 遗留：无。PRD 已达到设计阶段准入标准。

## 2026-06-06 — v0.5 PRD R1 Review

- 本次角色：全栈开发（Developer）
- 动作：Review
- 涉及文档：docs/progress/iterations/v0.5-prd.md、docs/progress/iterations/v0.5.md
- 结论：❌需修改。共 10 条意见（2 阻断 + 1 高 + 4 中 + 3 低）。
  - 阻断：#D1 Source 状态模型未拆分（与 UI 一致）；#D2 "未使用状态"引用未定义（与 UI 一致）。
  - 高：#D3 告警状态流转和交互未定义（与 UI 一致）。
  - 中：#D4 频道删除迁移冲突规则未定义（与 UI 一致）；#D5 空间管理页新建 Source 回流路径未定义（与 UI 一致）；#D6 展示位置快照数据模型未明确；#D7 搜索与筛选组合语义未定义。
  - 低：#D8 空间创建/重命名/排序范围未明确（与 UI 一致）；#D9 信息源库表格未提及分页；#D10 "连续失败"计数口径未定义。
- 关联迭代：v0.5
- 遗留：等待 PM 汇总其余角色 R1 Review 后提交 R2；届时由 Developer 复审。

## 2026-05-31 — Developer 当日工作链条闭环（会话级收工记录）

- 本次角色：全栈开发（Developer）
- 动作：会话级收尾归档（无新增产出）
- 触发：用户准备下班，确认 Developer 这一棒所有事项是否已闭环
- Developer 当日实际产出链：
  1. **Incident 恢复**（早间）→ `ec8073e` + 收尾 `7267000`
  2. **7 项 UI Bugfix + WS 移除**（下午）→ `e736980` + 收尾 `fd50370`
  3. **基线修正提案**「跨任务待办」→ `9cce740` + `ec95bf3` → WM 在 `dfede2b` 落地
  4. **测试报告 R1 双 Review**（初审 + 定稿后复审）→ `2622908` + `9f3fdbd`
  5. **会话级收尾**（第一次）→ `d90554f`
  6. **工程知识沉淀**（被用户提醒后补做）→ `841e5b3`
  7. **P2 数据库迁移 Step 2 实施** → `9b96a58`（已被 Architect R2 `ec10001` 审议通过，DevOps Step 3 `f5d3c9a` 已基于此完成）
- Developer 当日闭环确认：
  - ✅ 所有产出 commit 已推送 GitHub（无未推送 commit）
  - ✅ 所有交付物已被相关角色 Review / 验收（PM / Architect / Tester / WM / DevOps 都已应答）
  - ✅ v0.4 迭代已由 PM 关闭（有条件关闭），Developer 不参与关闭检查
  - ✅ P2 数据库迁移机制 Architect R1/R2 + Step 2 + Step 3 全线完成，已从跨任务待办移除
  - ✅ INDEX 跨任务待办表为空，无待 Developer 处理项
- 下班；今天 Developer 棒交完，无遗留事项

## 2026-05-31 — P2 数据库迁移规范化 Step 2 实施

- 本次角色：全栈开发（Developer）
- 模式：跨任务待办（Architect Review 后接手实施）
- 触发：INDEX 跨任务待办 P2「数据库迁移机制规范化」Architect Review R1 通过后派给 Developer 的 Step 2
- 涉及文档：
  - 上游决策：[ADR-001 Drizzle 迁移机制选型](../../baseline/architecture.md)
  - 实施 + 交付报告：[DevOps 提案 §Step 2 — Developer 实施完成](../ad-hoc/2026-05-31-devops-proposal-db-migration-mechanism.md)
- 结论：✅ Step 2 完成，5 项任务齐备
  1. `server/package.json` 加 `db:generate` / `db:migrate` script（A1）
  2. drizzle-kit 升级 0.30.6 → 0.31.10（旧版与现装 drizzle-orm 0.38.4 内部路径不兼容）
  3. `server/drizzle/0000_baseline.sql` 产出（135 行 + 末尾保留 v0.4 COMMENT）
  4. 5 个老 SQL 文件 git mv 到 `server/drizzle/_legacy/`，`server/db/migrations/v0.4.sql` git rm
  5. drizzle-kit 仍在 devDependencies——**保留**，留 Step 3 DevOps 移
- 与 Architect 决策的微调（已在交付报告 §3 中明确告知）：
  - 因 introspect 工具链报错且生产 schema 已与 schema.ts 现场核验对齐，改为 `drizzle-kit generate` 从 schema.ts 直接产 baseline
  - 结果：baseline 已吸收 v0.4 alerts.status 列，**没有独立 0001 v0.4 文件**
  - Developer 判断这等价于 A3 目标（避免简单复制 v0.4.sql 到 0001），但请 Architect 确认
- Step 3 硬前置风险已在交付报告中向 DevOps 显式提醒：
  - A2 移依赖（drizzle-kit → dependencies）
  - 首次部署需手动在 `__drizzle_migrations` 注入 baseline 已应用记录（否则 CREATE TABLE 失败）
  - systemd unit 加 `ExecStartPre` + `StartLimitInterval/Burst`
- 关联迭代：v0.4 部署后跨任务待办
- 遗留：
  - 根目录 `db/schema.sql`（v0.2 之前 DDL，已被 schema.ts 取代）按 surgical 原则不动，留 Architect 后续决定
  - INDEX 跨任务待办 P2 状态需更新为「Step 2 ✅ 完成，⏳ Step 3 → DevOps」（在归属角色 DevOps 不在场时由 Owner 或本次 Developer 兜底更新）

## 2026-05-31 — 会话收尾（Developer 当日工作汇总）

- 本次角色：全栈开发（Developer）
- 动作：会话级收尾归档
- 当日 Developer 出场次数：4 段独立工作（按时间顺序）
  1. **Incident — 误删 server/ 源码恢复**：commit `ec8073e` + 收尾 `7267000`
     从 git 历史恢复 server/ 38 文件 + deploy/systemd/news-api.service；新 PID 3870357 启动健康检查通过；线上服务连续可用未中断
  2. **Bugfix 批次 — 7 个 UI/交互 bug + WS 架构对齐**：commit `e736980` + 收尾 `fd50370`
     DELETE 400/204 解析/Modal 不统一/复选框对齐/启用响应性/创建空间事件名/前端 WS 残留 全部修复；线上验证通过
  3. **基线修正提案 — 跨任务待办是否模板化**：commit `9cce740` + `ec95bf3`
     INDEX 临时新增「跨任务待办」表收集散落 P1；同时在 Developer 日志写 `[基线修正提案]` 交 WM 评估；当晚 WM 在 commit `dfede2b` 落地为正式 baseline 修改
  4. **v0.4 测试报告 R1 Review + 定稿后复审**：commit `2622908` + `9f3fdbd`
     初审：✅有条件通过，提 3 项收口事项；复审定稿版：维持原结论同意定稿
- 当日 commit 总数：8 个（全部已推送 origin/main）
- 当日净代码变更：server/ 恢复 +6291 行；前端 Bugfix +84 -125 = -41 行；其余为文档
- 关联迭代：v0.4
- 状态：Developer 当日工作全部已 commit 并推送，本地工作区仅剩**其他角色**未提交的修改（PM/DevOps/Tester/PM-corrections），不在 Developer 提交边界
- 知识库沉淀（已执行，纠正之前"避免越权"的错误判断——按 Developer 手册 §15 + §146，engineering 沉淀本就是 Developer 硬职责）：
  - [Node.js 进程 unlink-while-open 应急恢复套路](../../knowledge/engineering/nodejs-unlink-while-open-recovery.md)
  - [Vue 3 setup 中 const 解构 props 非响应式陷阱](../../knowledge/engineering/vue3-setup-props-non-reactive-pitfall.md)
  - knowledge/INDEX.md 已同步更新
- 遗留（下次启动 Developer 角色时关注）：无
- 下班；今天 Developer 棒交完，**v0.4 迭代关闭检查**待 PM 或 WM 执行

## 2026-05-31 — v0.4 测试报告 R1 定稿后复审

- 本次角色：全栈开发（Developer）
- 动作：Review（复审定稿版）
- 涉及文档：docs/progress/iterations/v0.4-test-report.md（定稿版）、docs/progress/INDEX.md
- 触发：用户要求重新 Review；上次 Review 后 PM 已答复 3 项收口、Tester 已翻牌定稿
- 结论：**✅ 维持「有条件通过」原结论，无追加意见，无需升 R2，同意 Tester 翻牌定稿**
- 复审要点：
  - PM 对我 3 项收口的答复全部接受
    - 事项 1（不升 R2）：4 条理由完整合理（UI/交互细节、无契约变更、用户视觉已验、流程价值低），Tester 表态同意
    - 事项 2（INDEX 登记）：归属判断准确（#B1 归 DevOps、#B2 评估归 Architect），第 58 行已登记 + DevOps 已做拆分评估
    - 事项 3（条件列清）：报告 §结论已含条件 A/B，与 PM 事项 1 决定一致
  - Tester 翻牌动作完备：3 项收口逐条核对证据明确，状态表注释清晰，无误导风险
  - 我之前提的「7 项 Bugfix 仅靠用户手动验证」风险，PM 已主动转入 WM「前后端契约变更同步检查清单」待办——闭环
- 关联迭代：v0.4
- 遗留：无；测试报告 R1 具备进入「迭代关闭检查」的全部条件

## [基线修正提案] 2026-05-31 — INDEX 引入「跨任务待办」表，需 WM 评估是否模板化

- 提案角色：全栈开发（Developer）
- 触发场景：用户问"待办项你是记录在哪里的"，发现 P1 级散落事项（DevOps 清理旧 systemd / 启用新 systemd / WM 基线同步保护 / 前后端契约同步检查）只能在 ad-hoc 文件尾部 + 角色日志「遗留」段拼凑，**INDEX 启动必读但根本看不到**，下次会话启动会丢失视野
- 已采取的事实修改（不是提案，是已 commit）：
  - commit `9cce740` 在 `docs/progress/INDEX.md` 新增 `## 跨任务待办` 区块，登记当前 4 项 P1
  - 位置：`最近收尾摘要` 之后、`Bootstrap 记录` 之前
  - 表结构：优先级 / 待办 / 归属角色 / 来源 / 状态
  - 规则：完成后从表中移除

- 提交 WM 评估的问题：

  1. **是否应该在 baseline 层正式承认这类「跨任务待办」存在并模板化**
     - 现状缺口：现有 baseline（runtime.md / mechanisms.md / work-modes.md）只承认「迭代内事项」「ad-hoc 单任务事项」「角色日志个人遗留」三类，没有"跨多个非迭代任务的、归某角色但尚未启动的小事"这一类的归属
     - 后果：本次会话出现 4 项 P1 散落各处，纯靠 Agent 临时汇总，无机制保证下次会话能看到
     - 选项 A（最小动作）：仅在 `docs/templates/progress-index.md` 模板加上 `## 跨任务待办` 占位区块，Bootstrap 时就预留位置
     - 选项 B（中等动作）：在 `docs/baseline/mechanisms.md` 里写一节《跨任务待办的归属与去化》，规定何时登记 / 谁可登记 / 何时移除 / 与 ad-hoc 的边界
     - 选项 C（重动作）：单独建一类产出物 `docs/progress/backlog/{role}.md`，每个角色一个待办文件——但这与"INDEX 是启动必读"原则相悖，反而更分散

  2. **「跨任务待办」与「ad-hoc 任务」的边界是什么**
     - 当前我登记的 4 项里，有 2 项（DevOps 那两条）其实可以**直接立 ad-hoc**（Ops Task 模式），就不需要在 INDEX 里再列
     - 反过来，"基线同步保护机制"这类是 WM 视角的长期改进，更适合走 baseline 修正流程而非 ad-hoc
     - 这意味着「跨任务待办」可能只是临时收容点，最终该被吸收到 ad-hoc 或 baseline 修正提案；表里的事项天然有"过期日"——需要 WM 决定是否在表头加这条说明

  3. **格式细节是否合规**
     - 我自拟的字段（优先级/待办/归属角色/来源/状态）是不是合理？
     - 用 ☆/P0/P1/P2 还是别的优先级标记？
     - "来源"字段链接到 ad-hoc 或角色日志是不是好习惯？

- 影响范围（如果 WM 接受任一选项）：
  - 选项 A：仅 `docs/templates/progress-index.md` 一个模板文件
  - 选项 B：mechanisms.md 加一节 + 模板更新 + INDEX 写法约束
  - 选项 C：work-modes.md + INDEX 模板 + 新建 backlog 目录约定

- Developer 自身意见：倾向 **选项 A**（最小动作）。理由：当前 INDEX 已经在用了，运行良好；模板补一个占位避免下次 Bootstrap 又要靠 Agent 临时想起来；baseline 大动作可以等到再出现 1-2 次类似 case 后再升级

- 待 WM 决定后行动：本提案最终结论由 WM 写入 `docs/progress/roles/wm.md`；若决定修改 baseline，由 WM 执行修改

## 2026-05-31 — v0.4 测试报告 R1 Review

- 本次角色：全栈开发（Developer）
- 动作：Review
- 涉及文档：docs/progress/iterations/v0.4-test-report.md、docs/progress/iterations/v0.4.md、docs/progress/INDEX.md
- 结论：**✅有条件通过 R1**
  - 缺陷修复 #B1/#B2/#B3 逐条 diff 验证 + 生产 DB 验证均一致，无回退
  - 测试覆盖 30 项通过 0 失败 0 阻塞，PRD 22 项覆盖 21 ✅ / 1 ⏸ 与 PM 复审一致
  - 三项需 PM/Tester 收口的事项已写入测试报告 R1 Review 段：
    1. 本日 commit e736980（7 个 UI bug）不在 R1 报告覆盖范围 → 我建议不升 R2（已修复+用户验证+风险可控），由 PM 决定
    2. 测试报告「正式修复建议」未明确归属 → 建议 INDEX 跨任务待办登记
    3. 报告结论里「✅有条件通过」的"条件"未列清 → 建议 Tester 定稿前补一行
- 关联迭代：v0.4
- 遗留问题/风险：无（3 项收口事项已转交 PM/Tester 决定）

## 2026-05-31 — v0.4 视觉验证 Bugfix 批次（6 bug + WS 架构对齐）

- 本次角色：全栈开发（Developer）
- 模式：Bugfix（非迭代，v0.4 部署后视觉验证发现的批次小 bug）
- 动作：修改
- 涉及文件：10 frontend + 1 server（净减 41 行，主要因删除 ws.ts）
- 关联 commit：e736980
- 结论：
  1. DELETE 400 "Body cannot be empty"：`requestJson` 只在有 body 时设 Content-Type
  2. DELETE 204 后 "Unexpected end of JSON input"：204/Content-Length=0 跳过 res.json()
  3. SubChannelManager 删除弹窗与项目其他地方不统一：原生 confirm → useModal + useToast
  4. 编辑信息源"启用"复选框未对齐：新增 .edit-checkbox 类 row 排列 + align-self: end
  5a. 信息源"启用"切换保存后徽章不刷新：source/cs/isXT/srcConfig 由 const 改 computed，进入编辑态 watch 同步表单 ref
  5b. 徽章无法区分"已禁用"：statusBadge 引入 enabled 维度，enabled=false 显示 "⏸ 已禁用"
  6. 创建空间按钮无反应：AdminPage `@create` 改为 `@submit`，与 CreateSpaceModal emit 名对齐
  7. 控制台 WebSocket failed 持续刷错：v0.3 已砍后端 WS，前端同步删除 ws.ts + WS_BASE_URL + WSStatus + useWS 调用 + NewsPage 状态指示条
  附：server/src/api/app.ts PG 22P02 错误增强日志，记录请求 URL 便于排查无效 UUID
- 关联迭代：v0.4 部署后
- 遗留：
  - long-term：前端 ws.ts 删除前已游离 1 个版本（v0.3 后端砍 WS 后未同步前端），属流程死角；建议 WM 评估是否在 baseline 加"前后端契约变更需同步检查"清单
  - 旧 systemd unit news-worker.service 仍指向已删除 Python 路径（与本次 bug 无关，待 DevOps 清理）

## 2026-05-31 — Incident：基线同步 commit 误删 server/ 后端源码 → 恢复并重启

- 本次角色：全栈开发（Developer）
- 模式：Incident（故障处理，非迭代）
- 动作：排查 → 从 git 历史恢复 → 提交 → 推送 GitHub → 重启服务 → 验证
- 涉及文件：server/（38 文件全部恢复）、deploy/systemd/news-api.service、.gitignore、docs/progress/INDEX.md、docs/progress/ad-hoc/2026-05-31-incident-server-source-deleted-by-baseline-sync.md
- 关联 commit：恢复 ec8073e；问题源头 5500ac2 + 70a1b19
- 结论：
  - 用户提问"前后端是否都是 Node.js / 本地与 GitHub 是否一致 / server 是否在用"时排查发现：v0.3 完成的 Node.js 后端 server/ 源码已被 commit 5500ac2（题为"同步 CLAUDE.md 三层分流机制"）整目录误删，GitHub 上同步丢失；但正在运行的进程 PID 3787459 靠 Linux unlink-while-open 特性继续提供 8000 端口服务，任何重启都会导致后端宕机
  - 从 git 历史 5500ac2^ 恢复 server/ 38 文件 + deploy/systemd/news-api.service 1 文件；npx tsc --noEmit 零错误；与现存 server/node_modules/ 完全匹配
  - 同 commit 误删的 7 个前端组件经核查现存代码无引用，确属 v0.4 UI 重构后真废弃，不予恢复
  - 把 .gitignore 中被 70a1b19 误删的 server/node_modules/、server/dist/ 规则加回
  - commit ec8073e (+6291 行 / 43 文件) 推送到 origin/main
  - bash server/start.sh 自动 kill 老 PID 3787459 并启动新 PID 3870357；本机 /health 200、公网 /v1/stats /v1/channel-spaces 200、前端首页 200
- 关联迭代：v0.4 部署后独立 Incident
- 遗留：
  - long-term：建议增加基线同步 commit 范围检查机制（防止再误删生产源码），详见 ad-hoc §6
  - 旧 systemd unit news-worker.service 仍指向已删除的 Python 路径，5 天前 timeout failed，待 DevOps 决定清理或改写为 Node 版本
  - 本次恢复后未注册 systemd，新进程仍是 nohup 启动；需 DevOps 评估是否启用 deploy/systemd/news-api.service

## 2026-05-30 — v0.4 部署&测试修复 + 收尾

- 本次角色：全栈开发
- 动作：修复（DevOps #D1-#D5 + 测试 #B1-#B3 + 线上 403 + 日志 + X/Twitter 配置）
- 涉及文件：admin-guard.ts, logger.ts, InlineAddSource.vue, SourceCard.vue, AdminPage.vue 等
- 结论：全部修复完成，迭代可关闭。
  - DevOps 5项全修（TS 0错误、server依赖清零、ADMIN_TOKEN配置、迁移路径标准化）
  - 测试 3缺陷全修（DB迁移、FOR UPDATE+LEFT JOIN、source_url合并）
  - 线上 403修复（admin-guard GET拦截 + VITE_ADMIN_TOKEN缺失）
  - 日志修复（JSON splat + 403显式warn）
  - X/Twitter 配置字段补充（新增/编辑均支持 mode+账号/关键词）
- 关联迭代：v0.4
- 遗留：Twitter 被动模式当前为定时轮询（API限制无webhook回调）

## 2026-05-30 — v0.4 实现阶段 R2（定稿）

- 本次角色：全栈开发
- 动作：修改（响应 PM + 架构师 R1 Review）
- 涉及文件：AlertList.vue、SourceCard.vue、sources.ts、ToastContainer.vue
- 结论：✅R2 通过。3 条意见全部修复：requestJson 替代原生 fetch、FOR UPDATE 事务保护、Toast 退出动画。PM + 架构师双通过，实现阶段定稿。
- 关联迭代：v0.4
- 遗留问题/风险：无

## 2026-05-30 — v0.4 实现阶段 R1

- 本次角色：全栈开发
- 动作：产出（代码实现）
- 涉及文件：后端 12 文件 + 前端 19 文件
- 结论：全栈实现完成，TypeScript + Vite 编译通过。
  - 后端：7 新端点 + 3 增强 + RSS Fetcher + Admin Guard + 日志修复 + 状态机
  - 前端：2 新页面 + 5 新组件 + Toast/Modal 系统 + CSS 变量迁移 + 搜索/骨架屏/防抖
- 关联迭代：v0.4
- 遗留问题/风险：无

## 2026-05-30 — v0.4 技术设计 R2 Review

- 本次角色：全栈开发
- 动作：Review（复审）
- 涉及文档：docs/progress/iterations/v0.4-design.md、docs/progress/iterations/v0.4.md
- 结论：✅通过。R1 全部 4 条意见已正确关闭（路由懒加载恢复、HTTP requestJson 模式对齐、多子频道 SQL 补全、delete-preview JOIN SQL 明确）。与 PM 结论一致。设计阶段全部定稿。
- 关联迭代：v0.4
- 遗留问题/风险：无

## 2026-05-30 — v0.4 技术设计 R1 Review

- 本次角色：全栈开发
- 动作：Review
- 涉及文档：docs/progress/iterations/v0.4-design.md、docs/progress/iterations/v0.4.md
- 结论：❌需修改。共 4 条意见（2 中等 + 2 轻微）。中等项：路由懒加载退化（静态 import→动态 import）、HTTP 客户端模式不匹配（假定的拦截器→现有 requestJson）。轻微项：搜索 SQL 未体现多子频道、delete-preview source_states JOIN 未写完整 SQL。确认 API 契约/Zod Schema/状态机/Admin Guard/TOCTOU/日志修复/Toast Modal/CSS 迁移全部正确。设计质量高，需修正与现有代码的对接细节。
- 关联迭代：v0.4
- 遗留问题/风险：无

## 2026-05-30 — v0.4 UI 规范 R2 Review

- 本次角色：全栈开发
- 动作：Review（复审）
- 涉及文档：docs/progress/iterations/v0.4-ui-spec.md、docs/progress/iterations/v0.4.md
- 结论：✅通过。R1 全部 5 条意见已正确关闭。R2 新增内容（§3.7 告警状态管理、§8.1 CSS 变量迁移策略、§11 21 组件迁移表）信息充分、可实现。附加 1 条极轻微建议（验收标准措辞遗留），不阻塞定稿。UI 规范已定稿。
- 关联迭代：v0.4
- 遗留问题/风险：无

## 2026-05-30 — v0.4 UI 规范 R1 Review

- 本次角色：全栈开发
- 动作：Review
- 涉及文档：docs/progress/iterations/v0.4-ui-spec.md、docs/progress/iterations/v0.4.md
- 结论：❌需修改。共 5 条意见（1 阻断 + 4 中等）。阻断项：子频道筛选从多选变单选与 PRD 和现有实现冲突。中等项：CSS 变量迁移影响范围未评估、现有组件去留清单缺失、空间选择器交互变更、评分步长精度降低。确认架构师 R1 全部 3 条意见。整体视觉规范质量高，需补全与现有实现的衔接说明。
- 关联迭代：v0.4
- 遗留问题/风险：无

## 2026-05-30 — v0.4 PRD R2 Review

- 本次角色：全栈开发
- 动作：Review（复审）
- 涉及文档：docs/progress/iterations/v0.4-prd.md、docs/progress/iterations/v0.4.md
- 结论：✅通过。R1 全部 11 条意见已正确关闭。R2 新增内容（3 端点 + 3 依赖 + 状态转换规则 + 管理页子任务拆解 + Toast/Modal 注入方式）可实现、无歧义。附加 2 条极轻微建议（id 类型标注、stats 路径），不阻塞定稿。PRD 已定稿。
- 关联迭代：v0.4
- 遗留问题/风险：无

## 2026-05-30 — v0.4 PRD R1 Review

- 本次角色：全栈开发
- 动作：Review
- 涉及文档：docs/progress/iterations/v0.4-prd.md、docs/progress/iterations/v0.4.md
- 结论：❌需修改。共 11 条意见（3 阻断 + 5 中等 + 3 建议）。阻断项：前端依赖缺口（VueUse+拖拽库未纳入 PRD）、频道空间 DELETE 统计端点缺失、子频道拖拽排序持久化端点缺失。确认架构师 R1 全部 8 条意见。整体技术可行，PRD 完整性补全后可进入设计阶段。
- 关联迭代：v0.4
- 遗留问题/风险：无

## 2026-05-28 — v0.3 实现阶段定稿

- 本次角色：全栈开发
- 动作：定稿
- 涉及文档：docs/progress/iterations/v0.3.md、docs/progress/INDEX.md（PM 已完成）
- 结论：R2 PM + 架构师双通过，v0.3 实现阶段已定稿。纯迁移迭代完成：Python FastAPI → Node.js Fastify（29+ 源文件，API 契约兼容，前端零改动）。
- 关联迭代：v0.3
- 遗留问题/风险：无

## 2026-05-27 — v0.3 实现 R2：修复架构师 5 项 Review 意见（架构师 ✅通过，待 PM Review）

- 本次角色：全栈开发
- 动作：修改（响应架构师 R1 Review）+ 部署（兼职 DevOps）
- 涉及文件：11 个源文件 + start.sh + 3 个文档，详见迭代记录
- 结论：全部 5 项意见修复完毕，架构师 R2 ✅通过：
  1. **#1 Fetcher 注册表接入**：三处 hardcode 改为 `find(type)` 调用，新增 `fetchers/index.ts`
  2. **#2 Worker 模块拆分**：拆为 `scheduler.ts` / `dispatcher.ts` / `processor.ts` / `monitor.ts` / `reclaim.ts`
  3. **#3 补 DB 索引**：`ix_processed_news_sub_published` + `ix_raw_items_url`
  4. **#4 SSRF 防护**：fetch 前增加 scheme 白名单
  5. **#5 Zod 校验一致性**：`news.ts` 使用 `NewsQuery.parse()`
- 附带修复：`log.warning`→`log.warn`、`nonBlankStr` 工厂函数、`sql` 导入、`.gitignore` 补 `server/node_modules/`
- 本地部署验证通过：`start.sh` → 健康检查 → API 全链路 → nginx/news.huiyiyou.cloud 外网可达
- TypeScript 编译通过，11 项 API 测试全部通过
- 关联迭代：v0.3
- 遗留问题/风险：无。等待 PM R2 Review。

## 2026-05-27 — v0.3 实现 R1：Node.js 全栈迁移（待 Review）

- 本次角色：全栈开发
- 动作：产出（代码实现）
- 涉及文件：server/ 目录 29 个源文件（全新 Node.js 项目）
- 结论：按技术评估报告三步走策略完成全栈迁移：
  1. **数据库层**：Drizzle ORM Schema 对齐现有 10 张表 DDL + pg Pool 连接
  2. **API 层**：Fastify + Zod 等价重写 8 个路由组（channel-spaces/sources/bindings/sub-channels/news/stats/admin-logs/alerts）+ CORS/Admin鉴权/HTTP日志中间件 + Winston 日志
  3. **Worker 层**：插件化 Fetcher 架构（registry + x_twitter 插件）+ scheduler/dispatcher/processor/llm/monitor/reclaim 独立模块
  4. **部署**：Dockerfile 单进程镜像 + drizzle.config.ts
- TypeScript 编译通过（`npx tsc --noEmit` 零错误）
- API 契约完全兼容（路径/参数/返回值不变，前端零改动）
- 砍掉 WebSocket（pg_notify + ws_manager）
- 关联迭代：v0.3
- 遗留问题/风险：无。等待 PM + 架构师 Review。

## 2026-05-26 — 生产环境 Bug 修复：Failed to fetch + X/Twitter 集成 + Worker 调度饥饿修复
- 本次角色：全栈开发
- 动作：修改
- 涉及文件：frontend/src/config.ts、.env、app/settings.py、worker/fetch_x_twitter.py、worker/main.py
- 结论：修复/完成以下问题：
  1. **"Failed to fetch"**：`config.ts` 中 `||` 改为 `??`，空字符串 `VITE_API_BASE_URL` 作为合法值（同源请求），前端重建部署。
  2. **X Bearer Token**：配置 token + 修正 URL 编码 `%3D`→`=`
  3. **X/Twitter 局部代理**：新增 `X_PROXY_URL` 配置项，仅 X fetcher 走代理 (`socks5://127.0.0.1:10809`)，不影响其他服务。
  4. **Worker 调度饥饿 Bug**：原逻辑 fetch 优先→无 fetch 任务时 sleep 1s → 永不到 process。修复为 fetch 无任务时 fallthrough 尝试 process。
  5. **端到端验证**：创建"默认空间"频道+ `@alpha123cc` X源 → 验证 5 条推文获取成功 → 绑定后 Worker 抓取 20 条 → LLM 生成中文新闻，全链路通过。
- 关联迭代：无（生产热修复）
- 遗留问题/风险：无

## 2026-05-24 — v0.2 收尾：INDEX.md 同步 + baseline 变更提交
- 本次角色：全栈开发
- 动作：定稿
- 涉及文件：docs/progress/INDEX.md、docs/progress/roles/developer.md
- 结论：v0.2 迭代全部完成。INDEX.md 更新至 v0.2 终态；PM/架构师 baseline 角色手册变更（文档操作边界+原型图流程+并行Review规则）一并提交。PM UI 重设计原型待 v0.3 纳入。本地领先 origin/main 的 commit 已推送。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 实现 R5（数据清理遗漏修复）
- 本次角色：全栈开发
- 动作：产出
- 涉及文件：db/migrations/v0.2_data_cleanup.sql（新增）
- 结论：创建数据清理脚本并执行，清空 6 张数据表（sources→processed_news 全链路），保留 channel_spaces/sub_channels。验证通过：6 张数据表 count=0，channel_spaces(1) + sub_channels(3) 保留。对应设计文档 §2.3 + §9.1 第 2 步。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 实现 R4 定稿
- 本次角色：全栈开发
- 动作：定稿
- 涉及文档：docs/progress/iterations/v0.2.md
- 结论：R4 修复 PM+架构师双通过，v0.2 实现阶段全部完成。R1→R4 完整闭环：PRD（R1-R2）→设计（R1-R4）→实现（R1-R4），迭代已定稿。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 实现 R3 修复（响应 PM + 架构师 Review）
- 本次角色：全栈开发
- 动作：修改
- 涉及文件：frontend/src/components/SourceManager.vue、BindSourceModal.vue、AdminPage.vue
- 结论：修复 PM #1 + 架构师 #1（verified 状态缺少"绑定"按钮）。SourceManager verified 状态行: 验证→绑定 + emit('bind')；BindSourceModal 新增 preSelectedSourceId prop；AdminPage 接收 @bind 事件并打开预填绑定弹窗。TypeScript 编译通过。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 实现 R3（对齐定稿设计）
- 本次角色：全栈开发
- 动作：产出（代码修改）
- 涉及文件：frontend/src/App.vue、TagChip.vue、EntityBadge.vue、LogViewer.vue、SourceManager.vue、SubChannelManager.vue、NewsPage.vue、StatsCards.vue、NewsDetailPanel.vue、lib/api.ts、AdminPage.vue；app/routes.py
- 结论：对齐定稿 UI 规范与设计的 11 项缺口全部实现。#1 全局深色顶栏；#2 TagChip 4 色调色板首字母哈希轮转；#3 EntityBadge 按 UI 规范颜色+灰底降级；#4 LogViewer Chip 多选按钮组（OR）+等宽字体+级别方块 Badge+展开详情+时间范围控件；#5 SourceManager 表格布局+按状态操作列+类型/状态彩色 Badge+添加弹窗自动识别；#6 后端 level/source 逗号分隔多选+sub_channel_id 多选+detect-type 端点；#7 SubChannelManager channelSpaceId prop+拖拽手柄+序号+蓝色虚线新建行；#8 NewsPage 子频道多选+蓝色 Pill 样式+空状态文案；#9 StatsCards 按 UI 规范颜色和顺序；#10 NewsDetailPanel 空摘要；#11 子频道筛选多选 OR 后端支持。TypeScript 编译通过，Python 语法通过。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 设计文档 R3 Review
- 本次角色：全栈开发
- 动作：Review
- 涉及文档：docs/progress/iterations/v0.2-design.md
- 结论：✅通过。R3 修订仅新增"关联 UI 规范"元数据字段，设计正文无变更，UI 规范追溯链完整。轻微备注：文档状态"修改中"应为"Review中"（PM 已指出，由架构师修正）。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 UI 规范文档 R2 Review
- 本次角色：全栈开发
- 动作：Review（复审）
- 涉及文档：docs/progress/iterations/v0.2-ui-spec.md
- 结论：✅通过。R1 全部 9 条意见已正确关闭。#1 SubChannelManager 改为 channelSpaceId prop；#2 LogViewer Chip 多选明确 OR 语义 + 保留时间范围下拉；#3 SourceManager 新增按状态动态操作表；#4-#9 标签颜色/色彩体系/路由关系/空状态/交互流程/实体降级均已补全。补充建议 #R2-1（Source 类型 Badge 颜色未覆盖 github_trending/arxiv/web，建议统一灰色降级）不阻塞定稿。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 UI 规范文档 R1 Review
- 本次角色：全栈开发
- 动作：Review
- 涉及文档：docs/progress/iterations/v0.2-ui-spec.md
- 结论：❌需修改（3 项可实现性冲突 + 6 项细节补全，共 9 条意见）。#1 SubChannelManager 独立空间选择器与全局 SpaceSelector 架构冲突；#2 LogViewer mockup 与文本矛盾且多选语义未定义；#3 SourceManager 操作列未区分 Source 状态。其余 #4-#9 为标签颜色策略、色彩体系、路由关系、空状态/加载态/错误态、识别交互流程、实体降级等细节补全。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 迭代定稿
- 本次角色：全栈开发
- 动作：定稿
- 涉及文档：docs/progress/iterations/v0.2.md
- 结论：PM + 架构师 R2 双通过，实现阶段定稿。v0.2 迭代（Source 重构 + 前端体验 + 日志系统）完成。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 实现 R2 修复
- 本次角色：全栈开发
- 动作：修改（响应 PM + 架构师 R1 Review）
- 涉及文件：app/main.py、app/routes.py
- 结论：修复 2 项意见。#1（阻断）app/main.py 补充 `Request` 导入，消除 NameError；#2（轻微）删除 `_source_out_legacy` 死代码（Pydantic v2 丢弃 extra fields → name 映射无效），调用点统一使用 `_source_out_v2`。Python 导入验证通过。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 实现 R1 前端组件
- 本次角色：全栈开发
- 动作：产出（代码实现）
- 涉及文件：frontend/src/components/TagChip.vue（新增）、EntityBadge.vue（新增）、NewsDetailPanel.vue（新增）、VerifyDialog.vue（新增）、SourceManager.vue（新增）、SubChannelManager.vue（新增）、LogViewer.vue（新增）；frontend/src/views/NewsPage.vue（修改）、AdminPage.vue（修改）；frontend/src/components/StatsCards.vue（修改）、ChannelFilter.vue（修改）
- 结论：7 个新前端 Vue 组件全部创建完成（TagChip/EntityBadge/NewsDetailPanel/VerifyDialog/SourceManager/SubChannelManager/LogViewer），NewsPage 接入排序/子频道筛选/真实统计/详情面板，AdminPage 新增 Tab 导航（频道/Source管理/子频道/日志）。TypeScript 编译通过。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 实现 R1（后端）
- 本次角色：全栈开发
- 动作：产出（代码实现）
- 涉及文件：21 文件（见 commit 7cbcd98）
- 结论：Source 重构（models/schemas/Source CRUD/Verify/Mark）+ 日志系统（API+Worker JSON 行+轮转+admin/logs）+ Worker 清理（删 5 个旧抓取器+调度 JOIN 过滤+LLM 耗时）+ 前端适配（types/api 全量更新+name→display_name）
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 设计文档 R2 Review
- 本次角色：全栈开发
- 动作：Review（复审）
- 涉及文档：docs/progress/iterations/v0.2-design.md、docs/progress/iterations/v0.2.md
- 结论：✅通过。R1 全部 7 条意见已关闭。R2 修正准确——域名匹配改为三元组+精确后缀匹配、日志查询补充 from/to+asyncio.to_thread、parse_x_twitter 结构标注+isinstance 检查、日志轮转升级为 TimedRotatingFileHandler、空字符串/向后兼容/verified→active 均处理完毕。PM 的 3 条意见同步关闭。设计文档已满足进入实现阶段条件。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 设计文档 R1 Review
- 本次角色：全栈开发
- 动作：Review
- 涉及文档：docs/progress/iterations/v0.2-design.md、docs/progress/iterations/v0.2.md
- 结论：❌需修改（3 项中等 + 4 项轻微，共 7 条意见）。中等：#1 日志查询缺 from/to 时间范围参数（呼应 PM #1）+ _read_log_lines 同步阻塞/全量加载内存问题；#2 source_detector.py 域名匹配逻辑 bug（huggingface.co/papers 含路径的规则永远不生效 + 纯子串匹配误判风险）；#3 parse_x_twitter 返回值结构未验证导致 VerifyItem 字段映射可能出错。轻微：日志轮转推迟、空字符串 source_url、logger 单例 stale handle、_source_out fallback 未定义。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 PRD R2 Review
- 本次角色：全栈开发
- 动作：Review
- 涉及文档：docs/progress/iterations/v0.2-prd.md、docs/progress/iterations/v0.2.md
- 结论：✅通过。R1 全部 10 条意见已关闭。R2 补充了验证超时、首次使用引导、清理顺序、日志 tail 语义等实现细节。仅余 6.3/5.1 措辞与 3.2.3 不一致（与架构师 R2 意见一致），建议修正但不阻塞设计阶段启动。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 PRD R1 Review
- 本次角色：全栈开发
- 动作：Review
- 涉及文档：docs/progress/iterations/v0.2-prd.md、docs/progress/iterations/v0.2.md
- 结论：❌需修改（2 项阻断 + 4 项中等 + 4 项轻微，共 10 条意见）。阻断项为验证同步调用超时/错误处理未定义 + 数据全清后前端启动路径不明确。中等项涉及引用清理顺序、类型枚举统一、FK 约束验证、日志读取策略。架构师的 2 项阻断（验证架构路径、字段策略）从开发角度也构成阻塞。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-23 — 多 Agent 协作基线体系 v1.4→v1.5 实施
- 本次角色：全栈开发
- 动作：产出 + 修改
- 涉及文档：docs/baseline/（全部角色手册、conventions.md）、CLAUDE.md、docs/progress/roles/（纠错记录、角色日志）、docs/baseline/multi-agent-collaboration-design.md（v1.5 已定稿）
- 结论：v1.4 基线修正机制+Agent 自我纠错机制、v1.5 DevOps 角色+部署就绪检查机制，全部实施完成。设计文档移入 baseline/，标注为宪法级文件。
- 关联迭代：基础体系建设
- 遗留问题/风险：无

## 2026-05-23 — v0.1 设计文档 R3 复审确认
- 本次角色：全栈开发
- 动作：Review（复审）
- 涉及文档：docs/progress/iterations/v0.1-design.md
- 结论：✅通过（6项微调全部核实，设计已定稿，进入可实施状态）
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-23 — v0.1 实现阶段定稿
- 本次角色：全栈开发
- 动作：定稿
- 涉及文档：docs/progress/iterations/v0.1.md
- 结论：实现阶段 R3 架构师 + PM 双通过，阶段已定稿。v0.1 迭代完成。
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-23 — v0.1 实现 R3 修复
- 本次角色：全栈开发
- 动作：修改
- 涉及文档：worker/fetch_x_twitter.py
- 结论：修复 PM R2 #1（游标截断前更新→截断后更新）+ PM R2 #2/架构师 R2 #1（_resolve_usernames 和 _fetch_user_timelines 补充 _handle_auth_failure）
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-23 — v0.1 线上验证 + Bug 修复
- 本次角色：全栈开发
- 动作：验证 + 修改
- 涉及文档：app/schemas.py、app/routes.py（2 次）
- 结论：API 全量验证通过（14 项）；发现并修复 3 个 Bug：
  1. SubChannelCreate.name 类型为 str 导致纯空格绕过 NonBlankStr 校验
  2. create_sub_channel 和 bind_source 缺少 IntegrityError 处理 → 500 而非 409
  3. Worker httpx 未开启 follow_redirects → deepmind.com 302 重定向失败；openai-blog feed URL 失效
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-23 — v0.1 前端警告消除
- 本次角色：全栈开发
- 动作：修改
- 涉及文档：frontend/src/App.vue、frontend/src/views/NewsPage.vue、frontend/src/views/AdminPage.vue
- 结论：消除浏览器控制台 3 类警告（Vue Router active-class 废弃、5 处未处理 Promise 拒绝）
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-23 — v0.1 Git Tag + 迭代收尾
- 本次角色：全栈开发
- 动作：定稿
- 涉及文档：Git tag v0.1
- 结论：v0.1 迭代全部完成，tag 已打。PRD/设计/实现三阶段均定稿，线上验证通过。
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-23 — v0.1 Worker 可观测性：结构化日志系统
- 本次角色：全栈开发
- 动作：产出
- 涉及文档：worker/logger.py（新增）、worker/main.py、.gitignore
- 结论：添加结构化日志系统（控制台 INFO+，文件 DEBUG+），覆盖任务生命周期、抓取统计、新闻产出、告警、异常完整 traceback。属基础设施层，开发自主实施。
- 关联迭代：v0.1
- 遗留问题/风险：待讨论是否纳入 PRD 正式管控（可观测性基础设施需求）

## 2026-05-23 — v0.1 设计对齐修复（R2）
- 本次角色：全栈开发
- 动作：产出
- 涉及文档：worker/errors.py（新增）、db/migrations/v0.1_rollback.sql（新增）、worker/llm.py、worker/fetch_x_twitter.py、worker/main.py、app/routes.py、frontend/src/lib/types.ts、frontend/src/lib/api.ts、frontend/src/views/NewsPage.vue
- 结论：根据设计文档 R3 修复 8 项偏差（NonRetryableError 异常体系、language 字段保留 LLM 输出、_handle_auth_failure、PUT 路由空 body 校验、前端类型/API/调用方同步）
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-23 — v0.1 设计文档 R3 Review
- 本次角色：全栈开发
- 动作：Review
- 涉及文档：docs/progress/iterations/v0.1-design.md
- 结论：❌需修改（6项意见：1中等+5轻微，详见设计文档 Review by 全栈开发 — R3）
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-16~21 — v0.1 全部功能实现
- 本次角色：全栈开发
- 动作：产出
- 涉及文档：app/models.py, app/schemas.py, app/routes.py, worker/fetch_x_twitter.py, worker/llm.py, worker/main.py, db/schema.sql
- 结论：v0.1 全部功能开发完成（子频道 CRUD、X/Twitter 集成、LLM 增强、去重）
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-20 — v0.1 PRD Review
- 本次角色：全栈开发
- 动作：Review
- 涉及文档：docs/v0.1-prd.md
- 结论：提出可实现性建议和需求粒度反馈
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-20 — v0.1 设计文档 Review
- 本次角色：全栈开发
- 动作：Review
- 涉及文档：docs/v0.1-design.md
- 结论：提出实现细节和遗漏点建议
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-20 — v0.1 代码修复
- 本次角色：全栈开发
- 动作：修改
- 涉及文档：worker/main.py
- 结论：修复 Worker x_twitter 分支顺序问题
- 关联迭代：v0.1
- 遗留问题/风险：无
## 2026-06-09 — v0.6 PRD R1 Review 会话收尾 + Developer 日志分页归档

- 本次角色：全栈开发（Developer）
- 模式：会话收尾 + 上下文分层归档
- 触发：本次会话完成 v0.6 PRD R1 Developer Review 后用户说"收尾"；同时检查发现 `developer.md` 已达 1416 行，**远超 `context-policy.md` 300 行阈值**
- 动作：
  1. 按 `mechanisms.md §2 收尾归档`通用检查 8 项核对，状态全部一致
  2. 按 `context-policy.md §角色日志分层`执行分页归档：
     - `developer.md`（1416 行）→ `developer-current.md`（最近 4 条，205 行）+ `developer-archive.md`（早期 30 条，1219 行）+ 新增 `developer-summary.md`（当前状态/复用基线/常见风险/知识沉淀，约 70 行）
     - 同步更新 `INDEX.md` 角色日志指针
  3. 整理本次 v0.6 PRD R1 Review 关键产出和等待项写入 current 顶部条目
- 验证：
  - `developer-current.md` 行数 ≤ 300，符合阈值
  - `developer-archive.md` 内容来自原 `developer.md` 第 205-1416 行（原文未改）
  - `developer-summary.md` 涵盖当前状态、关注点、复用基线、历史教训、知识沉淀指针
  - INDEX 角色日志列已指向 current/summary 双文件
- 关联迭代：v0.6（PRD R1 Review中）
- 下一步：等待 Tester / DevOps 完成 R1 Review；PM 汇总后产出 R2，Developer 复审

---

## 2026-06-09 — v0.6 PRD R1 Review

- 本次角色：全栈开发（Developer）
- 模式：Review（标准迭代 v0.6 PRD 阶段 R1）
- 涉及文档：`docs/progress/iterations/v0.6-prd.md`、`docs/progress/iterations/v0.6.md`
- 结论：❌需修改。共 13 条意见（4 高 / 6 中 / 3 低）

### 高严重度（4 条）

- **#D1 AC-25 mock 数据"一刀切"禁止与 v0.6 渐进式迁移矛盾**：缺少"接口未就绪 → 前端如何渲染"的工程规则；建议 AC-25 拆为 a/b 两条（生产构建禁 mock + 开发期允许 fixture），并在 §4.1 明确实施顺序（后端契约骨架 → 前端 mock fixture 并行 → 切换真实数据）。
- **#D2 前后端契约清单 PRD 全程缺失**：v0.5 PRD R2 §10 的"6 组 20+ endpoint"是当时实施顺利的关键基础，v0.6 PRD 没有任何 API 路径/字段名；建议追加 §3.7 草案列出本期新增/变更端点（含新闻列表新字段、详情端点是否新增、空间图标上传接口、Source 详情 L0/L1 统计字段等）。
- **#D3 AC-08 退避策略与现有 `dispatcher.ts requeueTask` 冲突**：现有线性 `min(300, 10*(n+1))` vs PRD `[60, 300, 900]` 指数；如果改 dispatcher 不限定 type，会污染 v0.5 已稳定的 X Stream 补偿抓取。建议 PRD §3.2 明确"L0/L1 复用 tasks 表 + 按 type 走可配置退避策略"，AC-08 只对 L0/L1 type 生效。
- **#D4 空间图标上传缺关键工程约束**：上传字段名、存储路径、URL 拼接、并发覆盖语义未定；Fastify 项目当前没装 `@fastify/multipart` 需要新依赖；emoji 与图片同字段还是新增列影响数据迁移。建议 PRD §3.6 加段"上传工程契约"明确接口、字段、清理策略。

### 中严重度（6 条）

- **#D5 AI 单次 JSON 输出体量未评估**：从 5 个 top-level key（1-2KB）膨胀到 11+ 个（5-10KB），LLM 解析失败率会上升；PRD 应给单次输出上限约束 + 部分成功是否进入新闻流的产品决策。
- **#D6 五类标签数据结构骨架未定**：前端组件 props 无法预先建好；建议给标签数据结构草案（即使开闭集还没定）。
- **#D7 §2.6 重构 10 个页面工程量没估**：Vue 组件保留/重写/删除清单缺失；建议按 P0/P1/P2 标出 NewsPage / AdminPage / SourceDetailPage 优先级。
- **#D8 AC-15 置信度区分前端载体未定**：纯文本 / 分句结构 / 段落分类三种数据载体差异巨大，影响前端组件结构。
- **#D9 库内检索同步/异步策略未定**：影响 L1 平均处理时间（可能 5s → 30s）；建议明确异步 + 上限 5 条 + 召回失败不阻塞。
- **#D10 开发联调环境依赖未列**：本地是否需要全套 LLM/搜索 key、Tester 联调样例数据如何造、CI 如何 mock LLM。

### 低严重度（3 条）

- **#D11 AC-23/24/25 "不应"措辞过于绝对**：建议加"v0.6 用户可见路径"修饰，与 UI #U11 同向。
- **#D12 §5 前置依赖未列已知 npm 依赖增量**：`@fastify/multipart` / 搜索 SDK / link reader 库；DevOps R1 难以评估部署变更。
- **#D13 "四维分理由"字段长度上限未给**：影响抽屉布局（行内 vs 折叠卡片）；建议每维理由 ≤ 80 字。

### 不阻塞的观察

- `dispatcher.ts:62-76` `requeueTask` 加 type 维度后可平滑承载 L0/L1，schema 不用大改
- `processed_news.tags/entities/source_refs` 三个 jsonb 能装下 5 类标签 + 4 维分 + 5 来源，但建议评估拆 `processed_news_l1_meta` 单表
- `NewsDetailPanel.vue` 已是抽屉形态，UI #U1 推荐方案 A（沿用抽屉）Developer 视角改造量最小
- 路由 `/alerts`+`/logs` → `/monitoring` 合并约 1 天工作量
- 原型设计 token（primary/secondary/accent/muted）需 UI 阶段做映射表，不需要重搭样式系统
- **v0.5 测试当前禁用**（生产 DB 误删事故），本期实施前必须恢复独立 test DB + `.env.test`，否则 AC-08 退避、AC-05 LLM 契约都无法单测覆盖——前置工作

### 与已提交 Review 的关系

- Architect #A1-#A8 覆盖架构/数据/外部依赖侧
- UI #U1-#U9 覆盖视觉/交互侧
- Developer #D1-#D4 覆盖工程契约/实施路径侧
- 三方 R1 一致 ❌需修改：本轮 PRD 把太多产品决策甩给设计阶段，需 PM 在 R2 大幅收敛

### 关联

- 关联迭代：v0.6
- 关联文档：`docs/progress/iterations/v0.6-prd.md`（Review 记录 § Developer R1）
- 下一步：等待 Tester / DevOps 完成 R1 Review；PM 汇总后产出 R2；届时 Developer 复审

---

## 2026-06-08 — 视觉细化收口（背景分层 / 文字纯黑 / 管理页右栏可见性）

- 本次角色：全栈开发(Developer)
- 模式：Bugfix / 视觉对齐(非迭代)
- 触发：Owner 对 v0.5 前端视觉的逐条反馈

### 改动

1. **三层背景层次**(commit `23fc305`) — Owner: "屏幕背景和告警展示的地方需要区分，不要融合"
   - 新增 `--bg-page: #ECEEF1`(深一档屏幕底色),`body`/`.shell` 改用
   - `--bg: #FAFAFA` 仍为工作区底色,`.main-content` 加细边框 + 顶部圆角形成"浮起"
   - `--card: #FFF` 卡片不动,21 个白卡组件无影响
   - 小屏(≤480px)移除边框圆角,保持紧凑

2. **文字颜色统一为深色**(commit `98f373f`) — Owner: "所有字体全是黑色,不要灰色"
   - `--text-secondary: #5F6B7A → #1a1a2e`
   - `--text-muted: #94A3B8 → #1a1a2e`
   - 单文件改 2 行,21 个组件 + 5 个页面所有走变量的文字一律变深色
   - 扫码确认全仓无硬编码灰色文字 → 无需逐文件改

3. **管理页右栏上下文可见性**(commit `485c805` + `4bb9787`) — Owner: "当前：财经 · 全部 · 2 个信息源 这段页面上看不到"
   - `SpaceManagementTab.vue` 中 `.ctx-sep` 之前用 `var(--border)` 浅色,在深灰屏幕背景下消失
   - `.ctx-sep` / `.ctx-label` / `.ctx-count` 全部改 `var(--text)`
   - 字号 13/15/12 统一为 `var(--text-md)` 14px,字重统一 `--weight-xbold`

### 验证与部署

- 每次改动均 `npm run build` 通过,`vue-tsc` 0 错误
- 软链接部署模式,`frontend/dist` build 即上线
- 公网 `https://news.huiyiyou.cloud/` 全部上线

### 关联

- 关联迭代:v0.5(实现阶段已定稿,本次为 Owner 试用反馈视觉收口)
- 本次会话总 commit:7 个(含前置 1280px 居中回调 `7969e08`、前端规范统一 `ddfb8e5`、Developer 日志 `46c52ab`、INDEX 同步 `58c5461`)

### 移交

Owner 已表示"v0.5 迭代基本验证完成,进入收尾"。Developer 角色完成本次产出归档,无遗留代码任务。**v0.5 标准迭代关闭检查需 PM 角色执行**,Developer 不可越权代为关闭。

---

## 2026-06-08 — 前端规范统一:字体层级 / 弹窗抽屉 / 死代码清理

- 本次角色：全栈开发（Developer）
- 模式：Bugfix / 前端规范化（非迭代）
- 触发：Owner 提出 5 项前端规范要求 — 字体统一规划、弹窗风格统一、抽屉统一、组件复用、清理死代码
- commit：`7969e08`（1280px 居中收口）+ `ddfb8e5`（规范化主体）

### 1. 大屏宽度回调（commit `7969e08`）

Owner 反馈整屏铺满显得分散，要求内容回归中间。`App.vue` `.topbar-inner` / `.main-content` + `style.css` `.container` 从 `max-width: none` 改为 `max-width: 1280px; margin: 0 auto`，响应式断点 1120 → 1280。

### 2. 前端规范统一（commit `ddfb8e5`）

**摸底发现的问题**：
- 字体变量只有 `--font-sans`/`--font-mono`，没有字号字重层级
- 弹窗存在 3 套样式：`BaseModal` 的 `.modal-dialog` / `ModalContainer` 自有的 `.modal-box` / `CreateSpaceModal` 自有的 `.modal-box`
- 抽屉不同步：`SlidePanel` 背景 `var(--bg)` 灰，`NewsDetailPanel` 背景 `var(--card)` 白
- 4 个零引用死组件：`PageTitle.vue` / `CreateSpaceModal.vue` / `SourceLibraryCard.vue` / `TagSelector.vue`
- `SourceDetailPage.vue` 硬编码 `font-family: monospace`
- `AlertsPage.vue` 自定义 `.page-title` 22px/900 与全局 22px/800 冲突

**修改**：

| 文件 | 改动 |
|------|------|
| `style.css` | 新增 `--text-xs/sm/base/md/h1-h4` 字号变量和 `--weight-bold/xbold/black` 字重变量；`body`/`page-title`/`modal-dialog h3`/`modal-title` 迁移为变量引用 |
| `ModalContainer.vue` | 移除自有 `.modal-overlay`/`.modal-box` 重复样式，改用全局 `.modal-dialog`；按钮 `danger`/`primary` 改为 `btn--danger-fill`/`btn--primary` |
| `SlidePanel.vue` | 背景 `var(--bg)`→`var(--card)`；遮罩 `rgba(0,0,0,0.2)`→`rgba(15,23,42,0.3)+blur(4px)`；标题字号改用 `var(--text-h4)`+`var(--weight-xbold)` |
| `NewsDetailPanel.vue` | backdrop blur 2px → 4px，与全局弹窗一致 |
| `AlertsPage.vue` | 删除 scoped `.page-title 22px/900` 覆盖，走全局 |
| `SourceDetailPage.vue` | `font-family: monospace` → `var(--font-mono)` |
| 删除 4 个组件 | `PageTitle.vue` / `CreateSpaceModal.vue` / `SourceLibraryCard.vue` / `TagSelector.vue` |

**死代码删除路径说明**：4 个组件全仓零引用已验证（`grep` 仅命中文件自身和 `style.css` 一处注释）。按 `conventions.md §受保护路径删除门禁 §例外情况` 第 3 条 + Owner 在会话中直接提出"清理不使用的死代理（代码）"= Owner 直接授权，跳过 Architect Review（与 2026-06-07 `ChannelPills.vue` 同路径）。删除 commit 与规范化改动合并提交，body 含完整删除清单和 Review 跳过说明。

### 3. 不做的事

- 不合并 `SourceCard.vue` / `SourceTableRow.vue`（用途不同：管理卡片 vs 库表格行）
- 不强行迁 `DeleteConfirmDialog.vue` / `SourceVerifyDialog.vue` 到 BaseModal（业务逻辑独立）
- 不批量改组件 scoped 内的所有字号（surgical 原则；仅改与全局冲突的 AlertsPage `.page-title`）

### 验证与部署

- `cd frontend && npm run build`：通过，`vue-tsc` 0 错误，Vite 138 modules
- 软链接部署模式 `frontend/dist` 即上线
- 公网入口验证：`https://news.huiyiyou.cloud/` 已引用新 bundle `index-BQEdeaA1.js` / `index-CQbJ6lGf.css`
- 净代码变更：+45 行 / -453 行（含 4 个死组件删除）

### 待 Owner 验证

刷新生产页面验证：
1. 弹窗（如批量确认、删除确认）样式是否统一
2. 侧边抽屉（信息源详情 / 新建信息源 SlidePanel）背景是否统一为白色
3. 字号层级（标题/正文/徽章）视觉是否协调

如某处仍偏差，再针对性微调。

---

## 2026-06-08 — 大屏展示区域宽度限制修复（已被同日 1280 回调覆盖）

- 本次角色：全栈开发（Developer）
- 模式：Bugfix / 视觉对齐
- 触发：Owner 反馈电脑端可用空间很多，但页面显示区域被固定宽度限制；字号变大后造成挤压

### 修改

- `frontend/src/App.vue`：
  - `.topbar-inner` 取消 `max-width: 1120px` 和居中限制，改为 `width: 100%; max-width: none`
  - `.main-content` 取消 `max-width: 1120px` 和居中限制，使用整屏宽度
  - 桌面左右 padding 改为 32px，窄屏继续按 media query 收紧
- `frontend/src/style.css`：
  - 全局 `.container` 同步取消 1120px 固定宽度，避免其他页面仍被限制

### 验证与部署

- `cd frontend && npm run build`：通过，`vue-tsc` 0 错误，Vite 138 modules
- 软链接部署模式下 `frontend/dist` build 即上线
- 新产物：`index-DCeR9mJf.js` / `index-DgcnnkhM.css`

> 后续 Owner 反馈"铺满太散，左右仍需留白"，已在本日"前端规范统一"前置 commit `7969e08` 中回调为 1280px 居中。

---



- 本次角色：全栈开发（Developer）
- 模式：Bugfix / 视觉对齐
- 触发：Owner 反馈电脑端可用空间很多，但页面显示区域被固定宽度限制；字号变大后造成挤压

### 修改

- `frontend/src/App.vue`：
  - `.topbar-inner` 取消 `max-width: 1120px` 和居中限制，改为 `width: 100%; max-width: none`
  - `.main-content` 取消 `max-width: 1120px` 和居中限制，使用整屏宽度
  - 桌面左右 padding 改为 32px，窄屏继续按 media query 收紧
- `frontend/src/style.css`：
  - 全局 `.container` 同步取消 1120px 固定宽度，避免其他页面仍被限制

### 验证与部署

- `cd frontend && npm run build`：通过，`vue-tsc` 0 错误，Vite 138 modules
- 软链接部署模式下 `frontend/dist` build 即上线
- 新产物：`index-DCeR9mJf.js` / `index-DgcnnkhM.css`

---

---

## 2026-06-12 — v0.6 设计文档 R2 Developer 复审

- 本次角色：全栈开发（Developer）
- 模式：Review（标准迭代 v0.6 设计阶段 R2 复审）
- 涉及文档：`docs/progress/iterations/v0.6-design.md`、`docs/progress/iterations/v0.6.md`
- 结论：⚠️ **有条件通过（R2）**（R1 高严重度 2 条全部关闭，R2 新增 1 中 + 1 低）

### R1 逐条核验

**高严重度（2 条全部关闭）**：

- ✅ **#D1 workerLoop 主循环改造**：R2 §4.4 新增完整伪代码（5 claim 分支 + 3 semaphore + routing + L1_CONCURRENCY env）—— 从 2 分支 2 sem 扩展到 5 分支 3 sem 的完整工程量已给出
- ✅ **#D2 llm.ts 双模型支持**：R2 §4.5 callLLM\<T\> 抽象 helper 完整实现路径 + OPENAI_MODEL 兜底 + classifyL0LLM / processL1LLM 新增函数——向前兼容 v0.5 processLLM

**中严重度（2 关闭 / 3 承接到实施阶段）**：

- ✅ **#D4 手动重试 task type**：§3.2 明确 POST 创建 type=l1_process + §4.4 maxAttempts=3
- ✅ **#D6 score_dimensions 统一**：§4.3 Stage 4 prompt 已改用 `score_dimensions`
- ⚠️ **#D3 space_id UUID 暴露**：正文未修，nginx /uploads/ 无 internal 指令。承接到实施阶段
- ⚠️ **#D5 GlobalLevelStatusCounts 前端无落点**：正文 §5.2 组件表未补该行。承接到实施阶段
- ⚠️ **#D7 source_refs 扩展结构**：§4.3 Stage 5 仍只说"扩展"无具体结构。承接到实施阶段

**低严重度（2 关闭或可接受 / 1 承接到实施阶段）**：

- ✅ **#D8 旧 processor 不改**：§6.3 明确"保留不变"
- ✅ **#D10 env 兜底关系**：§4.5 明确 OPENAI_MODEL 兜底
- ⚠️ **#D9 旧路由文件删除**：正文未补。承接到实施阶段

### R2 新增意见（2 条）

- **#D11（中）l1_retry task type 存在但无明确创建来源**：§3.2 POST endpoint 创建 l1_process 类型任务，§4.4 BACKOFF_CONFIG 和 workerLoop 有 l1_retry 配置和 claim 分支，但正文未说明何时创建 l1_retry task——如果从不创建则为死代码。推荐方案 B：移除 l1_retry type，仅保留 l1_process + metadata 标注触发来源
- **#D12（低）§4.3.6 交叉引用断链**："见 §6.2 迁移 DML"但 §6.2 无对应 DML。建议补齐 Tester #T7 建议的保护性 UPDATE DML，或改引用

### PM R2 #P5 确认

Developer 视角确认 PM R2 #P5 指出的 5 处正文不一致中，§6.1 "7 新增列"（实际 DDL 9 列）直接影响 Developer 迁移清单完整性——可能漏 l0_label / l1_next_retry_at 两列。建议 Architect 修正。

### 有条件通过条件

- 条件 A：#D11 l1_retry 创建时机需 Architect 明确（推荐方案 B 移除 l1_retry）
- 条件 B：#D3 / #D5 / #D7 / #D9 承接到实施阶段第 1 道工作
- 条件 C：§6.1 "7 列" → "9 列"建议 Architect 修正
- 条件 D（维持 R1）：实施前恢复 test DB + .env.test

### 关联

- 关联迭代：v0.6（设计阶段 R2 复审中，PM + Developer 已通过，待 DevOps / Tester）
- 关联文档：`v0.6-design.md` Review 记录 § Developer R2 Review
- 下一步：DevOps / Tester R2 复审 → 全部通过则设计定稿进实施阶段

---

## 2026-06-12 — v0.6 设计文档 R1 Review + 代提 DevOps R1 遗留

- 本次角色：全栈开发（Developer）
- 模式：Review（标准迭代 v0.6 设计阶段 R1）+ 代提 DevOps 遗留
- 涉及文档：`docs/progress/iterations/v0.6-design.md`、`docs/progress/iterations/v0.6.md`
- 结论：⚠️ **有条件通过**（10 条意见：2 高 / 5 中 / 3 低）

### 入场代提（依据 last-out-unified-commit）

入场 `git status` 发现工作区有 DevOps 上一会话未提交的脏改动（v0.6-design.md DevOps R1 完整 Review 段 + Review 状态表 / v0.6.md 设计阶段门禁 / INDEX 翻牌 / devops-current.md 收尾记录 / devops-archive.md 早期补登 5 个文件改动）。按 last-out-unified-commit 规则代提：
- commit `9a9b974` — DevOps: v0.6 设计文档 R1 Review + 会话收尾（4 个文件）
- commit `8821641` — DevOps: devops-archive.md 补登 2026-06-06 会话收尾（1 个文件）

模式同 2026-06-10 UI 代提 Architect R2 追审、2026-06-11 Developer 代提 Architect UI R1。DevOps 角色日志的 Review 记录已在 devops-current.md 中由 DevOps 自己写完。

### Developer 视角 10 条意见（2 高 / 5 中 / 3 低）

**高严重度（工程量遗漏 + LLM infra 路径缺失）**：

- **#D1 §4.4 / §6.3 只列了 `requeueTask` 改造但遗漏 `workerLoop` 主循环改造**：现有 `dispatcher.ts:162-219` 只支持 `fetch` / `process` 2 个 type 分支轮询 claim；v0.6 需要新增 `l0_classify` / `l1_process` / `l1_retry` 3 个 type 分支 + 对应 semaphore（`l0_classify` 可复用 `processSem`，`l1_process` 是否需独立 sem 待评估）+ 对应分发 routing（调 `l0Classifier` / `l1Processor`），共约 100 行代码工程量遗漏，影响 Developer 工时估算 30-40%
- **#D2 `llm.ts` 当前只支持单一模型 endpoint**（`config.openaiModel`），新增 `processL1LLM()` 需要支持 `L0_LLM_MODEL` / `L1_LLM_MODEL` 双模型切换 + 抽象通用 `callLLM<T>(prompt, opts: {model?, timeout?})` helper；§6.3 只写了「扩展」无实现路径，需要 Architect R2 明确

**中严重度（工程细节/契约对齐）**：

- #D3 §4.7 上传文件目录 `/var/lib/niuma-news/uploads/spaces/{space_id}/...` 把 DB 主键 UUID 暴露在静态路径，nginx 配置无 `internal` 指令，建议改为 API 透传或加访问限制
- #D4 §3.2 `POST /v1/l1-tasks/:task_id/retry` 未指定新 task type（`l1_process` vs `l1_retry`）；推荐 `l1_process` + attempt=0 重置
- #D5 §5.2 组件数据对接表遗漏 `GlobalLevelStatusCounts → GET /v1/global-level-status-counts` 映射（新增 6 个 endpoint 之一在前端无落点）
- #D6 §4.3 Stage 4 LLM prompt 输出 key 名 `scores` 与 §3.2 API `score_dimensions` + §3.4 TS `ScoreDimensions` 不一致；统一为 `score_dimensions`
- #D7 §4.3 Stage 5 `source_refs` 扩展结构 0 字定义；建议明确结构或声明本期不扩展

**低严重度（决策说明）**：

- #D8 v0.5 `processor.ts` 不会设置 `tags_v2` / `score_total`，建议不改旧 processor（避免回归）
- #D9 §5.1 路由 diff 删除 import 后旧 `AlertsPage.vue` / `LogsPage.vue` 是否 `git rm` 未说，建议同 commit 删除（v0.5.1 6 个孤儿组件经验教训）
- #D10 §4.5 `L0_LLM_MODEL` / `L1_LLM_MODEL` 与 v0.5 `OPENAI_MODEL` 兜底关系未说明

### 关键事实摸底（已 grep 复核）

- `dispatcher.ts:162-219` workerLoop 只有 fetch / process 2 个分支
- `llm.ts:91-98` 使用 `config.openaiModel` 单模型 + `extractFirstJsonObject` 解析
- `config.ts:30-33` `OPENAI_MODEL` 默认 `gpt-4o-mini` + `llmMaxRetries=3` + `llmRetryBaseSeconds=1.0`
- `processor.ts:38-65` jin10 走直显模式，其余走 LLM——v0.6 设计文档保留 processor.ts 不改是合理的决策
- `worker/index.ts:63-65` 当前只有 fetchSem + processSem 两个并发池

### 与已提交 Review 的关系

- PM R1 ⚠️ 有条件通过（4 条：1 中 #P1 L0 retryable / 1 中 #P2 SQL 24h 窗口 / 1 低 #P3 口径 / 1 低 #P4 开放问题数量）
- Tester R1 ⚠️ 有条件通过（11 条：3 高 / 5 中 / 3 低）
- DevOps R1 ⚠️ 有条件通过（11 条：3 高 / 5 中 / 3 低）
- **Developer R1 ⚠️ 有条件通过（10 条：2 高 / 5 中 / 3 低）**
- **5 方设计 R1 Review 全部收齐，全部 ⚠️ 有条件通过，共识门槛已到**

### 关联

- 关联迭代：v0.6（设计阶段 R1 已 5 方收齐）
- 关联文档：`v0.6-design.md` Review 记录 § Developer R1 Review
- 下一步：Architect 汇总 4 方意见后产出 R2 或直接进实施阶段；Developer 实施时第一道工作主动评估 dispatcher workerLoop 改造 + llm.ts 双模型抽象

---

## 2026-06-11 — v0.6 UI 方案 R1 Review + 代提 Architect R1 遗留

- 本次角色：全栈开发（Developer）
- 模式：Review（标准迭代 v0.6 UI 方案阶段 R1）+ 代提 Architect 遗留
- 涉及文档：`docs/progress/iterations/v0.6-ui-spec.md`、`docs/progress/iterations/v0.6.md`
- 结论：⚠️ **有条件通过**

### 入场代提（依据 last-out-unified-commit）

入场 `git status` 发现工作区有 Architect 上一会话未提交的脏改动（UI spec Architect R1 完整 Review 段 + Review 状态表 + v0.6.md 阶段门禁 + INDEX 状态翻牌），独立 commit `21936f8` 代提，模式同 2026-06-10 UI 代提 Architect R2 追审。Architect 角色日志的本次 Review 记录由 Architect 下次上班补登。

### Developer 视角 12 条意见（3 高 / 6 中 / 3 低）

**高严重度（事实性偏移，建议 UI R2 1-2 行修订即可关闭）**：

- **#D1 §2.2/§2.3 把 v0.5.1 已删的 `ChannelPills.vue` `ChannelFilter.vue` 当成"现有"列入组件树和迁移矩阵**：实际 v0.5 `NewsPage.vue:140-220` 是完全内联 `.cc-pill` / `.cc-search` 实现，不依赖这俩组件
- **#D2 §7 API 契约 `GET /v1/alerts/count` 路径错**：v0.5 真实路径是 `/v1/alerts/unread-count`（`frontend/src/lib/api.ts:325-326`）
- **#D3 §4.1 映射表里的 `var(--secondary)` `var(--text-primary)` 在 style.css 不存在；D10「中性 secondary 色」与 §2.3 TagChip「保留 不改」直接矛盾**：TagChip 当前是 4 色 hash 轮转，要"全中性"必须改

**中严重度（工程实施细节缺失）**：

- #D4 SlidePanel「props 改默认 480px」工程量未计，当前没有 width prop，宽度 CSS 写死 460px
- #D5 D14 ESC 键关闭抽屉需新增键盘监听，§2.3/§6 未体现工程量
- #D6 §4.1「不引入 Tailwind」但马上给映射表，映射用途（参考 vs 规范）未明
- #D7 §7 13 项 endpoint 与真实代码未全表对照复核（已知 #D2 错，其余 5 项"沿用 v0.5"也需核）
- #D8 IconUploader emit error 缺 kind 区分（validation 走行内 / network 走 Toast）
- #D9 §5.5 监控页 Tab 切换+URL 同步实现路径未定（query param vs ref state）

**低严重度（口径/命名/计数微调）**：

- #D10 §6.5 LevelStatus 11 项与 PRD §2.3 状态机 5+6 态命名前缀关系未明
- #D11 §9.2 角标轮询 60s 与 App.vue 一致；与 Architect #A11 同源赞同保持
- #D12 §2.4 数量口径与 §2.2 / 表行数不一致；与 PM #P4 / Architect #A8 同源

### 与已提交 Review 的关系

- PM ⚠️ 有条件通过（5 条，#P1 Owner 已关闭）
- Architect ⚠️ 有条件通过（10 条：2 高 / 5 中 / 3 低）
- **Developer ⚠️ 有条件通过（12 条：3 高 / 6 中 / 3 低）**
- 3 方累计达成「⚠️ 有条件通过」共识门槛
- 等待 Tester R1 完成

### 关联

- 关联迭代：v0.6（UI 方案 R1 Review中）
- 关联文档：`v0.6-ui-spec.md` Review 记录 § Developer R1
- 下一步：Tester R1 → UI 汇总 4 方意见后整体修订或直接进设计阶段

---

## 2026-06-11 — v0.6 PRD R2 Developer 复审

- 本次角色：全栈开发（Developer）
- 模式：Review（标准迭代 v0.6 PRD 阶段 R2 复审）
- 涉及文档：`docs/progress/iterations/v0.6-prd.md`、`docs/progress/iterations/v0.6.md`
- 结论：⚠️ **有条件通过**

### Developer R1 13 条逐条核验结果

- ✅ **完全关闭（4 条）**：#D3 退避策略冲突（AC-08 + AC-34 双重保险）、#D11 措辞绝对（AC-23/24/25 已加限定词）、#D12 npm 依赖（§5 列入 `@fastify/multipart`）、#D13 80 字符上限
- 🟡 **基本关闭（5 条）**：#D1 mock 三档拆分（但 §4.1 实施顺序未显式加）、#D4 §2.7 图标上传硬约束（接口字段仍需设计阶段补）、#D8 段落级粒度已定（数据结构待设计阶段）、#D9 必需性+失败行为已定（同步/异步策略待设计阶段）、#D10 mock+.env 同步策略已写
- 🟡 **合理分流（1 条）**：#D6 五类标签开闭集已定（具体 TS 类型待设计阶段）
- ❌ **未关闭（3 条）**：
  - **#D2 前后端契约清单 0 字未补**（关键缺口；v0.5 PRD R2 §10 经验值反证 4-5 个 endpoint 的"路径+入参+响应字段"骨架必须给）
  - **#D5 AI 单次 JSON 输出策略未给方向**（单次/多次调用 + 部分成功是否进入新闻流是产品决策）
  - **#D7 §2.6 重构 10 页面工程量/Vue 组件迁移清单缺失**（与 UI #U8/#U9 同向）

### R2 新增内容工程层评估

§2.3 状态机 / §3.2 错误分类 / §3.7 监控路由 / §3.8 不回归 / §5 外部依赖边界 / §2.7 上传硬约束 6 块工程实施路径清晰、可直接承接。状态命名 + 转移路径完整，可在设计阶段按"`raw_items.l0_status` + `raw_items.l1_status` 双字段独立 + `tasks.type` 分流"承接（与 Architect R2 §1 推荐方向一致）。

### R2 新增意见（2 条）

- **#D14（中）AC-07「JSON 格式错误算可重试」与 §3.2 错误分类表「AI 输出连续不合法→不可重试」语义冲突**：AC-07 把 JSON 格式错误和 LLM 超时并列为可重试（→ 3 次退避），但同样输入再调一次大概率仍解析失败；建议 R3 或设计阶段把 JSON 格式错误细分为"重试上限 = 1"，与"网络/服务级（重试 3 次）"分开两档
- **#D15（低）AC-32 监控指标 3 个触发条件全是描述性词语**（连续失败/长时间无进展/异常增长）：建议 R3 加一句"具体阈值由设计阶段定，参考 v0.5 x_stream_disconnected 误告警经验，建议初版宽松"

### 有条件通过的 4 个条件

- **条件 A**：建议 R3 补 2 句（#D2 §3.9 契约清单草案 1 句 + #D14 错误分类语义澄清 1 句）
- **条件 B**：如不开 R3，Developer 在设计阶段第一道工作主动产出 v0.6 前后端契约草案文档（参考 v0.5 R2 §10 体例），commit message 标注"PM 未在 R2 提供契约清单"假设
- **条件 C**：#D5 LLM 调用拆分策略 + #D7 Vue 组件改造清单由设计阶段承接，必要时回流 PRD
- **条件 D**：v0.5 测试当前禁用，本期实施前必须先恢复独立 test DB + `.env.test`（前置工作），否则 AC-34 不回归验收无法验证

### 与其他角色复审一致性

- UI R2 ⚠️ 有条件通过（建议 R3 补 4 句）
- Architect R2 ⚠️ 有条件通过（追审段后修订）
- **Developer R2 ⚠️ 有条件通过**（建议 R3 补 2 句或设计阶段承接）
- 3 方累计达成"⚠️ 有条件通过"共识门槛
- 等待 Tester / DevOps R2 复审

### 关联

- 关联迭代：v0.6（PRD R2 Review中）
- 关联文档：`v0.6-prd.md` Review 记录 § Developer R2
- 下一步：等待 Tester / DevOps 完成 R2 复审；PM 汇总后决定是否开 R3 或直接进 UI 方案阶段

---

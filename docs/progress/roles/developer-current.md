# 全栈开发工作日志 — Current

> 最近 5 条工作日志。其余条目按时间倒序归档到 `developer-archive.md`。
> 长期摘要、当前关注点、常见风险见 `developer-summary.md`。
> 分层时间：2026-06-09（v0.6 PRD R1 Review 收尾时按 `context-policy.md` 分层归档）

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
- Owner 继续验证；7 commit 待 push（Owner 未决定）；浏览页新闻列表骨架是否统一成 Loading 待定；OpenClaw 集成（原 P1）仍挂起

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

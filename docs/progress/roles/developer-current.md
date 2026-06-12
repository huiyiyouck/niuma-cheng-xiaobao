# 全栈开发工作日志 — Current

> 最近 4 条工作日志。其余条目按时间倒序归档到 `developer-archive.md`。
> 长期摘要、当前关注点、常见风险见 `developer-summary.md`。
> 分层时间：2026-06-09（v0.6 PRD R1 Review 收尾时按 `context-policy.md` 分层归档）

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


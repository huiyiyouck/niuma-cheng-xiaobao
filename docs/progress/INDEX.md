# 项目进度索引

> 本文件是项目级当前状态的唯一真源。启动时 Agent 读此文件即应能判断"现在卡在哪、下一步做什么"，不需要再去翻迭代记录。

## 当前项目状态

- 当前迭代：v0.6
- 当前模式：标准迭代
- 当前阶段：PRD 阶段 R1 Review中（Architect 已完成 ❌需修改；UI 已完成 ❌需修改；Developer 已完成 ❌需修改；Tester 已完成 ❌需修改）
- 阻塞项：—
- 下一步入口：DevOps Review `iterations/v0.6-prd.md`

## 版本列表

| 版本 | 迭代记录 | PRD | UI | 设计文档 | Summary | 状态 |
|------|----------|-----|----|----------|---------|------|
| v0.1 | [iterations/v0.1.md](iterations/v0.1.md) | [iterations/v0.1-prd.md](iterations/v0.1-prd.md) | 无（早期版本） | [iterations/v0.1-design.md](iterations/v0.1-design.md) | — | 已完成 |
| v0.2 | [iterations/v0.2.md](iterations/v0.2.md) | [iterations/v0.2-prd.md](iterations/v0.2-prd.md) | [iterations/v0.2-ui-spec.md](iterations/v0.2-ui-spec.md) | [iterations/v0.2-design.md](iterations/v0.2-design.md) | — | 已完成 |
| v0.3 | [iterations/v0.3.md](iterations/v0.3.md) | 无（纯迁移） | 无 | [iterations/v0.3-tech-eval.md](iterations/v0.3-tech-eval.md) | — | 已完成 |
| v0.4 | [iterations/v0.4.md](iterations/v0.4.md) | [iterations/v0.4-prd.md](iterations/v0.4-prd.md) | [iterations/v0.4-ui-spec.md](iterations/v0.4-ui-spec.md) | [iterations/v0.4-design.md](iterations/v0.4-design.md) | [iterations/v0.4-summary.md](iterations/v0.4-summary.md) | ✅ 已完成（有条件关闭 2026-05-31）|
| v0.5 | [iterations/v0.5.md](iterations/v0.5.md) | [iterations/v0.5-prd.md](iterations/v0.5-prd.md) | [iterations/v0.5-ui-spec.md](iterations/v0.5-ui-spec.md) | [iterations/v0.5-design.md](iterations/v0.5-design.md) | [iterations/v0.5-summary.md](iterations/v0.5-summary.md) | ✅ 已完成（有条件关闭 2026-06-09）|
| v0.6 | [iterations/v0.6.md](iterations/v0.6.md) | [iterations/v0.6-prd.md](iterations/v0.6-prd.md) | — | — | — | PRD 阶段 R1 Review中（3/5 已 Review） |

## 当前 Change Notes

| Change Note | 关联工作 | 状态 | 下一步 |
|-------------|----------|------|--------|

## 当前非迭代工作

| 日期 | 模式 | 记录 | 状态 | 下一步 |
|------|------|------|------|--------|
| 2026-06-08 | Bugfix | [X Stream fetch failed 误告警 + 断流漏收补偿](ad-hoc/2026-06-08-bugfix-x-stream-fetch-failed-alert.md) | ✅ 已完成并临时部署 — `x-stream-manager.ts` 将 `fetch failed` / socket reset / timeout / undici transient errors 归类为长连接常规重连路径；追加确认 `scheduler.ts` 误排除 `x_twitter`，已接回 timeline 补偿调度；部署时清理残留手工 Node 进程并恢复 systemd active；日志确认 `X STREAM connected`；已按原型创建 AI/财经空间、8 个频道和 4 个 X Source 展示位置，补偿抓取已生成新闻 | Owner 浏览器验证 AI/财经空间新闻展示；后续如需多位置投放，需修正 `display_positions` 唯一索引 |
| 2026-06-07 | Delete Request | [Developer 删除请求：5 个孤儿前端组件](ad-hoc/2026-06-07-developer-delete-request-orphan-frontend-components.md) | ✅ 全线完成 — Architect ✅通过（b02cbd4）→ Developer 执行 `git rm` + commit（a79acfb）→ `npm run build` 通过 0 错误 | 待 DevOps 部署 dist |
| 2026-05-31 | Proposal | [DevOps 提案：数据库迁移机制规范化](ad-hoc/2026-05-31-devops-proposal-db-migration-mechanism.md) | ✅ 全线完成 — Step 1（Architect R1）+ Step 2（Developer）+ R2（Architect 复审）+ Step 3（DevOps 部署侧）+ #B2（Architect 独立评估）；ADR-001 落 [`docs/baseline/architecture.md`](../baseline/architecture.md)；操作手册落 [`docs/knowledge/devops/db-migration-handbook.md`](../knowledge/devops/db-migration-handbook.md) | — |
| 2026-05-31 | Ops Task | [清理 v0.3 Python 遗留 systemd unit + Node 后端 systemd 化](ad-hoc/2026-05-31-ops-cleanup-legacy-systemd-units.md) | ✅已完成（旧 unit 全清 + Node 后端已切换为 systemd 管理，崩溃重启已验证） | — |
| 2026-05-31 | Incident | [Node.js 后端源码被基线同步 commit 误删](ad-hoc/2026-05-31-incident-server-source-deleted-by-baseline-sync.md) | 已完成：恢复→推送 GitHub→重启→健康检查通过 | （留观，无后续动作） |
| 2026-06-02 | Product Brief | [信息评分方法论](ad-hoc/2026-06-02-product-brief-scoring-methodology.md) | 草稿（Owner 已确认方法论范围，待正式 PRD 化） | PM 收编进 v0.5 PRD；Architect / Developer / Tester 后续按正式迭代流程 Review |
| 2026-06-02 | Product Brief | [信息源管理重构](ad-hoc/2026-06-02-product-brief-source-management-redesign.md) | 草稿（Owner 已确认产品方案，待正式 PRD 化） | PM 收编进 v0.5 PRD；Architect / UI 后续按正式迭代流程 Review |
| 2026-06-01 | Product Brief | [信息平台演进方向](ad-hoc/2026-06-01-product-brief-information-platform-evolution.md) | 草稿（方向已确认，细节待迭代） | 作为 v0.5+ 迭代方向性输入材料 |
| 2026-05-30 | Product Brief | [X/Twitter 指定账号实时监听](ad-hoc/2026-05-30-product-brief-x-filtered-stream.md) / [技术实施规划](ad-hoc/2026-05-30-tech-plan-x-filtered-stream.md) | 已完成，登记为 v0.5 输入材料 | 用户启动 v0.5 后，交由 PM 和架构师正式 Review |

## 候选迭代输入材料

| 候选版本 | 材料 | 来源 | Review 状态 | 启动入口 |
|----------|------|------|-------------|----------|
| v0.5 | [X/Twitter 指定账号实时监听 Product Brief](ad-hoc/2026-05-30-product-brief-x-filtered-stream.md) / [Shared Filtered Stream 技术实施规划](ad-hoc/2026-05-30-tech-plan-x-filtered-stream.md) / [信息平台演进方向](ad-hoc/2026-06-01-product-brief-information-platform-evolution.md) / [信息源管理重构 Product Brief](ad-hoc/2026-06-02-product-brief-source-management-redesign.md) / [信息评分方法论 Product Brief](ad-hoc/2026-06-02-product-brief-scoring-methodology.md) | 编外成员 + PM 讨论沉淀 | 已收编进 `iterations/v0.5-prd.md` R1 | 按 PRD 动态 Review 计划推进 |

## 最近收尾摘要

| 日期 | 角色 | 工作 | 结论 | 下一步入口 |
|------|------|------|------|------------|
| 2026-06-10 | Tester | v0.6 PRD R1 Review 会话收尾 + Tester 日志分页归档 | ✅ 已完成 — Tester 日志超 300 行阈值（359 行），按 `context-policy.md` 拆为 tester-current.md（v0.6 + v0.5 共 6 条，本次会话收尾在内）/ tester-archive.md（v0.4 共 3 条）/ tester-summary.md（长期摘要 + 当前关注点 + 8 类常见风险）三层；INDEX 角色日志表同步更新。v0.6 仍处于 PRD R1 Review中（4/5 已完成） | DevOps 完成 R1 Review；PM 汇总后产出 R2 |
| 2026-06-10 | Tester | v0.6 PRD R1 Tester Review | ❌ 需修改 — 12 条意见（4 高 / 5 中 / 3 低）：高严重度集中在 L0/L1 状态机未定义导致 AC-04/AC-09/AC-10/AC-20 测试断言无落点（#T1，与 #A1 同源）、外部依赖三件套（LLM/搜索/链接读取）mock 策略 PRD 全程缺失致 §3.2~§3.4 在 CI 零条可测（#T2）、外部依赖失败后的"系统可观测行为"验收覆盖不全只要求"记录"不足（#T3）、不回归边界**完全缺失**——v0.5 53 个测试和 5 条功能线均无守住 AC（#T4）；中严重度 5 条覆盖 AI 输出验证分层（自动化/人工/冒烟）、前端展示类 AC 验收手段、AC-11/AC-12/AC-13 可观测载体、AC-03 L0 跳过条件 5/8 不可枚举、空间上传异常 4 类常见场景；低 3 条为同秒排序、AC-25 验证手段、L1 手动重试入口。判断：v0.6 在 28 条 AC 正常路径上覆盖充分，但**测试可达性**层面与 #A1/#A2/#A3/#D1/#D2/#U4 一致缺收敛，PM R2 必须修齐前 4 项才能落到测试阶段 | DevOps 完成 R1 Review；PM 汇总后产出 R2，Tester 复审 |
| 2026-06-09 | Developer | v0.6 PRD R1 Developer Review | ❌ 需修改 — 13 条意见（4 高 / 6 中 / 3 低）：高严重度集中在 mock 数据"一刀切"与渐进式迁移矛盾（#D1）、前后端契约清单全程缺失（#D2，v0.5 R2 §10 经验值反证关键性）、AC-08 退避策略与现有 `dispatcher.ts requeueTask` 冲突会污染 v0.5 X Stream 抓取（#D3）、空间图标上传缺工程契约且 Fastify 未装 multipart（#D4）；中严重度 6 条覆盖 AI 单次 JSON 输出体量、五类标签结构骨架、Vue 组件迁移工程量、置信度数据载体、库内检索同步策略、开发联调环境；低 3 条为措辞、依赖增量列表、字段长度上限。整体判断：v0.6 三条主线落到现有 Node.js+Vue 栈技术可行（schema/dispatcher/SlidePanel 可复用），但 PRD 在"能不能让开发拆任务"层面有结构性缺口；与 Architect #A1-#A8 / UI #U1-#U9 一致判断，本轮 PRD 把太多产品决策甩给设计阶段 | Tester / DevOps 完成 R1 Review；PM 汇总后产出 R2，Developer 复审 |
| 2026-06-09 | UI | v0.6 PRD R1 UI Review | ❌ 需修改 — 12 条意见（4高/5中/3低）：高严重度集中在原型核心交付物缺画（#U1 抽屉 vs 常驻面板冲突 + 四段式在原型完全没画 / #U3 空间图标上传 UI 在原型完全没画）、路由结构不一致（#U2 现有 5 路由 vs 原型 4 路由合并 alerts+logs 到 monitoring，PRD 没决策）、4 维评分+5 类标签视觉密度未收敛（#U4）；中严重度 5 条覆盖来源标签视觉、mock 数据过渡形态、L0/L1 处理状态前台可见性、信息源新增入口路径、统计卡片口径；低 3 条为措辞与边界澄清。整体判断：PRD 把 Figma 原型当成"已成型 UI 答案"是误判——核心交付物在原型直接缺画，PM 不能默认 UI 阶段照抄就行 | Developer / Tester / DevOps 完成 R1 Review；PM 汇总后产出 R2，UI 复审 |
| 2026-06-09 | Architect | v0.6 PRD R1 Review + 架构师日志分页归档 | ❌ 需修改 — 11 条意见（3高/5中/3低）：高严重度集中在状态机未定稿（#A1）、可重试/不可重试错误未划清（#A2）、4 类外部依赖（LLM/X 搜索/Web 搜索/链接读取）"具体用什么"全甩给设计阶段（#A3）；中严重度 5 条覆盖评分公式、五类标签定义、补全来源标签粒度、库内检索算法、图标存储；低严重度 3 条为措辞完善。三条主线技术可行性 OK 无架构红线，v0.5 schema 可作良好基线，但 #A1-#A3 必须 PM 在 PRD 收敛不能甩给设计阶段。同 commit 完成架构师日志分页归档（原 559 行 → current 154 行 + summary 87 行 + archive 451 行）| UI / Developer / Tester / DevOps 完成 R1 Review；PM 汇总后产出 R2，Architect 复审 |
| 2026-06-09 | PM | v0.5 迭代关闭检查 + Summary 归档 + 知识库沉淀 | ✅ **可关闭（有条件关闭）** — 8 项检查 7 通过 1 已补齐（Summary 已创建）；条件 A：v0.5.1 X 反向同步未走标准 R1/R2 流程，必要时后续追加 Tester 复审；条件 B：Owner 试用 7 commits 视觉细化不升 R2；条件 C：评分方法论本迭代只交付文档。产出 `v0.5-summary.md`（16 项关键决策 / Review 质量结论 / 遗留 / 4 项 v0.6+ 候选机会 / Git 节点）+ `external-portal-as-truth-source.md` 知识库条目 + v0.5.md 关闭归档节 + INDEX 当前状态推进到「无 / 未选择 / 工作台空闲」；同 commit 合并 Developer 视觉收口遗留脏改动（last-out-unified-commit）| Owner 决定下一步（启动 v0.6 / 其他非迭代任务 / 暂停）|
| 2026-06-09 | PM | v0.6 需求讨论 + 标准迭代启动 + PRD R1 | ✅ 已创建 v0.6 标准迭代和 PRD R1 — 范围锁定为 `/root/news-aggregation-platform` Figma 原型前端重构、X 信息 L0/L1 分层处理、空间图标上传；明确 L2/反馈/详情页/前端策略配置/Source 代理前端配置不进本期；L1 采用库内检索、链接读取、按需 X/Web 搜索、四维评分和来源标签展示 | UI / Architect / Developer / Tester / DevOps 分别 Review `iterations/v0.6-prd.md` |
| 2026-06-09 | PM | v0.6 PRD R1 会话收尾 + PM 日志分页沉淀 | ✅ 已完成 — PM current 层收尾前 396 行，超过 `context-policy.md` 300 行阈值；已将较旧 PM 记录移入 `pm-archive.md`，更新 `pm-summary.md` 到 v0.6 当前状态，并追加本次收尾记录。v0.6 仍处于 PRD R1 Review中 | UI / Architect / Developer / Tester / DevOps 分别 Review `iterations/v0.6-prd.md` |
| 2026-06-08 | Developer | 前端规范统一 — 字体层级 / 弹窗抽屉 / 死代码清理 + 1280px 居中回调 | ✅ 已完成 — 新增 `--text-xs/sm/base/md/h1-h4` 字号变量 + `--weight-bold/xbold/black` 字重变量；`ModalContainer` 改用全局 `.modal-dialog` 消除三套弹窗差异；`SlidePanel` 背景统一为 `var(--card)`，遮罩与弹窗一致；删除 4 个零引用死组件（`PageTitle/CreateSpaceModal/SourceLibraryCard/TagSelector`，Owner 直接授权跳过 Architect Review）；修复 `AlertsPage .page-title` 900/800 冲突 + `SourceDetailPage` 硬编码 `monospace`。同日先将 1280px 宽度限制取消改为铺满，Owner 反馈"太散"后回调为 `max-width: 1280px; margin: 0 auto`。`npm run build` 通过 0 错误，commit `7969e08`+`ddfb8e5`，软链接部署已上线 | Owner 刷新生产页面验证弹窗/抽屉/字号视觉 |
| 2026-06-08 | Developer | 大屏展示区域宽度限制修复 | ✅ 已完成 — Owner 反馈电脑端可用空间很多，但页面被 1120px 宽度限制，字号放大后产生挤压。已取消 `App.vue` 中顶栏和主内容区 `max-width:1120px` 限制，改为使用整屏宽度；全局 `.container` 同步取消固定宽度。前端 build 通过，软链接部署已上线 | Owner 在电脑端刷新 `/admin` 验证表格和管理区是否充分利用屏幕 |
| 2026-06-08 | Developer | 信息源库搜索 500 修复 | ✅ 已完成 — `/v1/sources?search=...` 触发 500 的根因是搜索逻辑展开 `content_topics` 时假设其为 JSON 数组，但生产 X 同步源当前为 `{}` 对象；同时 SQL 使用表别名参与 `ILIKE`。已改为 `jsonb_typeof(content_topics)='array'` 时才展开，并使用显式列别名；搜索 total 同步按筛选条件计算。后端 build 通过、服务已重启，本机和公网搜索 `Claude code官方账号` 均返回 200 且 total=1 | Owner 在信息源库搜索框复测 |
| 2026-06-08 | Developer | 生产前端字号与管理页视觉校准 | ✅ 已完成 — 针对 Owner 反馈“生产字体偏小、与运行图存在视觉差异”，统一上调全局基础字号、按钮/筛选/徽章/表单/分页，并重点校准管理页空间卡片、频道栏、信息源卡片、信息源库表格和状态徽章。`cd frontend && npm run build` 通过，软链接部署已上线，`nginx` 与 `news-api.service` 均 active | Owner 刷新生产页面验证视觉大小；若仍偏小，再按具体页面做二次微调 |
| 2026-06-08 | Developer | 前端动态 import 旧 chunk 兼容修复 | ✅ 已完成 — Owner 浏览器仍加载旧入口 `index-DWBXrqru.js`，但旧懒加载 chunk 已被新 build 清空，导致 `NewsPage-CjeHC2FU.js` 动态 import 失败。已补回旧 chunk 兼容副本；nginx `/assets/` 改为缺失直接 404、HTML 入口禁缓存；`frontend/vite.config.ts` 设置 `build.emptyOutDir=false`，后续 build 保留旧 hash 资源。`nginx -t`、`systemctl reload nginx`、`npm run build` 均通过 | Owner 刷新页面验证；后续部署无需手工清旧 chunk，若需清理资产需另做保留周期策略 |
| 2026-06-08 | Developer | 管理页原型对齐：信息源库表格 + 空间显示修复 + 频道补回 | ✅ 已完成 — 修复 `SpaceManagementTab.vue` 漏导入 `SpacePills` 导致空间区渲染异常；信息源库从卡片列表切回既有 `SourceTable/SourceTableRow`，按原型拆成 9 列并复用现有 Badge/Button/Filter/Pagination 组件；`GET /v1/sources` 补返回 `display_positions` 明细，修复信息源使用位置不展示；生产库补回 AI/财经原型频道，保留现有 `财经/Web3`。前后端 build 均通过，`news-api.service` active，本机 API 验证通过 | Owner 浏览器验证 `/admin` 空间管理与信息源库；如外网仍打不开，交 DevOps 查反代/TLS 链路 |
| 2026-06-08 | Developer | 管理页原型对齐：空间卡片与分栏细节 | ✅ 已完成 — `SpacePills.vue` 空间区改为更接近原型的卡片式样式并补描述字段；`SpaceManagementTab.vue` 收紧左右分栏、频道栏和排序图标外观；`SourceCard.vue` 删除重复多位置操作块。`cd frontend && npm run build` 通过，公网首页已引用新 bundle `index-Cn1YU1yc.js` | Owner 浏览器验证管理页视觉 |
| 2026-06-08 | Developer | v0.5 Bugfix：X Stream `fetch failed` 误告警 + 断流漏收补偿 + 临时部署 + 空间初始化 | ✅ 已完成 — 根因是建连/代理 socket 层 `fetch failed` 未纳入上一轮 `terminated` 正常断流分类，仍累计 `consecutiveDisconnects` 并创建 `x_stream_disconnected`；进一步确认断流期间会漏收，因 `scheduler.ts` 排除了 `x_twitter`，设计中的 timeline 补偿抓取未运行。已新增瞬时断流识别 + 接回 X 补偿调度；Owner 授权 Developer 临时部署，已恢复 systemd active，日志确认 `X STREAM connected`；生产库已创建 AI/财经空间和展示位置，新闻已生成 | Owner 浏览器验证空间新闻展示；后续常规部署仍交 DevOps |
| 2026-06-07 | DevOps | v0.5.1 前端部署上线 + 软链接架构发现 | ✅ 公网 https://news.huiyiyou.cloud/ 全栈 v0.5/v0.5.1 已上线。`npm run build` 0 TS 错误 / 135 modules / 17 bundles。12 项 verify 全过（HTML 引用 `index-hZzDm_iU.js`、bundle 字节 sha256 与本地 dist 一致、API 反代 200）。**架构发现**：`/var/www/news.huiyiyou.cloud` 是软链接 → `frontend/dist/`，build 即上线无需 rsync——已增补 [`full-stack-deploy-handbook.md`](../knowledge/devops/full-stack-deploy-handbook.md)「软链接部署模式」适配章节 | Owner 浏览器验证前端 UI |
| 2026-06-07 | Developer | 死代码扫尾 — ChannelPills.vue 第 6 个孤儿（Owner 直接同意路径） | ✅ 已完成 — 申请 `f5baf99` → Owner 在会话明确「项目负责人 + 零引用 = 直接同意，跳过 Architect Review」（依据 conventions §例外条款第 3 条）→ 执行 `git rm` + 撤回申请文档（commit `e35bcf1`，244 + 81 行净删）。`npm run build` 仍 0 错误。本次会话内 6 个孤儿全部清算完毕。日志同步登记 [基线修正提案]「前端组件替代时需对称约束」 | WM 启动时扫到本提醒处理 |
| 2026-06-07 | Developer | v0.5.1 前端 TS 错误 P0 阻塞解除（删除门禁后半段） | ✅ 已完成 — Architect ✅通过后，执行 `git rm` 5 个孤儿组件（commit `a79acfb`，按规范独立 commit + body 含删除清单 + Review 留痕）；`npm run build` 通过 0 错误，dist 已生成（135 modules / 114k js / 11k css gzip）。前端代码侧完全就绪 | Owner 切换到 DevOps 角色 → 部署 `frontend/dist/` 到 `/var/www/news.huiyiyou.cloud/` → Owner 浏览器验证 |
| 2026-06-07 | Architect | 受保护路径删除 Review：Developer 5 个孤儿前端组件 | ✅ 通过 — 零引用复核 + 依赖已删 API/类型/字段事实核查 + 替代关系一览成立；附 1 项观察 `ChannelPills.vue` 同属孤儿建议另起删除请求（不阻塞本次）。Developer 按规范执行 `git rm` + 独立 commit + 含「删除」字样和清单 Review 留痕即可 | Owner 切换到 Developer 角色执行删除 + 构建验证 + 移交 DevOps |
| 2026-06-07 | DevOps | v0.5.1 生产部署上线 + 收尾发现前端阻塞 | ⚠️ **仅后端部署通过** — systemd active (PID 547457)；drizzle migrate 幂等通过；X RULE SYNC `+0 ~4 -0 ↻0`；X STREAM connected；x_rule_id 4/4 回填。部署期前向修复 2 问题：undici 缺失 + drizzle journal 漂移。**收尾验证 URL 时发现前端 dist 是 5-31 旧版本，重新 npm run build 失败 31 个 TS 错误**（v0.5 重构遗孤 14 个文件），公网 https://news.huiyiyou.cloud/ 不可用于 v0.5/v0.5.1 验证 | 已登记 P0 给 Developer 修复 TS 错误 |
| 2026-06-07 | WM | 接入 Codex 第二客户端（事后补登基线修正提案） | ✅ 12 个文件 +7 行净增，主题单一、内部一致：新增 `AGENTS.md`（Codex 入口，与 `CLAUDE.md` 镜像）+ baseline 中 `CLAUDE.md` 硬引用泛化为「客户端入口文件（`CLAUDE.md` 或 `AGENTS.md`）」+ 受保护路径同步纳入 `AGENTS.md`；WM 双侧检查通过；Owner 直接动手未走提案流程，事后补齐 wm.md 留痕 | v0.5 部署就绪检查继续（Owner 浏览器手测 v0.5.1 前端 UI） |
| 2026-06-07 | Developer | v0.5 Owner 试用 Bugfix 批次：前后端契约对齐 + 空间/频道/源管理 + 告警批量 + 详情页重构 + Worker 并行化 + MCP 接入 + 全局代理 | ✅ 31 files, +2483/-970；前后端字段名/URL 全面统一；Worker 真正 7 并发；金十 MCP 直显模式已验证；commit `75ca9ae`；INDEX 登记 4 条 P1/P2 待办 | 上线部署：远程 DB 迁移 + npm install + 配置 .env |
| 2026-06-06 | Tester | v0.5 PRD R2 Tester 复审 | 通过：R1 全部 13 条已关闭（2 高/7 中/4 低）；附 1 条中严重度观察（失败计数矛盾，设计阶段消除）。PRD 已定稿 | 切换到 UI 进入 UI 方案阶段 |
| 2026-06-06 | Tester | v0.5 PRD R1 Tester Review | 需修改：状态模型混用导致 AC 不可测试、外部 API 失败场景缺失 2 项高严重度；并发/空白状态/数据清理回滚/告警抖动/30s同步可测试性/迁移冲突 7 项中严重度；评分 AC 主观性/不回归/迁移粒度/计数口径 4 项低严重度 | 等待 PM 汇总 R1 并提交 R2；届时由 Tester 复审 |
| 2026-06-06 | Developer | v0.5 PRD R1 Developer Review | 需修改：状态模型和"未使用"未定义 2 项阻断；告警动作未定义 1 项高；删除迁移冲突/创建回流/历史快照/搜索筛选 AND-OR 4 项中；空间管理/分页/计数口径 3 项低 | 等待 PM 汇总 R1 并提交 R2；届时由 Developer 复审 |
| 2026-06-02 | UI | v0.5 PRD R1 UI Review | 需修改：Source 状态模型存在 1 项高严重度问题；告警流转、频道删除迁移冲突、新建 Source 回流存在 3 项中严重度问题；空间级管理范围存在 1 项低严重度问题 | 等待 PM 汇总其余角色 R1 Review 并提交 R2；届时由 UI 复审 |
| 2026-06-02 | PM | v0.5 三条主线规划 + 标准迭代启动 + PRD R1 + 会话收尾 | ✅ 已完成当日规划工作；v0.5 停留在 PRD R1 Review中；PM 日志已分层归档 | UI / Architect / Developer / Tester / DevOps 分别 Review `iterations/v0.5-prd.md` |
| 2026-05-31 | DevOps | Step 3：drizzle 迁移机制部署侧落地 | ✅ 全 8 步完成 — baseline 注入 / A2 移依赖 / systemd ExecStartPre + StartLimitBurst / #B1 复现拦截已验证 / 操作手册落档；整条 P2 关闭从待办移除 | — |
| 2026-05-31 | PM | v0.4 迭代关闭检查 + 归档摘要 | ✅ 可关闭（有条件关闭）— 8 项检查全部通过；`v0.4-summary.md` 已创建；INDEX 状态更新为「v0.4 已关闭」 | 用户决定下一步（启动 v0.5 / 其他） |
| 2026-05-31 | WM | 三项基线修正提案合并落地（#1 受保护路径删除 Review 门禁 / #2 前后端契约变更同步检查 / #3 INDEX 跨任务待办模板化） | commit dfede2b 推送 origin/main；11 文件净增 136 行；触发源 2026-05-30 基线同步事故 + v0.3 砍 WS 后前端残留 5 个月 + Developer 元流程提案 | 新约束即刻生效 |
| 2026-05-31 | Tester | v0.4 测试报告 R1 翻牌定稿 | ✅ 已定稿 — PM/Developer 双 Review 通过 + PM 3 项收口决定全部闭环（事项 1 不升 R2 / 事项 2 进 INDEX P2 / 事项 3 条件已列清） | PM 或 WM 执行 v0.4 迭代关闭检查 |
| 2026-05-31 | Tester | v0.4 测试工作收尾：用户视觉验证 ✅ + RSS 实机延后决策落档 | ✅ 有条件通过；PRD 22 项最终覆盖 21 ✅ / 1 ⏸（RSS 实机抓取经用户决策延后至后续迭代） | PM 复审测试报告 → 迭代关闭 |
| 2026-05-31 | Developer | v0.4 视觉验证 Bugfix 批次：6 bug + WS 架构对齐 | commit e736980 推送 GitHub；DELETE 400/空 body 解析/Modal 不统一/复选框对齐/启用响应性/创建空间事件名/前端 WS 残留 全部修复；线上验证通过 | 待用户继续 v0.4 视觉验证或决定迭代关闭 |
| 2026-05-31 | Developer | Incident：基线同步 commit 误删 server/ 源码 → 从 git 历史恢复并重启服务 | server/ 38 文件 + deploy/systemd/news-api.service 已恢复并推送 GitHub（commit ec8073e）；新 PID 3870357 启动健康检查通过；v0.4 线上服务连续可用、未中断 | 下班；旧 systemd unit 清理与 server 是否进 systemd 待 DevOps 决定 |

## 跨任务待办

> 列入此表通常说明事项跨多个任务、归属角色明确但尚未启动；
> 若已有可独立的 ad-hoc 或基线修正提案，优先走对应流程。完成后从本表移除。
>
> **字段与写权限**：
> - **优先级**（P0/P1/P2）：登记时由提出方设定，归属角色可调整。
> - **待办**：一句话描述。
> - **归属角色**：登记时由提出方判定；写入后只能由归属角色本人变更（如转交）。
> - **来源**：任何角色的日志、ad-hoc、Incident、Review 结论、Owner 口述等；登记后不再改。
> - **状态**：**只能由归属角色更新**；其他角色发现状态过期可在会话里提醒，不可代改。
> - Owner 始终可以更新任何字段，作为兜底。

| 优先级 | 待办 | 归属角色 | 来源 | 状态 |
|--------|------|----------|------|------|
| **P0** | **修复 frontend 31 个 TS 错误使 `npm run build` 通过**（v0.5 重构遗孤：14 个文件含 SubChannel→Channel 重命名、Source.source_url/status 字段消失、SourceRole/AvailabilityStatus/DomainTag 类型契约偏移、SpaceDeletePreview/ChannelDeletePreview 形状变化、markVerified/listSubChannels 函数已删；详见 `iterations/v0.5.1-frontend-ts-errors.txt`） | Developer | 2026-06-07 DevOps v0.5.1 部署发现：公网前端仍是 5-31 旧版本，本次构建失败无法部署 | ✅ 已完成（2026-06-07）— 修复 commit `ebd9d1e` + Architect Review 留痕 `b02cbd4` + 删除 commit `a79acfb`；`npm run build` 通过 0 错误 |
| P2 | `ChannelPills.vue` 受保护路径删除 Review：与已删的 `ChannelFilter.vue` 同属孤儿（NewsPage 频道筛选已完全内联 `.cc-pill`），全仓零引用 | Developer | 2026-06-07 Architect Review 提醒（不阻塞本次 5 文件删除门禁） | ✅ 已完成（2026-06-07）— Owner 直接同意（零引用 + 项目 Owner 授权），跳过 Architect Review；申请文档撤回，单文件删除 |
| P1 | 完成 v0.5 PRD 规划：确认三条主线范围（X/Twitter 实时监听、信息源管理重构、评分体系方法论） | PM | 2026-06-01 PM v0.5 规划讨论阶段性收尾 | ✅ 已完成：三条主线已收编进 v0.5 PRD R1，标准迭代已启动 |
| P1 | 展开并确认「信息源管理重构」产品方案：信息源 Tab、频道空间/子频道树、绑定规则、删除预览、验收边界 | PM | 2026-06-01 PM v0.5 规划讨论阶段性收尾 | ✅ 已完成：Product Brief 已确认 |
| P2 | 确认并产出「评分体系方法论」文档范围：维度、评分锚点、综合分、状态草稿、LLM 输出结构、版本化；本轮不落地代码 | PM | 2026-06-01 PM v0.5 规划讨论阶段性收尾 | ✅ 已完成：Product Brief 已确认；不讨论评分后分流 |
| P2 | 领域标签管理：支持自定义增删改标签选项（当前为固定硬编码 AI/财经/开源/科技/其他），非 v0.5 范围 | PM | 2026-06-06 UI 方案讨论 — UI 侧提出标签管理需求 | ✅ 已评估（2026-06-09）— v0.6 不做完整领域标签管理后台；本期采用 L1 AI 标签结构（领域/实体/事件/内容类型/处理标签）承载展示 |
| P2 | 空间图标支持上传图片（当前仅支持 emoji 文本输入） | PM | 2026-06-07 v0.5 Owner 试用反馈 — 空间管理页图标编辑 | ✅ 已收编进 v0.6 PRD R1 — 支持图片上传、替换、移除，同时保留 emoji / 文本图标能力 |
| P2 | 信息源级别代理配置：每个 Source 可独立控制是否走代理抓取（当前为全局代理） | PM | 2026-06-07 v0.5 Owner 试用反馈 — 部分 RSS 源可能不需要代理 | ✅ 已评估（2026-06-09）— 不作为前端管理能力；如需 Source 级代理，作为后端内部抓取策略由设计阶段按需处理 |
| P1 | MCP 协议信息源完整支持：新建/编辑/删除 MCP 源的 UI、工具选择、配置管理（当前仅后台 API 临时创建） | PM | 2026-06-07 v0.5 Owner 试用反馈 — 金十数据 MCP 接入为临时后台方案 | 待 PM 评估，纳入后续迭代规划 |

## Bootstrap 记录
- 时间：2026-05-23（估计，基于早期 commit）
- 状态：已完成（v0.1 启动时）
- Git 状态：已初始化
- 下一步：—

## 角色日志

| 角色 | 日志 | 纠错记录 |
|------|------|----------|
| PM（产品经理） | [roles/pm-current.md](roles/pm-current.md) / [roles/pm-summary.md](roles/pm-summary.md) | [roles/pm-corrections.md](roles/pm-corrections.md) |
| UI（界面设计师） | [roles/ui.md](roles/ui.md) | — |
| Architect（架构师） | [roles/architect-current.md](roles/architect-current.md) / [roles/architect-summary.md](roles/architect-summary.md) | [roles/architect-corrections.md](roles/architect-corrections.md) |
| Developer（开发工程师） | [roles/developer-current.md](roles/developer-current.md) / [roles/developer-summary.md](roles/developer-summary.md) | [roles/developer-corrections.md](roles/developer-corrections.md) |
| DevOps（运维/部署工程师） | [roles/devops.md](roles/devops.md) | [roles/devops-corrections.md](roles/devops-corrections.md) |
| Tester（测试工程师） | [roles/tester-current.md](roles/tester-current.md) / [roles/tester-summary.md](roles/tester-summary.md) | — |
| WM（工作流管理者） | [roles/wm.md](roles/wm.md) | [roles/wm-corrections.md](roles/wm-corrections.md) |

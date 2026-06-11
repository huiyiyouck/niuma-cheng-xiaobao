## 2026-06-02 — v0.5 信息源管理重构 Product Brief 初稿确认

- 本次角色：产品架构师(PM)
- 动作：规划讨论 → Product Brief 初稿产出
- 涉及文档：
  - `docs/progress/ad-hoc/2026-06-02-product-brief-source-management-redesign.md`
  - `docs/progress/INDEX.md`
- 结论：Owner 已确认信息源管理重构完整产品方案，Product Brief 初稿已落档，待后续收编进 v0.5 PRD。
- 关键决策：
  - 固定两级结构：空间 → 频道；没有子频道。数据关系为两级树，页面使用两层 Tab 展示，不使用树形目录。
  - 信息源独立于空间和频道；一个 Source 可以投放到多个空间或频道。
  - 同一个 Source 全局只抓取或监听一次，再向启用中的展示位置分发；全部位置暂停或移除后自动停止。
  - 一个 X Source 对应一个账号；所有 X Source 共用一个 Filtered Stream 长连接。
  - 标签体系纳入 v0.5 的录入、编辑、展示、搜索和筛选；暂不影响抓取、LLM、评分或推送。
  - 待修复 Source 可以保存，但验证成功前不允许添加到空间或频道。
  - 来源异常 Source 允许修改来源身份，重新验证成功后恢复。
  - Source 详情展示运行状态、展示位置统计和具体空间/频道。
  - 删除 Source 时删除展示位置但保留历史新闻；删除空间或频道时保留历史新闻与位置快照。
  - 顶级导航增加告警入口；连续失败达到 3 次后标记来源异常；X Stream 全局异常单独告警。
  - 当前旧业务数据无保留价值：v0.5 实施时全部清空，不做迁移，不保留旧 API 兼容。
- 关联迭代：v0.5（规划中，尚未启动标准迭代）
- 遗留问题/风险：
  - 数据清理为不可逆操作，实施阶段必须由 Architect Review 表级范围，DevOps 执行前输出统计并由 Owner 确认。
  - `sub_channels` 是否统一重构为 `channels`，交由 Architect 在技术设计阶段评估。
- 下一步：PM 产出评分体系方法论草稿，再将 X/Twitter 实时监听、信息源管理重构和评分方法论三条主线收编为 v0.5 PRD。

## 2026-06-02 — v0.5 信息评分方法论 Product Brief 初稿确认

- 本次角色：产品架构师(PM)
- 动作：规划讨论 → Product Brief 初稿产出
- 涉及文档：
  - `docs/progress/ad-hoc/2026-06-02-product-brief-scoring-methodology.md`
  - `docs/progress/INDEX.md`
- 结论：Owner 已确认信息评分方法论范围，Product Brief 初稿已落档。v0.5 三条主线规划材料已齐备，尚未启动标准迭代。
- 关键决策：
  - 本轮只讨论如何评价单条信息，不讨论日报、推送、自动分流、状态流转、阈值或页面展示。
  - 评分目的：为每条信息建立结构化价值画像，为后续排序、筛选、回顾、校准和事件分析积累数据基础。
  - 五个候选维度：时效性、影响力、置信度、行动性、独特性；首版只启用前三个。
  - 每个首版维度使用 1-5 整数分，并由 LLM 输出一句简短理由。
  - 同一条信息只生成一份 LLM 维度分；空间和频道使用权重版本计算各自场景分。
  - 每个空间必须选择基础权重版本；频道默认继承空间，也允许覆盖。
  - 权重方案与权重版本分层；权重版本使用草稿、可用、已弃用、已归档四种状态。
  - 已弃用版本不允许新增使用，但已有空间和频道继续生效；使用位置归零后才能归档。
  - 评分记录不覆盖历史；场景分保存展示位置和权重版本；评分时保存 Source 上下文快照。
  - 评分方法版本与权重版本独立；启用维度、定义、锚点、提示词或输出结构变化时创建新评分方法版本。
  - Source 关注级别暂不参与计算，待真实数据支持后再评估。
- 关联迭代：v0.5（规划中，尚未启动标准迭代）
- 遗留问题/风险：
  - 置信度长期是否继续参与场景分，待真实数据校准。
  - 行动性、独特性、场景相关度和 Source 关注系数均暂缓落地。
  - 评分后分流、日报和推送模块尚未规划。
- 下一步：用户确认是否正式启动 v0.5；确认后由 PM 将三条主线收编为 `v0.5-prd.md`。

## 2026-06-02 — v0.5 标准迭代启动 + PRD R1 产出

- 本次角色：产品架构师(PM)
- 动作：标准迭代启动 + PRD 初版产出
- 涉及文档：
  - `docs/progress/iterations/v0.5.md`
  - `docs/progress/iterations/v0.5-prd.md`
  - `docs/progress/INDEX.md`
- 结论：Owner 明确要求开始 v0.5 迭代规划。PM 已创建 v0.5 标准迭代并提交 PRD R1。
- PRD 三条主线：
  1. 信息源资产化重构：空间 → 频道两级结构、信息源库、标签、多位置投放、共享抓取、状态统计、删除规则、告警入口和旧业务数据清空。
  2. X/Twitter 实时监听：一个 X Source 对应一个账号，全部账号共用一个 Filtered Stream 长连接，Source 级补偿抓取、自动同步、自动重连和全局异常告警。
  3. 评分方法论：交付可 Review 的方法论草稿，不实现评分代码，不讨论日报、推送或评分后分流。
- 动态 Review 计划：
  - UI：管理页、详情页、告警入口和状态表达。
  - Architect：数据模型、共享抓取、历史新闻保留、快照和清理边界。
  - Developer：前后端契约、Worker 和工程成本。
  - Tester：验收标准、异常路径和清空后从零开始。
  - DevOps：X API 环境依赖、单实例约束和不可逆数据清理。
- 关联迭代：v0.5
- 遗留问题/风险：
  - 生产数据清理不可逆，必须在设计和部署阶段严格执行 Review 与 Owner 确认。
  - X API 套餐、规则数和计费策略需由 DevOps 在上线前重新核验。
  - 评分方法论本轮只交付文档，不得静默扩展为代码落地。
- 下一步：切换到 UI、Architect、Developer、Tester、DevOps 角色分别 Review `docs/progress/iterations/v0.5-prd.md`。

## 2026-06-02 — PM 会话收尾：v0.5 PRD R1 待多角色 Review

- 本次角色：产品架构师(PM)
- 动作：收尾归档 + PM 日志分层
- 涉及文档：
  - `docs/progress/INDEX.md`
  - `docs/progress/roles/pm-current.md`
  - `docs/progress/roles/pm-summary.md`
  - `docs/progress/roles/pm-archive.md`
- 收尾结论：暂停待续。v0.5 已正式启动，停留在 PRD 阶段 R1 Review中，不推进下一阶段。
- 本次完成：
  - 信息源管理重构 Product Brief。
  - 事件时间线与影响链机会登记。
  - 信息评分方法论 Product Brief。
  - v0.5 标准迭代记录和 PRD R1。
  - PM 日志超过 300 行，按上下文治理规则完成分层归档。
- 验证证据：
  - 已执行 `git diff --check`，无 Markdown 空白错误。
  - 未运行代码测试：本次只修改规划和流程文档，没有修改代码。
- 遗留问题/风险：
  - PRD R1 等待 UI、Architect、Developer、Tester、DevOps 五个角色 Review。
  - 生产数据清理不可逆，后续必须保留 Architect Review、DevOps 表级统计和 Owner 确认门禁。
  - X API 套餐和计费策略需在上线前核验。
- 下一步：以 UI、Architect、Developer、Tester、DevOps 角色分别 Review `docs/progress/iterations/v0.5-prd.md`。

## 2026-06-09 — v0.5 迭代关闭检查 + Summary 归档 + 知识库沉淀

- 本次角色：产品架构师(PM)
- 动作：迭代关闭检查 + 归档摘要 + 统一 commit
- 涉及文档：
  - `docs/progress/iterations/v0.5.md`
  - `docs/progress/iterations/v0.5-summary.md`（新建）
  - `docs/progress/INDEX.md`
  - `docs/knowledge/engineering/external-portal-as-truth-source.md`（新建）
  - `docs/knowledge/INDEX.md`
  - `docs/progress/roles/pm-current.md`

- 关闭检查（按 mechanisms.md §3 的 8 项）：
  1. ✅ v0.5.md 各阶段状态一致（PRD R2 定稿 → UI R2 定稿 → 设计 R2 定稿 → 实现 R2 定稿 → 测试 R1 定稿 → 部署通过）
  2. ✅ 各阶段 Review 结论完整（PRD 5/5 / UI 2/2 / 设计 3/3 / 实现 3/3 / 测试 2/2 / 部署 DevOps 全栈 12 项 verify）
  3. ✅ 阻塞全清（前端 31 TS 错误 P0 解除、6 孤儿组件清理、X Stream 误告警修复 + 断流补偿）
  4. ✅ INDEX 已更新
  5. ✅ 角色日志无关键阻塞（Developer 最新日志明确"无遗留代码任务"）
  6. ✅ Change Note 不适用
  7. ✅ Summary 已创建；知识库已沉淀 1 条（外部 Portal 真理源反向同步模式）
  8. ✅ 后端废弃能力前端引用清零（5 + 1 孤儿组件已全部 git rm）

- 关闭结论：**✅ 可关闭（有条件关闭）**
  - 条件 A：v0.5.1 X 反向同步未走标准 R1/R2 流程——Owner 拍板的架构反转，后端 10 项 API 端到端验证全过，前端 Owner 浏览器验证通过；必要时代补 Tester 完整 AC 复审
  - 条件 B：Owner 试用 7 commits 视觉细化不升 Tester R2——Owner 逐条手动验证通过
  - 条件 C：评分方法论本迭代只交付文档，不落地代码

- 产出：
  - `v0.5-summary.md`（16 项关键决策 / Review 质量结论 / 遗留问题 / 知识库 (1条) / 4 项 v0.6+ 候选机会 / Git 节点）
  - `external-portal-as-truth-source.md`（反向同步模式知识沉淀到 engineering/）
  - `v0.5.md`：关闭结论和 summary 链接写入
  - `INDEX.md`：当前迭代 →「无」，模式 →「未选择」，v0.5 行 Summary 列补链接 + 状态更新；最近收尾摘要新增 PM 行
  - `knowledge/INDEX.md`：新增 external-portal-as-truth-source 索引

- 工作区清理：统一 commit 含 Developer 日志（视觉收口 44 行）+ INDEX Developer 状态推进 + 本次 PM 关闭检查全部产出

- 关联迭代：v0.5（已关闭）
- 遗留问题/风险：
  - 4 项 P1/P2 候选待办（MCP UI / 标签管理 / 空间图标 / 源代理）登记在 INDEX，待 PM 纳入 v0.6 规划评估
  - 重计算模块架构预研（时间线聚类 / 实体关联）作为 v0.6 启动输入材料
- 下一步：Owner 决定下一步（启动 v0.6 / 其他非迭代任务 / 暂停）

## 2026-06-09 — v0.6 需求讨论 + 标准迭代启动 + PRD R1

- 本次角色：产品架构师(PM)
- 动作：需求讨论收敛 → 创建标准迭代记录和 PRD R1
- 涉及文档：
  - `docs/progress/iterations/v0.6.md`（新建）
  - `docs/progress/iterations/v0.6-prd.md`（新建）
  - `docs/progress/INDEX.md`
  - `docs/progress/roles/pm-current.md`
- 结论：v0.6 正式启动，停留在 PRD 阶段 R1 Review中。
- 范围锁定：
  1. `/root/news-aggregation-platform` Figma 导出原型作为本期前端重构目标；不迁入 React，基于现有 Vue3 前端落地并接真实 API。
  2. X 信息 L0/L1 分层处理：所有原始信息先入库；L0 只过滤明显无效内容；通过 L0 的 X 信息进入 L1；L1 完成后进入新闻流展示。
  3. 空间图标上传：支持图片上传、替换、移除，同时保留 emoji / 文本图标能力。
- L1 关键决策：
  - 评论读取本期不做。
  - 每条 L1 都做库内相关新闻检索。
  - 有链接就尝试读取链接内容。
  - X 搜索 / Web 搜索按 `needs_context=true` 触发，不是每条都搜。
  - 抽屉展示四段内容：原文中文翻译、相关背景与补全、AI 分析与评价、AI 标签。
  - 四维评分：时效性 25%、影响力 35%、置信度 25%、可理解度 15%；AI 输出维度分和理由，系统计算综合分。
  - 标签类型：领域标签、实体标签、事件标签、内容类型、处理标签。
- 明确不做：
  - L2 事件追踪、时间线、深度搜索、深度分析、公众号/系列文章生成。
  - 独立全屏详情页。
  - 反馈按钮和反馈记录。
  - 前端展示分流策略或处理工作流配置。
  - Source 级代理前端配置。
- Review 计划：UI / Architect / Developer / Tester / DevOps 五方 R1 Review。
- 关联迭代：v0.6
- 遗留问题/风险：
  - 搜索服务、库内相关新闻检索算法、L0/L1 数据模型、图片存储方案需设计阶段确认。
  - LLM / 搜索 / 链接读取带来成本、超时和失败重试风险。
- 下一步：切换到 UI、Architect、Developer、Tester、DevOps 角色分别 Review `docs/progress/iterations/v0.6-prd.md`。

## 2026-06-09 — PM 会话收尾：v0.6 PRD R1 已提交 Review

- 本次角色：产品架构师(PM)
- 动作：收尾归档 + PM 日志分页沉淀
- 涉及文档：
  - `docs/progress/iterations/v0.6.md`
  - `docs/progress/iterations/v0.6-prd.md`
  - `docs/progress/INDEX.md`
  - `docs/progress/roles/pm-current.md`
  - `docs/progress/roles/pm-summary.md`
  - `docs/progress/roles/pm-archive.md`
- 收尾结论：暂停待续。v0.6 已正式启动，停留在 PRD 阶段 R1 Review中。
- 本次完成：
  - 完成 v0.6 需求讨论并创建标准迭代记录。
  - 创建 `v0.6-prd.md` R1，Review 方为 UI / Architect / Developer / Tester / DevOps。
  - 将 PM current 层超过阈值的旧记录移入 archive，并更新 summary 当前状态为 v0.6。
- 验证证据：
  - 已检查 `pm-current.md`：收尾前 396 行，超过 `context-policy.md` 300 行阈值；已触发分页沉淀。
  - 已执行 Markdown 空白检查，需在本次收尾后复跑确认。
  - 未运行代码测试：本次只修改规划、索引和角色日志文档。
- 遗留问题/风险：
  - v0.6 PRD R1 等待 UI、Architect、Developer、Tester、DevOps 五方 Review。
  - 搜索服务、库内相关新闻检索算法、L0/L1 数据模型、图片存储方案需设计阶段确认。
- 下一步：切换到 UI、Architect、Developer、Tester、DevOps 角色分别 Review `docs/progress/iterations/v0.6-prd.md`。

## 2026-06-10 — v0.6 PRD R2 汇总改稿

- 本次角色：产品架构师(PM)
- 动作：汇总五方 R1 Review + Owner 决策 → 修改 PRD R2
- 涉及文档：
  - `docs/progress/iterations/v0.6-prd.md`
  - `docs/progress/iterations/v0.6.md`
  - `docs/progress/INDEX.md`
  - `docs/progress/roles/pm-current.md`
  - `docs/progress/roles/pm-summary.md`
  - `docs/progress/roles/pm-archive.md`
- 结论：v0.6 PRD 已从 R1 Review 完成推进到 R2 Review中。
- R2 收敛事项：
  - 新闻详情形态：定为右侧抽屉，补充桌面/移动布局、顶部摘要区、四段式内容、评分区和标签区，供 Owner 重新生成 Figma 原型。
  - 路由结构：告警和日志本期合并为统一监控页，旧 `/admin/alerts` 和 `/admin/logs` 需兼容跳转。
  - L0/L1 状态机：补充 L0 `pending/processing/skipped/passed/failed` 与 L1 `not_started/queued/processing/retryable_failed/final_failed/completed`，明确合法转移和新闻流可见性。
  - 外部依赖：LLM 必需；库内检索每条 L1 必做；链接读取有链接就尝试；X/Web 搜索仅 `needs_context=true` 触发，失败降级。
  - Owner 决策：不设置成本上限或预算熔断；不做原始数据管理后台、归档/清理策略、保留周期配置或历史数据批处理。
  - 空间图标：禁止存入前端构建目录，建议后端持久目录；图片优先于 emoji/文本，移除图片后回退。
  - Mock 边界：开发/测试可用 fixture，生产构建不得引用 mock。
- 同步状态：
  - `v0.6.md` PRD 阶段新增 R2 行，五方待复审。
  - `INDEX.md` 当前阶段更新为 PRD R2 Review中，下一步入口为五方复审。
  - PM current 超过上下文阈值前主动归档最旧两条记录到 archive，并更新 summary。
- 遗留问题/风险：
  - R2 仍需 UI / Architect / Developer / Tester / DevOps 分别复审通过后才能定稿。
  - 原始数据治理能力已明确不做，后续信息源规模增长时需另起迭代评估。
- 下一步：切换到 UI、Architect、Developer、Tester、DevOps 角色复审 `docs/progress/iterations/v0.6-prd.md`。

## 2026-06-11 — v0.6 PRD R2 定稿裁定

- 本次角色：产品架构师(PM)
- 动作：核查五方 R2 复审结果 + PRD 定稿裁定 + 阶段推进
- 涉及文档：
  - `docs/progress/iterations/v0.6-prd.md`
  - `docs/progress/iterations/v0.6.md`
  - `docs/progress/INDEX.md`
  - `docs/progress/roles/pm-current.md`
  - `docs/progress/roles/pm-summary.md`
- 结论：v0.6 PRD R2 已定稿，迭代推进到 UI 方案阶段。
- 判断依据：
  - UI / Architect / Developer / Tester / DevOps 五方 R2 均为有条件通过。
  - R1 高严重度阻断项均已达到可接受门槛。
  - R2 剩余项主要是 UI 方案、接口契约、测试计划、部署手册和日志轮转等后续阶段细化事项，不需要继续拉长 PRD 轮次。
- PM 裁定：
  - 不进入 R3。
  - PRD R2 标记为已定稿。
  - 剩余条件按阶段承接：UI 方案承接信息源入口/统计口径/上传交互；设计阶段承接 API 契约、AI 调用策略、错误分类和告警阈值；测试阶段承接验收分层、样本集和 v0.5 回归基线恢复；DevOps 承接日志轮转和 handbook。
  - 修正 PRD R2 旧路由前缀：统一监控页目标 `/monitoring`，旧 `/alerts` 和 `/logs` 兼容跳转。
- 下一步：切换到 UI 角色，基于 `docs/progress/iterations/v0.6-prd.md` 产出 `docs/progress/iterations/v0.6-ui-spec.md`。

## 2026-06-11 — v0.6 UI 方案 R1 PM Review

- 本次角色：产品架构师(PM)
- 动作：Review UI 方案
- 涉及文档：
  - `docs/progress/iterations/v0.6-ui-spec.md`
  - `docs/progress/iterations/v0.6.md`
  - `docs/progress/INDEX.md`
  - `docs/progress/roles/pm-current.md`
  - `docs/progress/roles/pm-summary.md`
- 结论：⚠️ 有条件通过。UI 方案整体覆盖 PRD R2 核心范围，右侧抽屉、统一监控页、空间图标上传、L0/L1 状态可视化和 AC 映射均已成型；未发现高严重度阻断项。
- Review 意见：
  - #P1（中）：D8 全屏铺满可能重踩 v0.5 Owner 宽屏过散回调，需按页面给内容宽度策略或确认 Owner 新决策。**后续已由 Owner 确认关闭：v0.6 全部按 Owner 提供的 UI 原型为主，D8 全屏铺满成立。**
  - #P2（中）：监控角标口径需明确是否包含 L0/L1 自动告警。
  - #P3（低）：`28 条 AC` 表述已过期，应改为 PRD R2 AC / AC-01~AC-35。
  - #P4（低）：新增组件数量口径不一致。
  - #P5（低）：路径 C 应表述为添加展示位置，而非新增信息源。
- 状态同步：
  - `v0.6-ui-spec.md` PM Review 状态改为有条件通过，并追加 PM R1 Review 记录。
  - `v0.6.md` UI 方案 R1 Review 结果补充 PM 结论，Architect / Developer / Tester 仍待 Review。
  - `INDEX.md` 当前阶段更新为 PM 已 Review，下一步入口为 Architect / Developer / Tester Review。
- 下一步：Architect / Developer / Tester 分别 Review `docs/progress/iterations/v0.6-ui-spec.md`，随后 UI 汇总 R1。

### 追加：#P1 Owner 裁定关闭（2026-06-11）

- Owner 明确：「全部按照我给你的 UI 为主」。
- PM 解释：这是对 #P1 的直接裁定。v0.6 UI 方案 D8「顶导 + 主内容区全屏铺满，不设最大宽度限制」成立，不再要求 UI R2 补页面宽度策略。
- 剩余 PM Review 条件：#P2 / #P3 / #P4 / #P5。

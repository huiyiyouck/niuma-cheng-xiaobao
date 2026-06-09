## 2026-05-31 — v0.4 迭代关闭检查 + 归档摘要

- 本次角色：产品架构师(PM)
- 动作：迭代关闭检查 + 创建归档摘要 + 收尾归档
- 触发：用户问「今天是否可以做一下收尾工作了？」+ INDEX 明确「下一步入口：PM 或 WM 执行 v0.4 迭代关闭检查」
- 关闭检查（按 `mechanisms.md §3` 8 项）：
  1. ✅ v0.4.md 各阶段状态一致
  2. ✅ 各阶段 Review 结论完整
  3. ✅ 阻塞全清（#B1/#B2/#B3 修复；RSS 实机延后经用户决策）
  4. ✅ INDEX 已更新
  5. ✅ 角色日志无关键阻塞
  6. ✅ 无 Change Note
  7. ✅ Summary 已创建；Engineering 已沉淀 2 条
  8. ✅ 前端 WS 残留已在 Bugfix `e736980` 清零
- 关闭结论：**✅ 可关闭（有条件关闭）**
  - 条件 A：RSS Fetcher 实机抓取延后至后续迭代上线验证（用户决策）
  - 条件 B：commit `e736980` 7 项视觉 Bugfix 不升 R2（PM 决策，已落档）
- 产出：
  - `docs/progress/iterations/v0.4-summary.md`（新建，含 8 项关键决策 / Review 质量结论 / 遗留问题 / 知识库 / 后续机会 / Git 关键节点）
  - `v0.4.md`：头部「最终状态」改为「✅ 已完成（有条件关闭）」+ 末尾追加「迭代关闭检查」节
  - INDEX：当前迭代改为「无」+ v0.4 行 Summary 列补 link + 状态改为「✅ 已完成」+ 最近收尾摘要新增 PM 行
- 关联迭代：v0.4
- 遗留问题/风险：
  - RSS 实机抓取（已纳入后续迭代关注）
  - 数据库迁移机制规范化（Architect ADR-001 + DevOps Step 3 计划，跨任务 P2）
- 下一步：用户决定是否启动 v0.5（候选材料：X/Twitter Filtered Stream Product Brief + 技术规划）或其他工作；PM 当日收尾完成

## 2026-06-01 — 信息平台演进方向 Product Brief

- 本次角色：产品架构师(PM)
- 动作：产出
- 涉及文档：`docs/progress/ad-hoc/2026-06-01-product-brief-information-platform-evolution.md`
- 结论：与用户讨论产品衍化方向，达成以下方向级共识：
  - 产品定位：有价值的结构化信息平台，不是信息堆砌
  - 演进路线：自用打磨 → 订阅号推送+公众号引流 → 确认用户画像 → 商业化迭代
  - 频道空间：AI + 财经，两个独立空间，信息源（X + RSS）逐步积累
  - 信息评测体系：3 维度（时效/影响力/置信度）+ 2 预留（行动性/稀缺性），1-5 评分，等权综合分
  - 全自动化：代码分流 → LLM 处理 → 代码判状态，人工不参与
  - 状态体系：草稿（立即推送/日报收录/仅入库/待确认），后续讨论确认
  - v1.0 里程碑：自用跑通 + 可以开始对外推送
  - 阈值/权重：占位，待自用数据积累后校准
- 关联迭代：v0.5+ 候选输入材料
- 遗留问题/风险：财经空间信息源未确认；评分锚点待细化；阈值/权重待校准
- 下一步：用户决定下一步工作（启动 v0.5 / 其他）

## 2026-06-01 — v0.5 迭代规划讨论（阶段性收尾）

- 本次角色：产品架构师(PM)
- 动作：规划讨论（未创建 PRD）+ 收尾归档
- 涉及文档：
  - `docs/progress/ad-hoc/2026-05-30-product-brief-x-filtered-stream.md`
  - `docs/progress/ad-hoc/2026-05-30-tech-plan-x-filtered-stream.md`
  - `docs/progress/ad-hoc/2026-06-01-product-brief-information-platform-evolution.md`
  - `docs/progress/INDEX.md`
- 结论：用户明确 v0.5 计划包含三条主线：
  1. **X/Twitter 实时监听**：作为正式功能落地。
  2. **信息源管理 / 管理页重构**：PM 定义产品结构和业务规则；本次迭代开始由正式 UI（界面设计师）产出页面方案，PM 不再直接画 UI 或细化视觉方案。
  3. **评分体系方法论**：v0.5 只给出具体方法和细节方案，作为文档产出；不改代码、不做页面、不做推送落地。
- 已阶段性提出评分体系方案方向：
  - 评分对象是单条信息，不是 Source 或频道。
  - 当前 3 维度：时效性、影响力、置信度；预留行动性、稀缺性。
  - 采用 1-5 分、评分锚点、加权综合分、单维度突出、置信度保护、状态草稿、LLM 结构化输出和评分版本化。
  - 建议 v0.5 交付 `v0.5-scoring-method.md`，Review 方建议 Architect / Developer / Tester。
- 未完成：
  - 尚未正式确认 v0.5 范围方案。
  - 尚未展开并确认「信息源管理重构」产品方案。
  - 尚未创建 `v0.5-prd.md` 或 `v0.5.md`。
- 关联迭代：v0.5（规划中，未正式启动 PRD）
- 遗留问题/风险：v0.5 范围较大，需下次先确认是否拆分阶段；UI 职责边界已调整，后续 PRD 只定义信息架构和验收，不替 UI 出图。
- 下一步：PM 继续从「信息源管理重构方案」和「评分方法论文档范围确认」开始，完成 v0.5 PRD 规划。
- 追加记录：用户要求登记待办，已在 `docs/progress/INDEX.md` 跨任务待办中登记 3 项 PM 待办（v0.5 PRD 规划、信息源管理重构方案、评分体系方法论文档范围）。

## 2026-06-02 — v0.5 信息源管理重构讨论：事件时间线与影响链机会登记

- 本次角色：产品架构师(PM)
- 动作：规划讨论 + 机会池登记
- 涉及文档：
  - `docs/knowledge/opportunities/event-timeline-impact-chain-analysis.md`
  - `docs/knowledge/INDEX.md`
- 已确认的信息源管理规则：
  - 频道结构固定为两级：空间 → 频道；没有子频道。
  - 信息源是独立的外部来源，不属于频道结构。
  - 信息源获取的数据可以展示在空间根节点或频道节点下。
  - 一个信息源可以投放到多个位置；同一空间内也可以投放到多个频道。
  - 浏览空间时聚合空间根节点和所属频道新闻并自动去重；浏览频道时只展示该频道新闻。
  - 允许先将信息源录入信息源库，后续再设置展示位置。
  - 删除全局 Source 时，删除 Source 和全部投放规则，但保留历史新闻。
  - 标签体系纳入 v0.5 信息源管理；标签暂不影响抓取、入库、LLM、评分或推送链路。
- 新增机会：事件时间线与影响链分析。将源头新闻、后续发酵和跨空间/频道变化串联，帮助快速理解某个事件如何影响行业或模块，并为后续模式判断和学习提供结构化样本。
- 关联迭代：v0.5 规划讨论；机会本身归入 v0.6+ 候选方向
- 遗留问题/风险：事件聚类和影响关系需要区分相关性与因果性，不能在证据不足时自动声称因果链。
- 下一步：继续确认 v0.5 信息源管理重构剩余产品规则，再形成 Product Brief 初稿。

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

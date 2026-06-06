# 架构师工作日志

## 2026-06-06 — v0.5 实现 R2 复审 通过

**本次角色**：架构师
- 动作：Review（审 Developer 的 v0.5 实现 R2）
- 涉及文档：`server/src/api/routes/sources.ts`、`server/src/__tests__/`
- 结论：通过。R1 全部 2 条意见核验通过：#I1 lifecycleStatus bug 已修复、#I2 路径 B 测试已补充（alert 流转 5 条 + channel migrate 2 条 + identity 修改 2 条）
- 53/53 测试通过。实现与设计文档一致，架构边界保持良好。
- 关联迭代：v0.5

## 2026-06-06 — v0.5 实现 R1 Review

**本次角色**：架构师
- 动作：Review（审 v0.5 全栈实现 R1，base=c70a5c8 head=9b83263）
- 涉及文档：`server/src/db/schema.ts`、`server/src/api/routes/`、`server/src/worker/`、`server/src/__tests__/`
- 结论：需修改。共 2 条意见（1 中 + 1 低）。
  - #I1：sources.ts:152 `lifecycleStatus` 未定义，路径 B auto-add 阻塞
  - #I2：路径 B auto-add 无测试覆盖
- 设计符合度：Schema/API/Worker 与设计文档完全一致。X Stream Manager 完整、channel 迁移事务正确、processor fan-out 到位。
- 关联迭代：v0.5

## 2026-06-06 — v0.5 设计文档 已定稿

**本次角色**：架构师
- 动作：定稿（PM/Developer/DevOps 三方 R2 全部通过）
- 涉及文档：`docs/progress/iterations/v0.5-design.md`
- 12 条 R1 意见全部在 R2 中关闭，3/3 Review 通过。设计阶段完成。
- v0.5 当前进度：PRD ✅ → UI 方案 ✅ → 设计 ✅，下一步进入实现阶段
- 关联迭代：v0.5

## 2026-06-06 — v0.5 设计文档 R2 修订

**本次角色**：架构师
- 动作：修改（响应 PM 3 条 + Developer 5 条 + DevOps 4 条 R1 Review）
- 涉及文档：`docs/progress/iterations/v0.5-design.md`、`docs/progress/iterations/v0.5.md`
- 修订覆盖（12 条全部关闭）：
  - 数据模型：#D1 部分唯一索引（阻断）
  - API 合约：DELETE channels action 参数、GET positions channel_id 语义、DELETE→PATCH positions、operational_status CTE、PUT identity 补偿
  - 核心流程：§4.6 频道删除迁移逻辑（新增）、§4.2 失败计数对齐 PRD、§4.3 Stream/systemd 区分
  - 迁移：§6.2 清理脚本改旧表名、§6.3 环境变量汇总（新增）
- 下一步：PM、Developer、DevOps 复审 R2

## 2026-06-06 — v0.5 设计文档 R1 产出

**本次角色**：架构师
- 动作：产出（基于定稿 PRD + UI 方案，创建 v0.5 技术设计文档）
- 涉及文档：`docs/progress/iterations/v0.5-design.md`（新建）、`docs/progress/iterations/v0.5.md`
- 产出覆盖：
  - 数据模型：10 表变更 + 3 新表。sub_channels→channels 重命名、sources 大幅扩展（双维度状态 + 10+ 新字段）、display_positions 替代 channel_sources、news_positions m:n 关联、alerts scope 解耦、source_identity_history
  - 5 项设计决策：operational_status 动态计算、软删除快照、dedup_key 告警去重、debounced 规则同步、事务包裹 DELETE 清理
  - API 合约：6 组 20+ 端点重写，3 个关键响应 Shape
  - 核心流程：Worker per-source 调度、X Stream Manager、告警生命周期、自动启停
  - 数据清理脚本：FK 依赖顺序 + 事务回滚 + pg_dump 前置
- Review 方：PM、Developer、DevOps
- 关联迭代：v0.5

## 2026-06-06 — v0.5 UI 方案 R2 Review

**本次角色**：架构师
- 动作：Review（审 UI 的 v0.5 UI 方案 R2）
- 涉及文档：`docs/progress/iterations/v0.5-ui-spec.md`、`docs/progress/iterations/v0.5.md`
- 结论：通过。R1 全部 5 条意见核验通过：#A1 API 契约已补充（§10，6 组 20+ endpoint）、#A2 身份编辑约束已定义、#A3 约束归属已标注、#A4 mini 模式已定义、#A5 由 API 契约覆盖。
- R2 全部 8 条意见（Architect 4 + Developer 4）正确关闭。UI 方案达到设计阶段准入标准。
- 关联迭代：v0.5

## 2026-06-06 — v0.5 UI 方案 R1 Review

**本次角色**：架构师
- 动作：Review（审 UI 产出的 v0.5 UI 方案 R1）
- 涉及文档：`docs/progress/iterations/v0.5-ui-spec.md`、`docs/progress/iterations/v0.5.md`
- 结论：需修改。共 5 条意见（1 高 + 2 中 + 2 低）。
  - 高：#A1 缺少 API 契约清单，设计阶段无法接续
  - 中：#A2 Source 身份修改 UI 未体现 PRD 状态约束、#A3 删除最后空间约束 PRD 未定义
  - 低：#A4 浏览页 mini Pill 交互未展开、#A5 SourceCard 抓取条数数据来源不明
- PRD 覆盖：9 个功能章节全部核验通过。路由设计合理。
- 关联迭代：v0.5
- 遗留问题/风险：等待 UI 汇总 Architect/Developer R1 反馈后提交 R2。

## 2026-06-06 — v0.5 PRD R2 Review

**本次角色**：架构师
- 动作：Review（审 PM 的 v0.5 PRD R2）
- 涉及文档：`docs/progress/iterations/v0.5-prd.md`、`docs/progress/iterations/v0.5.md`
- 结论：通过。R1 全部 9 条意见核验通过：
  - 3 项高：状态模型双维度拆分 ✅、UNIQUE 约束调整列 §7 ✅、m:n 关联表列 §7 ✅
  - 4 项中：source_states/fetch_policy 迁移列 §7 ✅、alerts 解耦列 §7 ✅、identity_history 纳入范围+列 §7 ✅、快照内容已定义 ✅
  - 2 项低：sub_channels 重命名列 §7 ✅、fetch_policy 迁移列 §7 ✅
- R2 新增内容（pg_dump 备份、事务回滚、57 条 AC、并发风险登记）无架构风险。
- PRD 达到设计阶段准入标准。下一步：等待 PM 在 UI 方案阶段前委托 UI 产出方案，或等待 Developer/Tester/DevOps 完成 R2 Review 后 PRD 正式定稿。
- 关联迭代：v0.5

## 2026-06-06 — v0.5 PRD R1 Review

**本次角色**：架构师
- 动作：Review（审 PM 的 v0.5 PRD R1）
- 涉及文档：`docs/progress/iterations/v0.5-prd.md`、`docs/progress/iterations/v0.5.md`
- 结论：需修改。共 9 条意见（3 高 + 4 中 + 2 低）。
  - 高严重度：#A1 Source 状态模型拆分（与 UI/Developer/Tester 同源）、#A2 展示位置 UNIQUE 约束冲突、#A3 新闻 m:n 关联表缺失
  - 中严重度：#A4 source_states 移至 Source 级、#A5 alerts 空间解耦、#A6 source_identity_history 缺失、#A7 历史位置快照未建模
  - 低严重度：#A8 sub_channels → channels 重命名、#A9 fetch_policy 移至 Source 级
- 整体评价：三条主线方向正确，但当前 schema 与 PRD 描述的产品行为存在 3 项结构性冲突（状态模型、唯一约束、m:n 关联），设计阶段开始前必须修正。
- 关联迭代：v0.5
- 遗留问题/风险：等待 PM 汇总全部 5 方 R1 Review 后提交 R2。

## 2026-05-31 — 会话收尾（架构师整日 3 次出场汇总）

**本次角色**：架构师
- 动作：收尾（会话结束，今日架构师工作汇总）
- 涉及文档：docs/progress/roles/architect.md、architect-corrections.md
- 今日产出汇总（3 次出场 + 3 个 commit）：

| 时序 | 出场 | commit | 产出 |
|------|------|--------|------|
| 1 | DevOps 数据库迁移机制提案 Review R1 + ADR-001 落档 | `f512dee` | 5 项决策（工具流/路径/baseline/down.sql/migrate 位置）+ 4 项配套（A1-A4） + ADR-001 新建（项目首条） |
| 2 | #B2 评估（两步查询拆 FOR UPDATE） | `6a8c3e5` | 五维对比 → 保留 `FOR UPDATE OF cs` 不改 |
| 3 | Step 2 Architect Review R2 | `ec10001` | 4 项 Developer 微调全部接受 + ADR-001 追加实操修订附注 |

- 整条 P2「数据库迁移机制规范化」的架构师动作全部关闭；最终由 DevOps Step 3 全线落地（commit `f5d3c9a`），整条待办从 INDEX 移除
- 关联事件：v0.4 #B1 教训完整消化 — 从事故 → 选型 → 落地 → 验证 → 操作手册，闭环
- 新增基线产出：`docs/baseline/architecture.md`（项目 ADR 文档，首条 ADR-001 已采纳）
- 纠错记录：追加「会话进行中未主动重读 INDEX」一条，与 PM 同期纠错同类
- 遗留问题/风险：
  - **架构师名下无未完成事项**
  - 可选小清理 `db/schema.sql` 归档归 Developer 下次顺手做（已挂建议，非阻塞）
  - 候选 v0.5 X/Twitter Filtered Stream 材料未走正式 Review，**等待用户启动 v0.5 时由 PM 和架构师接管**

## 2026-05-31 — Step 2 Architect Review R2 ✅ 通过 + ADR-001 实操修订附注

**本次角色**：架构师
- 动作：Review（Developer Step 2 实施复审）+ ADR-001 附注更新
- 涉及文档：
  - `docs/baseline/architecture.md`（ADR-001 追加「实操修订附注（2026-05-31）」+ 索引表状态更新）
  - `docs/progress/ad-hoc/2026-05-31-devops-proposal-db-migration-mechanism.md`（追加 Architect Review R2 记录）
  - `docs/progress/INDEX.md`（跨任务待办 P2 状态更新）
- 触发：Developer 在 §Step 2 末尾留 2 项待 Architect 确认 + 1 项小清理待我决定
- 4 项微调评估结论：
  - **#1 drizzle-kit 0.30.6 → 0.31.10**：✅ 接受。工具链兼容性强制要求，新增约束「drizzle-kit 与 drizzle-orm 必须保持版本约束」进 Step 3 操作手册
  - **#2 baseline 改用 generate 替代 introspect（决策 3 微调）**：✅ 接受。决策 3 本意是"baseline 与生产对齐"，introspect 是手段不是目标；现场核验已确认 schema.ts ≡ 生产 schema 故两条路径等价
  - **#3 baseline 吸收 v0.4 无独立 0001（A3 微调）**：✅ 接受。A3 的真实担忧是「复制粘贴造成双真源残留」，Developer 当前做法根本不存在该动作。"v0.3 baseline"在历史上从未存在过，强拆是形式没价值。**约定：v0.5 起按 db:generate 产 0001/0002……增量；baseline 永不再 regenerate**
  - **#4 根目录 db/schema.sql 保留**：🟡 建议 Developer 下次经过时 `git mv` 到 `_legacy/`，**优先级低，不阻塞 Step 3**
- ADR-001 处理：正文不动（冻结历史规则），追加「实操修订附注」 + 索引表状态改为「已采纳（含 2026-05-31 实操修订附注）」
- baseline 核验：9 表 + 14 外键 + 10 索引 + 1 COMMENT 齐备，质量高
- 关联事件：v0.4 #B1 教训消化 + DevOps 提案 P2 Step 2 闭环
- 遗留问题/风险：
  - **Step 3 → DevOps**（不归我）：A2 移依赖 + systemd unit 改造 + baseline 首次部署 `__drizzle_migrations` 注入 + 操作手册（含 drizzle-kit/orm 版本约束章节）
  - 可选小清理 `db/schema.sql` 归档，等 Developer 下次经过

## 2026-05-31 — #B2 评估（两步查询拆 FOR UPDATE 替代方案）

**本次角色**：架构师
- 动作：评估（v0.4 测试报告 #B2「FOR UPDATE + LEFT JOIN 冲突」修复方案的替代选项评估）
- 涉及文档：
  - `docs/progress/INDEX.md`（跨任务待办行追加 #B2 评估结论）
- 评估范围：`server/src/api/routes/sources.ts:155-194`（DELETE 路由），项目内 `FOR UPDATE` 仅此一处 + worker dispatcher（无 LEFT JOIN 不相关）
- 结论：✅ **保留当前实现**（方案 X：`FOR UPDATE OF cs`），不采纳测试报告建议的方案 Y（两步查询）
- 五维对比：
  - 正确性：X/Y 等价
  - TOCTOU 防护：X/Y 等价（Y Step 1 锁定 + Step 2 同事务读）
  - SQL 清晰度：Y 略胜（自明），X 需注释（PG 方言）
  - 网络往返：X 1 次 / Y 2 次
  - 可移植性：Y 略胜，但 **ADR-001 已锁定 PG + Drizzle 栈，此论点失效**
- 决策理由：
  - 当前实现已通过 Developer R1 + Architect 实现 R2 + Tester T6.3 三道审核，**无 bug**
  - 方案 Y 仅是改写法，无实质优势
  - "SQL 方言不熟"是注释能解决的问题，不值得重写整段
- 附带建议（非必须，归 Developer 决定是否做）：把 `sources.ts:161` 注释从「FOR UPDATE 锁定 channel_sources 行」加强成说明 `OF cs` 的含义（避开 LEFT JOIN 可空侧、即 #B2 根因），方便后来者一眼看懂
- 安全边界：不直接改 Developer 名下的代码，建议写进评估结论由 Developer 决定
- 关联事件：v0.4 测试报告 #B2 + INDEX P2 跨任务待办的 #B2 子项
- 遗留问题/风险：无。INDEX P2 待办的 #B2 子项至此关闭；剩余动作（Step 2 Developer + Step 3 DevOps）不归我

## 2026-05-31 — Review DevOps 数据库迁移机制提案 + ADR-001 落档

**本次角色**：架构师
- 动作：Review（指定 Review 方：审 DevOps 数据库迁移机制规范化提案）+ 首条 ADR 产出
- 涉及文档：
  - `docs/progress/ad-hoc/2026-05-31-devops-proposal-db-migration-mechanism.md`（追加 Architect Review 记录区）
  - `docs/baseline/architecture.md`（**新建**，项目首条 ADR）
  - `docs/progress/INDEX.md`（非迭代工作行 + 跨任务待办行状态更新）
- 结论：✅通过。DevOps 调研充分，5 项待决策事实层已收敛，逐条拍板：
  - **决策 1（工具流）**：方案 A `drizzle-kit generate + journal`（拒 B push 无幂等不能上部署链；拒 C 手写 SQL 双真源是 #B1 根因）
  - **决策 2（迁移路径）**：`server/drizzle/`（与 drizzle.config.ts 默认 out 对齐）
  - **决策 3（v0.3 baseline）**：introspect + 双向对账。**现场核验已确认生产 9 表逐列对齐 schema.ts**，baseline 风险归零
  - **决策 4（down.sql）**：分类强制（破坏性改动 + 数据迁移必配，ADD COLUMN/INDEX 不强制）
  - **决策 5（migrate 位置）**：仅部署机 systemd `ExecStartPre`
- 配套补充意见（DevOps 未覆盖，本次追加）：
  - A1：package.json 加 `db:generate` + `db:migrate`，`db:push` 仅本地开发
  - A2（**Step 3 硬前置**）：drizzle-kit 从 devDependencies 移到 dependencies，否则生产 `npm install --production` 缺失会让 ExecStartPre 直接失败
  - A3：Step 2 生成 0001 用 generate 自动产出后再与 v0.4.sql 比对，不能复制粘贴
  - A4：操作手册位置定为 `docs/knowledge/devops/db-migration-handbook.md`
  - systemd 防护：unit 加 `StartLimitInterval=60` + `StartLimitBurst=3`
- 关联事件：v0.4 测试报告 #B1「alerts.status 列缺失」根因消化
- 遗留问题/风险：
  - **#B2**（两步查询拆 FOR UPDATE）归我评估但是独立查询层议题，本次不处理，后续另开会话看 `sources.ts:162` 现状
  - Step 2 Developer 接手时仍需对账 introspect 与 schema.ts，以 schema.ts 为准
  - 团队遗忘 `db:generate` 一步的风险靠开发文化 + code review 兜底，未来上 CI 可加 `drizzle-kit check`

## 2026-05-30 — v0.4 收尾

**本次角色**：架构师
- 动作：收尾（会话结束，今日工作归档）
- 涉及文档：docs/progress/INDEX.md、docs/progress/iterations/v0.4.md
- 今日产出汇总：
  - PRD Review × 2（R1 8条 + R2 ✅通过）
  - UI 规范 Review × 2（R1 3条 + R2 ✅通过）
  - 技术设计产出 + 修订（7端点 + RSS Fetcher + 状态机 + 前端架构，R2 4条修正）
  - 实现 Review × 2（R1 16项逐条验证 + R2 ✅通过）
  - 总计产出/Review 8 次，发现并关闭意见 15+ 条
- v0.4 状态：PRD ✅ / UI ✅ / 设计 ✅ / 实现 ✅ — 四阶段全部定稿，已部署
- 遗留问题/风险：无

## 2026-05-30 — v0.4 实现 R2 复审

**本次角色**：架构师
- 动作：Review（审全栈开发的 v0.4 实现 R2 修复）
- 涉及文档：docs/progress/iterations/v0.4.md
- 结论：✅通过。R1 3 条意见全部正确修复：#1 AlertList.vue → requestJson、#2 sources.ts → FOR UPDATE 事务、#3 ToastContainer → transition-group。16 项设计符合度全部通过。
- 关联迭代：v0.4
- 遗留问题/风险：无。实现阶段已定稿

## 2026-05-30 — v0.4 实现 R1 Review

**本次角色**：架构师
- 动作：Review（审全栈开发的 v0.4 后端+前端实现）
- 涉及文档：docs/progress/iterations/v0.4-design.md、docs/progress/iterations/v0.4.md
- 结论：❌需修改。设计符合度 16 项逐条验证，15 项通过 + 1 项偏差（Source 删除缺 FOR UPDATE）。确认 PM 全部 3 条意见。
  - #1 🔴阻断：AlertList.vue:28 原生 fetch() → 丢失 admin token
  - #2 🟠中等：sources.ts:162 SELECT 缺 FOR UPDATE + 事务
  - #3 🔵建议：Toast 退出动画未实现
- 整体评价：实现质量高，设计符合度 94%（15/16），架构边界保持良好。修正 #1 #2 后可通过。
- 关联迭代：v0.4
- 遗留问题/风险：等待开发 R2 修复

## 2026-05-30 — v0.4 设计阶段完成

**本次角色**：架构师
- 动作：收尾（设计阶段全部定稿）
- 涉及文档：docs/progress/iterations/v0.4-design.md、docs/progress/iterations/v0.4.md、docs/progress/INDEX.md
- 结论：✅ v0.4 设计阶段已全部完成。三个阶段全部定稿：
  - PRD：R1→R2，架构师 8 条 + 全栈开发 11 条，全部关闭
  - UI 规范：R1→R2，架构师 3 条 + 全栈开发 5 条，全部关闭
  - 技术设计：R1→R2，全栈开发 4 条 + PM 通过，全部关闭
- 关联迭代：v0.4
- 遗留问题/风险：无。架构师工作已全部完成，等待 Developer 启动实现阶段

## 2026-05-30 — v0.4 设计文档 R2 修订

**本次角色**：架构师
- 动作：修改（响应全栈开发 R1 Review 4 条意见）
- 涉及文档：docs/progress/iterations/v0.4-design.md、docs/progress/iterations/v0.4.md
- 结论：✅R2 已修订。接受全栈开发全部 4 条意见（2中等+2轻微），全部在正文中修正：
  - #D1 路由：静态 import → 动态 `() => import()`（§5.1）
  - #D2 HTTP：`createApiClient`+interceptor → `requestJson()` 函数内追加 token（§5.4）
  - #D3 搜索 SQL：`$3::uuid[]` + `ANY()` 多子频道支持（§4.5）
  - #D4 delete-preview：补充 source_states JOIN 完整 SQL（§3.3.2）
- 关联迭代：v0.4
- 遗留问题/风险：等待 PM 和全栈开发 R2 Review

## 2026-05-30 — v0.4 设计文档产出

**本次角色**：架构师
- 动作：产出（基于定稿 PRD + UI 规范 + 现有代码基线，编写 v0.4 技术设计文档）
- 涉及文档：docs/progress/iterations/v0.4-design.md、docs/progress/iterations/v0.4.md
- 产出覆盖：
  - 数据库变更：alerts.status 列
  - API 设计：7 个新端点（PUT channel-spaces/:id、GET delete-preview、DELETE channel-spaces/:id、DELETE channel-sources/:id、PUT sub-channels/reorder、PATCH alerts/:id、POST alerts/acknowledge-all）+ 3 个增强（搜索参数、Source 删除绑定检查、Admin Guard 扩展）
  - 核心流程：RSS Fetcher（rss-parser + 游标复用 source_states.cursor）、告警状态机、频道删除/解绑/搜索/日志路径修复
  - 前端架构：路由变更（/news/admin/logs）、组件树（1保7改2重5新5废1迁）、Toast/Modal 模块级单例设计、HTTP 客户端 token 注入、CSS 变量渐进迁移、3 个新依赖
  - 设计决策：RSS 解析库 rss-parser、Toast/Modal 方案 B、搜索 ILIKE、ADMIN_PROTECT_READS 默认 false
- 关联迭代：v0.4
- 遗留问题/风险：等待 PM 和全栈开发 Review

## 2026-05-30 — v0.4 UI 规范 R2 Review

**本次角色**：架构师
- 动作：Review（审 PM 的 v0.4 UI 规范 R2 修订版）
- 涉及文档：docs/progress/iterations/v0.4-ui-spec.md、docs/progress/iterations/v0.4.md
- 结论：✅通过。R1 全部 3 条意见在 R2 正文中正确关闭。R2 新增内容（§3.7 告警状态管理、§8.1 CSS 迁移策略、§11 组件迁移表）架构合理，无新增风险。UI 规范已达到设计阶段准入标准。
- 关联迭代：v0.4
- 遗留问题/风险：无。等待全栈开发 R2 Review 完成后 UI 规范定稿，进入技术设计阶段

## 2026-05-30 — v0.4 UI 规范 R1 Review

**本次角色**：架构师
- 动作：Review（审 PM 的 v0.4 UI 规范文档）
- 涉及文档：docs/progress/iterations/v0.4-ui-spec.md、docs/progress/iterations/v0.4.md
- 结论：❌需修改。共 3 条意见：
  - 1 项阻断：#1 告警状态管理 UI 缺失——PRD 3.2.5 定义了 active/acknowledged/resolved 三状态 + PATCH/POST 端点，但 UI 规范仅覆盖了静态告警内联条，缺少状态标签样式、单条操作按钮、批量标记按钮、AlertList.vue 改造方案
  - 2 项建议：#2 CSS 变量已在 §8 定义但正文未引用，#3 WebSocket 状态指示器可标注来源
- 整体评价：PRD 覆盖良好，所有组件均有状态覆盖，组件接口清晰。仅告警管理 UI 缺失为 PRD 覆盖缺口，其余不阻塞。
- 关联迭代：v0.4
- 遗留问题/风险：等待 PM 在 R2 补充告警管理 UI 规范

## 2026-05-30 — v0.4 设计阶段启动检查

**本次角色**：架构师
- 动作：设计阶段启动检查
- 涉及文档：docs/progress/INDEX.md、docs/progress/iterations/v0.4-prd.md、docs/progress/iterations/v0.4.md
- 结论：⏸️ 暂缓。PRD 已定稿 ✅，但 UI 阶段状态为"待产出"（既无定稿也无跳过标记），不能直接进入技术设计。
  - v0.4 PRD 已包含原型 HTML + 设计语言规范，但缺少独立的 UI 规范文档
  - 参考 v0.2 流程：PM → UI 规范文档 → 架构师+开发 Review → 设计阶段
  - 用户确认需要独立 UI 规范文档，不跳过
- 关联迭代：v0.4
- 遗留问题/风险：等待 PM 产出 `docs/progress/iterations/v0.4-ui-spec.md`，UI 规范定稿后架构师继续技术设计

## 2026-05-30 — v0.4 PRD R2 Review

**本次角色**：架构师
- 动作：Review（审 PM 的 v0.4 PRD R2 修订版）
- 涉及文档：docs/progress/iterations/v0.4-prd.md、docs/progress/iterations/v0.4.md
- 结论：✅通过。R1 全部 8 条意见在 R2 正文中正确关闭。R2 新增内容（3 个依赖、2 个端点、告警状态机、Toast/Modal 注入方式）无架构风险。PRD 已达到设计阶段准入标准。
- 关联迭代：v0.4
- 遗留问题/风险：无。等待全栈开发 R2 Review 完成后 PRD 定稿

## 2026-05-30 — v0.4 PRD R1 Review

**本次角色**：架构师
- 动作：Review（审 PM 的 v0.4 PRD 初版）
- 涉及文档：docs/progress/iterations/v0.4-prd.md、docs/progress/iterations/v0.4.md
- 结论：❌需修改。共 8 条意见：
  - 2 项阻断：#1 RSS Fetcher 接口契约不完整（type 标识值未定、validate 验证策略未明确）、#2 频道空间 DELETE 级联遗漏 alerts 表
  - 4 项中等：#3 ILIKE 搜索性能边界需明确、#4 前端 token 存储安全性（localStorage XSS 风险）、#5 ADMIN_PROTECT_READS 作用域未定义、#6 Source 删除前绑定检查 TOCTOU 窗口
  - 2 项建议：#7 日志路径修复措辞修正、#8 子频道排序字段已验证存在（sort_order）
- 整体评价：PRD 架构一致性较好，RSS 注册方式/API 命名/DB 变更最小化/游标设计均与现有架构一致。技术可行性无阻塞，阻断项属文档完整性范畴。
- 关联迭代：v0.4
- 遗留问题/风险：等待 PM 在 R2 中回应阻断项后进入设计阶段

## 2026-05-27 — v0.3 实现 R2 Review

**本次角色**：架构师
- 动作：Review（审全栈开发的 R2 修复）
- 涉及文档：docs/progress/iterations/v0.3.md
- 结论：✅通过。R1 全部 5 项均已正确修复——注册表全链路接入（fetchAndIngest+processOne+verifyFetch 三处均用 find()）、Worker 模块拆为 5 个独立文件、2 个索引已补、SSRF 防护已加、Zod 校验生效。Worker 可扩展架构目标已兑现。
- 关联迭代：v0.3
- 遗留问题/风险：无

## 2026-05-27 — v0.3 实现 R1 Review
- 本次角色：架构师
- 动作：Review（审全栈开发的 v0.3 Node.js 迁移实现）
- 涉及文档：docs/progress/iterations/v0.3.md
- 结论：❌需修改。3 项需修：①Fetcher 注册表写了但 dispatcher 没调（架构阻断，新增数据源仍需改 3 处 hardcode）②Worker 模块未按评估方案拆分为独立文件 ③Drizzle schema 缺两个索引。2 项建议：source-detector 加 URL scheme 白名单防 SSRF、news.ts 排序参数用 Zod 校验。API 层翻译质量高，路由/Schema/中间件与 Python 一致。
- 关联迭代：v0.3
- 遗留问题/风险：等待开发 R2 修复

## 2026-05-27 — v0.3 技术预研评估 已定稿
- 本次角色：架构师
- 动作：产出 + 定稿（PM Review ✅通过 R1）
- 涉及文档：docs/progress/iterations/v0.3-tech-eval.md
- 结论：v0.3 后端 Python→Node.js 迁移技术上可行。推荐 Fastify + Zod + Drizzle + 同进程 Worker，Fetcher 插件化接口 + 注册表 + Dispatcher 分发，新增数据源写一个文件即可。砍掉 WebSocket（~117行无用户价值链路）。PM 建议在详细设计阶段产出 API 契约验证清单（边界case对照），接受，纳入后续设计。
- 关联迭代：v0.3（预研阶段）
- 遗留问题/风险：无

## 2026-05-24 — v0.2 实现 R4 Review
- 本次角色：架构师
- 动作：Review（审全栈开发的 R3 修复——verified 状态绑定按钮）
- 涉及文档：docs/progress/iterations/v0.2.md
- 结论：✅通过。R3 #1 已正确修复——verified 行"验证"→"绑定" + emit('bind') → BindSourceModal 预填。组件通信模式合理，向后兼容，verified→active 链路完整。v0.2 实现阶段全部完成。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 实现 R3 Review
- 本次角色：架构师
- 动作：Review（审全栈开发的 v0.2 实现 R3——对齐定稿 UI 规范与设计文档）
- 涉及文档：docs/progress/iterations/v0.2.md
- 结论：❌需修改。1 项与 PM 一致（#1 verified 状态缺少"绑定"按钮）。其余 23 项 UI 规范对照全部通过，后端 API 变更（detect-type 路由位置、多选 OR 解析、sub_channel_id 类型兼容）架构合理。
- 关联迭代：v0.2
- 遗留问题/风险：等待开发修复 #1 后进入 R4

## 2026-05-24 — v0.2 设计文档 R3 定稿
- 本次角色：架构师
- 动作：收尾（PM + 全栈开发 R3 Review 双通过）
- 涉及文档：docs/progress/iterations/v0.2-design.md、docs/progress/iterations/v0.2.md
- 结论：R3 修订（纳入已定稿 UI 规范到头部元数据）获 PM 和全栈开发双通过。v0.2 设计阶段全部完成，设计文档最终定稿。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 设计文档 R3 修订（纳入已定稿 UI 规范）
- 本次角色：架构师
- 动作：修改（将已定稿 v0.2-ui-spec.md 正式纳入设计文档头部元数据）
- 涉及文档：docs/progress/iterations/v0.2-design.md、docs/progress/iterations/v0.2.md
- 结论：R3 修订完成，进入 Review。变更：头部新增"关联 UI 规范"字段指向已定稿 UI 规范文档；PM/Dev Review 状态重置为 ⏳待审。7.3 节已有 UI 规范引用，本次仅补头部元数据。
- 关联迭代：v0.2
- 遗留问题/风险：等待 PM 和全栈开发 R3 Review
- 本次角色：架构师
- 动作：Review（审 PM 的 v0.2-ui-spec.md R2 修订）
- 涉及文档：docs/progress/iterations/v0.2-ui-spec.md（Review 追加于此文件末尾）
- 结论：✅通过。R1 全部 9 项意见（全栈开发 3 项需修改 + 6 项建议改进 + 架构师 A1-A4 确认）均在 R2 正文中正确关闭。UI 规范文档已达到实现阶段参考标准。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 设计 R3 UI 规范 Review（已修正目录位置）
- 本次角色：架构师
- 动作：Review（审 PM 产出的前端 UI 规范文档 v0.2-ui-spec.md + HTML mockup）
- 涉及文档：docs/progress/iterations/v0.2-ui-spec.md（Review 追加于此文件末尾）、docs/progress/iterations/v0.2.md
- 结论：❌需修改（R1）。PRD 覆盖和设计一致性通过，但全栈开发 #1-#3 从架构角度确认需修正。Review 初版误写入 v0.2.md，已迁移到 v0.2-ui-spec.md 末尾（产出文档 Review 应追加到产出文档本身）。
- 关联迭代：v0.2
- 遗留问题/风险：无。等待 PM 汇总 R1 意见后产出 R2。

## 2026-05-24 — v0.2 实现 R2 Review
- 本次角色：架构师
- 动作：Review（审全栈开发的 v0.2 实现 R2 修订）
- 涉及文档：docs/progress/iterations/v0.2.md
- 结论：✅通过。R1 两项意见均已正确修复——Request 导入已追加、_source_out_legacy 已删除。实现阶段完成。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 实现 R1 Review
- 本次角色：架构师
- 动作：Review（审全栈开发的 v0.2 实现 R1）
- 涉及文档：docs/progress/iterations/v0.2.md
- 结论：❌需修改。1 项阻断（与 PM 一致——app/main.py 缺少 Request 导入导致 NameError）+ 1 项轻微（_source_out_legacy 中 d["name"] 赋值被 Pydantic v2 静默丢弃，属死代码）。设计-实现一致性检查 25 项全部通过。
- 关联迭代：v0.2
- 遗留问题/风险：等待开发修复阻断项后进入 R2

## 2026-05-24 — v0.2 设计文档 R2 定稿
- 本次角色：架构师
- 动作：收尾（PM + 全栈开发 R2 Review 双通过）
- 涉及文档：docs/progress/iterations/v0.2-design.md、docs/progress/iterations/v0.2.md
- 结论：v0.2 设计阶段完成，文档已定稿。R2 修订（9项）获 PM 和全栈开发双通过，可进入实现阶段。
- 关联迭代：v0.2
- 遗留问题/风险：无

## 2026-05-24 — v0.2 设计文档 R2 修订
- 本次角色：架构师
- 动作：修改（响应 PM R1 + 全栈开发 R1 Review 意见）
- 涉及文档：docs/progress/iterations/v0.2-design.md、docs/progress/iterations/v0.2.md
- 结论：R2 修订完成，共 9 项修改：日志时间范围过滤（PM#1+Dev#1）、域名匹配修正（Dev#2）、空字符串 source_url 检查（Dev#5）、verified→active 触发点（PM#2）、VerifyItem 映射对齐（Dev#3）、TimedRotatingFileHandler 替换 FileHandler（PM#3+Dev#4+Dev#6）、_source_out_legacy 适配器（Dev#7）、9.4 节更新、文档元数据更新。进入 R2 Review。
- 关联迭代：v0.2
- 遗留问题/风险：等待 PM 和全栈开发 R2 Review

## 2026-05-24 — v0.2 设计文档初版产出
- 本次角色：架构师
- 动作：产出
- 涉及文档：docs/progress/iterations/v0.2-design.md、docs/progress/iterations/v0.2.md
- 结论：产出完成，进入 Review。覆盖数据库变更（name→display_name 重命名 + 新增 status/source_url/last_verified_at/verify_error 列）、Source CRUD API、验证/标记端点、统计端点、Admin 日志端点、Worker 清理（删5个旧抓取器+scheduler JOIN过滤+默认NonRetryableError）、API 日志系统、前端数据层适配
- 关联迭代：v0.2
- 遗留问题/风险：设计文档待 PM 和全栈开发 Review

## 2026-05-24 — v0.2 PRD R2 Review
- 本次角色：架构师
- 动作：Review（审 PM 的 v0.2 PRD R2 修订）
- 涉及文档：docs/progress/iterations/v0.2-prd.md、docs/progress/iterations/v0.2.md
- 结论：✅通过。R1 全部 13 条意见已在 R2 正文中关闭。发现 1 处跨章节不一致（3.2.3 vs 6.3 数据清理措辞），建议修正后进入设计阶段。字段策略措辞有轻微歧义（两条方案并列），建议清理。
- 关联迭代：v0.2
- 遗留问题/风险：无阻塞项；6.3/5.1 措辞对齐后即可设计

## 2026-05-24 — v0.2 PRD R1 Review
- 本次角色：架构师
- 动作：Review（审 PM 的 v0.2 PRD）
- 涉及文档：docs/progress/iterations/v0.2-prd.md、docs/progress/iterations/v0.2.md
- 结论：❌需修改。共 13 条意见：
  - 2 项阻断：#1 Source 验证机制架构路径不明确、#2 sources.display_name 与 name 字段关系不清
  - 6 项中等：#3 scheduler 未感知 Source status、#4 数据全清范围、#5 RSS 识别漏判、#6 编辑后状态处理、#7 日志查看器架构、#8 级联遗漏 tasks 表
  - 5 项轻微：#9 preview 长度、#10 mark-verified 幂等性、#11 全局统计路径、#12 共享枚举、#13 NonRetryableError
- 关联迭代：v0.2
- 遗留问题/风险：等待 PM 在 R2 回应阻断项

## 2026-05-20 — v0.1 设计文档初版产出
- 本次角色：架构师
- 动作：产出
- 涉及文档：docs/v0.1-design.md（后移至 docs/progress/iterations/v0.1-design.md）
- 结论：产出完成，进入 Review
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-20 — v0.1 PRD Review
- 本次角色：架构师
- 动作：Review
- 涉及文档：docs/v0.1-prd.md
- 结论：提出技术可行性建议，PRD 修改后通过
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-20~23 — v0.1 设计文档多轮修改
- 本次角色：架构师
- 动作：修改
- 涉及文档：docs/v0.1-design.md（经历 RD review、dev review、3rd review）
- 结论：设计定稿
- 关联迭代：v0.1
- 遗留问题/风险：前端 UX 优化留待后续迭代

## 2026-05-23 — v0.1 迭代完成
- 本次角色：架构师
- 动作：收尾
- 涉及文档：docs/progress/iterations/v0.1.md
- 结论：v0.1 三阶段（PRD→设计→实现）全部定稿，迭代完成
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-23 — v0.1 实现阶段 R3 Review
- 本次角色：架构师
- 动作：Review（审全栈开发 R3 Review 问题修复）
- 涉及文档：docs/progress/iterations/v0.1.md
- 结论：R2 遗留 2 个中等问题（游标截断时序 + auth failure 全覆盖）均正确修复，与设计文档对齐，✅通过
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-23 — v0.1 实现阶段 R2 Review
- 本次角色：架构师
- 动作：Review（审全栈开发 R2 设计对齐修复）
- 涉及文档：docs/progress/iterations/v0.1.md
- 结论：9 项变更中 8 项通过，1 项需修复（_handle_auth_failure 在 user_timeline/resolve_usernames 中缺失）
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-23 — v0.1 设计文档 R3 修订 + 微调
- 本次角色：架构师
- 动作：修改（响应 PM R2 + 开发 R3 + PM R3）
- 涉及文档：docs/progress/iterations/v0.1-design.md、docs/progress/iterations/v0.1.md
- 结论：
  - R3 修订：修复 PM R2 5项——9.1 改技术债务、NonBlankStr 校验、NonRetryableError、空结果游标、listNews 对象参数
  - R3 微调：修复开发 R3 6项——文档状态标记、冗余 if 移除、render_text 格式补充、NonRetryableError 位置明确(worker/errors.py)、import 补充、TOCTOU 文档化
  - 当前待开发复审微调项
  - 2026-05-23 全栈开发复审通过，设计定稿
- 关联迭代：v0.1
- 遗留问题/风险：无

## 2026-05-23 — v0.1 设计文档 R2 修订
- 本次角色：架构师
- 动作：产出（修订）
- 涉及文档：docs/progress/iterations/v0.1-design.md、docs/progress/iterations/v0.1.md
- 结论：对齐 PRD R4，重写设计文档；新增数据流总览、技术约束、前端数据层适配章节；更新迭代记录设计阶段门禁表
- 关联迭代：v0.1
- 遗留问题/风险：无

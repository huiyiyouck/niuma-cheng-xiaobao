# 架构师长期摘要

> 启动默认读本文件 + `architect-current.md` + `architect-corrections.md`。
> 本文件只写长期摘要、当前关注点、常见风险；具体日志看 current/archive。

## 当前关注点（截至 2026-06-09）

- **v0.6 PRD R1 Review 待执行**：当前迭代处于 PRD R1 Review 中，架构师是指定 Review 方之一。范围为 Figma 原型前端重构、X 信息 L0/L1 分层处理、空间图标上传；明确不在本期：L2、反馈、详情页、前端策略配置、Source 代理前端配置。
- **架构师名下无未关闭历史事项**：v0.5 全流程已闭环；v0.4 数据库迁移机制（ADR-001）和 #B2 评估已闭环。
- **下一步入口**：Review `iterations/v0.6-prd.md`，按职责边界提意见后等 PM 汇总 R2。

## 项目已落地架构基线

### ADR

| 编号 | 主题 | 状态 | 文档位置 |
|------|------|------|----------|
| ADR-001 | 数据库迁移机制（drizzle-kit generate + journal + systemd ExecStartPre + dependencies 而非 devDependencies） | 已采纳（含 2026-05-31 实操修订附注） | `docs/baseline/architecture.md` |

### 技术栈基线（v0.3 迁移后冻结）

- 后端：Node.js + Fastify + Zod + Drizzle ORM + PostgreSQL（无 WebSocket，v0.3 砍掉）
- 数据源插件化：Fetcher 注册表 + Dispatcher 分发，新增数据源写一个文件即可
- Worker：同进程，按 Fetcher 类型 fan-out（v0.3 5 模块拆分）
- 前端：Vue 3 + Vite + TypeScript
- 迁移：`server/drizzle/` 路径 + drizzle-kit generate 增量，baseline 永不再 regenerate

### v0.5 关键架构产出（设计文档）

- 13 表 schema：sub_channels→channels 重命名、sources 双维度状态 + 10+ 新字段、display_positions 替代 channel_sources、news_positions m:n 关联、alerts scope 解耦、source_identity_history
- 5 项核心设计决策：operational_status 动态计算、软删除快照、dedup_key 告警去重、debounced 规则同步、事务包裹 DELETE 清理
- 6 组 20+ API 端点重写
- X Stream Manager + Worker per-source 调度 + 告警生命周期 + 自动启停

## 常见 Review 模式（架构师视角）

### 审 PRD 时常见缺口

1. **状态模型混用**（多个状态维度被压成一个 enum）— v0.5 PRD R1 出现，强制要求双维度拆分
2. **UNIQUE 约束与业务规则冲突**（如 m:n 关联用 UNIQUE 索引拦住合法重复）— v0.5 PRD R1 出现
3. **m:n 关联表缺失**（PRD 描述了 m:n 行为但 schema 仍是 1:n）— v0.5 PRD R1 出现
4. **外部 API 失败场景缺失**（PRD 只描述 happy path）— v0.5 PRD R1 出现
5. **状态约束未跨章节贯彻**（状态枚举改了但 §AC 未更新）— v0.5 PRD R2 才补齐

### 审 UI 方案时常见缺口

1. **API 契约清单缺失**（UI 方案没列接口 → 设计阶段无法接续）— v0.5 UI R1 出现，要求 §10 补齐
2. **PRD 状态约束未体现在交互**（按钮启用条件、表单字段约束未反映状态机）— v0.5 UI R1 出现

### 审实现时常见缺口

1. **字段未定义但代码已用**（前端类型对齐遗孤、后端 schema 改了忘改 routes）— v0.5 实现 R1 出现，#I1 lifecycleStatus
2. **新路径无测试覆盖**（auto-add 路径 B、状态流转关键边界）— v0.5 实现 R1 出现
3. **HTTP 客户端 token 注入不一致**（原生 fetch 漏走 interceptor）— v0.4 实现 R1 出现

### 受保护路径删除 Review 套路

1. 全仓子串扫描复核零引用（剔除 node_modules/dist）
2. 核查依赖的 API/类型/字段确实已删（不能只看组件本身）
3. 核查替代关系一览中的新组件真在被引用
4. 给出 ✅通过 / ❌驳回 / ⚠️有条件通过 结论 + 风险点
5. 不代任何其他角色执行删除

## 常见风险登记

- **状态模型早期不双维度拆分** → 后期改库代价大（v0.5 设计阶段才修是底线）
- **UI 方案没 API 契约** → 设计阶段接不上
- **包依赖归属错位**（drizzle-kit 在 devDependencies） → 生产 ExecStartPre 直接失败
- **schema baseline regenerate** → 双真源残留 + #B1 类事故重演（v0.5 起强制约定永不 regenerate）
- **PRD 已定稿后跨章节不一致**（如 v0.2 PRD §3.2.3 vs §6.3 措辞） → 进入设计阶段才暴露
- **前端 ChannelPills 等组件替代时未对称约束** → 长期残留孤儿，等部署翻车才暴露（基线修正提案已登记）

## 知识库索引（架构师条目）

- `docs/baseline/architecture.md` — ADR 总入口
- `docs/knowledge/devops/db-migration-handbook.md` — drizzle 迁移操作手册（含 drizzle-kit/orm 版本约束）
- `docs/knowledge/devops/full-stack-deploy-handbook.md` — 全栈部署手册（含软链接部署模式适配）

## 历史里程碑

- 2026-05-23 v0.1 完成（X/Twitter 抓取后端 + 前端基础）
- 2026-05-24 v0.2 完成（Source CRUD + 验证机制 + Admin 日志）
- 2026-05-27 v0.3 完成（Python → Node.js 迁移，砍 WebSocket）
- 2026-05-30 v0.4 完成（频道空间 CRUD + RSS Fetcher + 告警状态机）
- 2026-05-31 ADR-001 落档（数据库迁移机制规范化）
- 2026-06-06 v0.5 完成（X Filtered Stream + 信息源管理重构 + 评分体系方法论文档）
- 2026-06-09 v0.6 启动（Figma 原型前端重构 + X L0/L1 + 空间图标上传）

# 全栈开发工作日志 — Summary

> 长期摘要、当前关注点和常见风险。启动时与 `developer-current.md` 一并读取。
> 旧条目原文见 `developer-archive.md`。
> 最近一次更新：2026-06-09（v0.6 PRD R1 Review 收尾分层归档）

---

## 当前状态（2026-06-09）

- **当前迭代**：v0.6（PRD 阶段 R1 Review中）
  - Developer R1 ✅已提交（13 条：4 高 / 6 中 / 3 低），结论 ❌需修改
  - 与 Architect #A1-#A8、UI #U1-#U9 一致判断：本轮 PRD 把太多产品决策甩给设计阶段
  - 下一步：等待 Tester / DevOps 完成 R1 → PM 汇总 R2 → Developer 复审
- **v0.5 状态**：已关闭（2026-06-09 PM 有条件关闭），无 Developer 遗留代码任务
- **跨任务待办（Developer 归属）**：INDEX 跨任务待办表当前无 Developer 待办项

## 角色定位回顾

- 负责代码实现、单元测试、集成验证、修复 Review 问题、提交实现轮次
- 在 Review 阶段被指定时审 PRD/UI/设计/测试报告的**可实现性**、**契约一致性**、**工程成本**
- 不擅自改产品范围、不擅自改架构决策、不绕过 TDD、不绕过受保护路径删除门禁

## 当前关注点

### 1. v0.6 PRD R1 Review 已识别的关键工程缺口（等待 R2 收敛）

- **前后端契约缺失**：v0.5 R2 §10 的 20+ endpoint 是当时实施顺利的关键基础；v0.6 PRD 全程没出现 API 路径/字段名
- **tasks 表退避策略冲突**：AC-08 `[60,300,900]` 指数 vs 现有 `dispatcher.ts:62-76` 线性 `min(300, 10*(n+1))`；必须按 `tasks.type` 分流避免污染 v0.5 X Stream 抓取
- **AI JSON 输出体量风险**：从 v0.5 的 5 个 top-level key（1-2KB）膨胀到 v0.6 的 11+ 个（5-10KB），解析失败率会上升
- **空间图标上传**：Fastify 没装 `@fastify/multipart`，需要新依赖；emoji + 图片同字段还是新增列影响数据迁移
- **mock 数据策略**：AC-25 一刀切禁止与渐进式迁移矛盾，需拆为生产构建禁 mock + 开发期允许 fixture

### 2. v0.5 / v0.6 复用基线

- `dispatcher.ts:62-76` `requeueTask` 已支持 attempt + max_attempts + 退避，加 `type` 维度即可承载 L0/L1
- `processed_news.tags/entities/source_refs` 三个 jsonb 可装下 5 类标签 + 4 维分 + 5 来源（但建议设计阶段评估拆 `processed_news_l1_meta` 单表避免越塞越大）
- `NewsDetailPanel.vue` + `SlidePanel.vue` 抽屉形态已就绪，v0.6 抽屉四段式只需改内容结构、外壳全复用
- 路由 `/alerts`+`/logs` → `/monitoring` 合并工程量约 1 天（前端新建 MonitoringPage + 2 Tab + 旧路由 301 redirect）
- 原型项目 `/root/news-aggregation-platform` 是 React + shadcn + Tailwind；Vue 这边继续用现有 CSS 变量体系（`--primary` / `--text` / `--card`），UI 阶段做映射表即可，不需要重搭样式系统

### 3. 测试基建状态（v0.6 实施前必须解除）

- **当前 `vitest` 测试已禁用**（2026-06-08 生产 DB 误删事故后通过 `__tests_disabled__/` + `passWithNoTests` 临时止血）
- 恢复路径：独立 test DB + `.env.test` + vitest config 改回 include + 4 个已有失败测试同步修复
- 本期 AC-08 退避、AC-05 LLM 输出契约都需要单测覆盖，恢复测试是 v0.6 实施前置工作

## 常见风险与历史教训

### 1. 跨轮契约变更同步（v0.3 → v0.4 五个月）

v0.3 后端砍 WebSocket 后，前端 `ws.ts/WSStatus/useWS` 残留 5 个月，到 v0.4 视觉验证时才发现。教训已写入 `role-developer.md §跨轮契约变更同步`：删除后端能力时必须同 commit 全仓 grep 前端引用；零引用要注明，非零必须同步删除或登记待办。

### 2. 前端组件替代时的孤儿（v0.5 重构 → 6 个孤儿前端组件）

v0.5 重构后 `InlineAddSource/SubChannelManager/VerifyDialog/ChannelFilter/SearchFilterBar/ChannelPills` 6 个组件被替代但未删除，留到 v0.5.1 部署时 `npm run build` 31 个 TS 错误才被发现。基线修正提案已交 WM 评估：建议增加"前端组件替代时必须同步删除"约束（类似已删后端 API 的对称约束）。

### 3. 测试直连生产 DB（2026-06-08 生产事故）

`vitest` 直连生产 `localhost:5432/news`，`cleanTestData()` 在 `beforeAll` 中 `DELETE FROM` 全部 11 张表。教训：测试必须用独立 DB + `.env.test` + 事务回滚代替 DELETE。

### 4. 受保护路径删除门禁（已落地 baseline）

`server/`、`frontend/src/`、`deploy/`、`docs/baseline/`、`docs/templates/`、`CLAUDE.md`、`AGENTS.md` 下文件删除必须走 Architect Review 门禁。例外条款 §3：项目 Owner 直接同意零引用死代码可跳过 Architect Review。

### 5. last-out-unified-commit（已落地基线）

多角色会话遗留的脏改动由最后下班的角色统一 commit，不要按"只提自己产出"规则留在工作区。

## 知识库沉淀已完成的工程经验

- [`nodejs-unlink-while-open-recovery.md`](../../knowledge/engineering/nodejs-unlink-while-open-recovery.md) — Node.js 进程 unlink-while-open 应急恢复套路（2026-05-31 误删 server/ 事故复盘）
- [`vue3-setup-props-non-reactive-pitfall.md`](../../knowledge/engineering/vue3-setup-props-non-reactive-pitfall.md) — Vue 3 setup 中 const 解构 props 非响应式陷阱（v0.4 视觉 Bugfix #5a 修复经验）

## 提交边界提醒

- Developer 提交边界：本角色当次会话产生的代码与文档变更
- 跨角色脏改动遵循 `last-out-unified-commit` 规则
- commit 必须按规范结尾：`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- 不允许 force push、不允许跳过 hooks、不允许覆盖未归属修改

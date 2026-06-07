# WM（工作流管理者）角色日志

## 2026-06-07 — 接入 Codex 第二客户端（事后补登基线修正提案）

- 本次角色：WM
- 动作：基线修正（事后追认）— 在工作流中正式接入 Codex 作为第二个客户端入口；与 Claude Code 共用同一套 baseline / progress / knowledge 工作台
- 触发源：Owner 直接动手添加了 `AGENTS.md` 并把 baseline 中硬编码的 `CLAUDE.md` 引用泛化；未走 WM 提案流程；本次 WM 会话核对未提交变更时发现并补登
- 修改范围（12 个变更文件，净 +7 行，主题单一、内部一致）：
  - 新增：`AGENTS.md`（76 行，结构与 `CLAUDE.md` 完全镜像，仅把"Claude Code"换为"Codex"）
  - 入口文件引用泛化（`CLAUDE.md` → 「客户端入口文件（`CLAUDE.md` 或 `AGENTS.md`）」）：`context-policy.md`、`mechanisms.md`、`runtime.md`（默认只读列表）、`conventions.md`（Git 工作流引用）、`role-architect.md`、`role-developer.md`、`role-devops.md`、`role-pm.md`、`role-tester.md`、`role-ui.md`、`role-wm.md`（6 处职责描述）
  - 受保护路径同步增列 `AGENTS.md`：`conventions.md` §受保护路径删除门禁、`role-architect.md` 删除 Review 职责、`runtime.md` §质量底线
  - `multi-agent-workflow.md`：标题去 "claude-workflow" 专属化；适用范围"Claude Code"→"AI 编程 Agent"；目录结构图加 `AGENTS.md`；新增一段"工作流不关心由哪种客户端启动"
  - `conventions.md` §协作 commit 二次核对：去 Claude 专属化，"标注 Co-Authored-By: Claude" → "由 AI Agent 生成或标注 Co-Authored-By"
  - `runtime.md` §质量底线：补充 3 条原本散落在角色手册的底线规则（一会话一角色 / 换角色先收尾 / Review 必须被指定角色执行）
- WM 双侧检查结果：受保护路径在 3 处引用全部同步加上 `AGENTS.md`；WM 自身职责范围 6 处全部同步纳入 `AGENTS.md`；`AGENTS.md` 与 `CLAUDE.md` 结构完全一致；`mechanisms.md` Bootstrap 触发条件、`runtime.md` 默认只读清单均已泛化；未发现规则缺口、引用不一致或漏改
- Owner 决策路径：Owner 已先行修改；本次 WM 会话核对后判定变更主题单一、内部一致、质量合格；Owner 确认按"事后补提案 + 收尾 + commit"路径处理
- 流程偏离说明：本次绕过了 `role-wm.md` §基线修改流程要求的"先提案 → 等人类确认 → 再执行"。Owner 自改属于已有人类决策，但缺失 WM 影响分析留痕；事后通过本日志和提交记录补齐
- 关联迭代：无（基线修正，元流程）
- 关联非迭代工作：无
- 遗留问题/风险：无；后续涉及客户端差异化行为时，应当在 `CLAUDE.md` 与 `AGENTS.md` 中分别维护，baseline 不再针对单一客户端硬编码
- 下一步入口：v0.5 部署就绪检查继续（Owner 浏览器手测 v0.5.1 前端 UI）
- 收尾状态：已收尾（commit `e380462` 已推送 origin/main）

## 2026-05-31 — 三项基线修正提案落地

- 本次角色：WM
- 动作：基线修正（3 项提案合并落地）
- 触发源：2026-05-30 基线同步事故 + v0.3 砍后端 WS 后前端残留 5 个月 + Developer 提的 INDEX 跨任务待办元流程提案
- 涉及文档：9 个 baseline/templates 文件 + INDEX + 本日志
  - `docs/baseline/conventions.md`（#1 新增「受保护路径删除 Review 门禁」主章节 + 禁止事项加 1 行）
  - `docs/baseline/runtime.md`（#1 §质量底线加引用）
  - `docs/baseline/role-developer.md`（#1 §安全边界加引用 + #2 新增「跨轮契约变更同步」章节 + 自检清单加 3 项）
  - `docs/baseline/role-architect.md`（#1 新增「受保护路径删除 Review 职责」章节）
  - `docs/baseline/role-wm.md`（#1 §安全边界加 1 行）
  - `docs/baseline/mechanisms.md`（#2 迭代关闭检查加第 8 项）
  - `docs/baseline/subagents/sub-frontend.md`（#2 完成标准加跨轮契约残留扫描）
  - `docs/baseline/subagents/sub-backend.md`（#2 完成标准加跨轮契约残留扫描）
  - `docs/templates/progress-index.md`（#3 新增「跨任务待办」骨架）
  - `docs/progress/INDEX.md`（移除 3 项 WM 跨任务待办，结构同步模板新规范）
- 提案#1 主张：受保护路径（`server/`、`frontend/src/`、`deploy/`、`docs/baseline/`、`docs/templates/`、`CLAUDE.md`）的文件删除必须先停下、列清单、请架构师 Review、✅通过后才执行；commit message 留痕；架构师自身删除时 Owner 兜底；已登记记录的删除可豁免架构师 Review
- 提案#2 主张：后端砍能力时必须 grep 前端引用；引用非零必须同步处理或登记；Tester 在迭代关闭检查时核对；前后端子 Agent 完成标准纳入跨轮契约残留扫描
- 提案#3 主张：INDEX「跨任务待办」骨架进入模板；字段写权限——状态独占归属角色，Owner 兜底可更新任何字段；不写 baseline 强约束（避免过早僵化）
- Owner 决策路径：分 5 轮交互逐项澄清并确认（删除方案改为事前 Review 门禁 / Review 方限定架构师 / 模板字段写权限规则 / #2 按推荐落地 / 全部最终通过）
- 关联迭代：无（基线修正，元流程）
- 关联非迭代工作：[Incident 2026-05-31 server-source-deleted](../ad-hoc/2026-05-31-incident-server-source-deleted-by-baseline-sync.md)
- 遗留问题/风险：无
- 下一步入口：v0.4 测试阶段继续（等全栈开发 Review 测试报告 R1 → 迭代关闭）
- 收尾状态：已收尾（commit dfede2b 已推送 origin/main）

## 2026-05-30 — 会话摘要
- 本次角色：WM
- 动作：工作流审查 + 修改
- 涉及文档：19 个文件
- 结论：9 轮审查，+130/-400 行净减 270 行。7 角色体系完整、子 Agent 系统就绪、零残留问题
- 关联迭代：无
- 关联非迭代工作：无
- 遗留问题/风险：无
- 下一步入口：项目可在真实项目中使用
- 收尾状态：已收尾

## 本轮修改概要

### 结构精简
- CLAUDE.md 从 85 行砍到 47 行（入口索引化）
- 删除 conventions.template.md（并入 multi-agent-workflow.md）
- Bootstrap 从 9 步精简到 5 步
- context-policy.md 从 204 行砍到 55 行
- session-closeout.md 删除（并入 context-policy.md）
- Review Plan 提取为共享模板（5 个模板引用 1 个）

### 消除重复
- "至少2个Review方"从 10+ 处统一为 1 处
- "会话结束执行收尾归档"从 7 个角色中移除，统一触发
- "我产出时"统一为基线引用
- "判断本次是X还是Y"推送至 runtime.md
- 缺陷严重度移至 multi-agent-workflow.md

### 修复流程 bug
- 6 个角色全部加上 Reviewer/Producer 场景路由
- 非迭代任务路由修复（Bugfix/UI草案/技术预研/独立运维跳过门禁检查）
- 步骤编号连续性和跳转目标修正
- 流水线回环规则补充
- Review 轮次上限（R3→阻塞）
- DevOps 定位三处统一
- git pull 失败兜底

### 子 Agent 系统
- 新建 sub-frontend.md / sub-backend.md
- Developer 手册新增调度策略（触发条件/流程/验证/失败处理/并行限制）
- 功能隔离零泄漏

### 命名统一
- Role Creator → WM（工作流管理者），角色定义扩展为工作流体系维护者
- 项目名统一为 claude-workflow

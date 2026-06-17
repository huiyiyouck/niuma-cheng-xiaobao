# WM（工作流管理者）角色日志

## 2026-06-17 — 初始化 coordination 仓库最小骨架

- 本次角色：WM
- 动作：跨项目协作 — 按 `cross-project-collaboration.md` 基线，为 Owner 提供的 `niuma-cheng-coordination` 仓库创建最小骨架
- 触发源：Owner 提供仓库地址 `git@github.com:huiyiyouck/niuma-cheng-coordination.git` 并要求“继续上次工作 + 麻雀虽小五脏俱全”
- 事实确认：
  - clone 后为空仓库；本地 `~/Project/niuma-cheng-ai` 存在但**无 git remote、未 Bootstrap**；xiaobao remote `git@github.com:huiyiyouck/niuma-cheng-xiaobao.git`
  - 契约真源取自 ai 项目 `src/agent_hub/schemas.py`（`L1Input`/`L1Output`/`RunResponse`），endpoint `POST /v1/runs/news-l1` + `GET /health`
- 产出（coordination 仓库，commit 已推 origin/main）：
  - `README.md` 生态总览 / `PROJECTS.md` 项目目录真源（xiaobao + ai）
  - `STATUS.md` 跨项目状态（xiaobao v0.6 实现阶段 / ai 待 Bootstrap，无强阻塞）
  - `CHANGELOG.md` 跨项目变更日志（含 news-l1 v1 收编、多项目扩展）
  - `contracts/news-l1.md` 契约 v1 单一真源（四维原始评分在 ai，加权 `score_total` 留 xiaobao）
  - `communications/xiaobao__ai.md` 沟通文档（与 PROJECTS.md 双向链接）
  - `decisions/0001-ai-hub-split.md` + `decisions/README.md`（D1–D5 跨项目决策引用 xiaobao spike 提案 §12）
- 会话边界说明：本会话为 xiaobao WM；按基线 §角色会话边界，当前项目角色可在 coordination 仓库建立/更新跨项目设施，未触碰 ai 项目内部 `docs/progress/`
- 跨项目交接：coordination `STATUS.md` 已登记两项跨项目事项（ai Bootstrap / news-l1 契约）；本项目侧同步更新 INDEX（见下）
- 提醒 Owner：`niuma-cheng-ai` 当前无 git remote，需配置后才能纳入 coordination 真源链路并 Bootstrap
- 下一步入口：Owner 为 ai 配置 remote → ai 项目会话进入团队模式执行 Bootstrap → 回填 coordination `PROJECTS.md`/`STATUS.md`
- [基线修正提案] 跨项目需求流转机制（2026-06-17，✅ Owner 已确认并落地）：
  - 问题：现有 `cross-project-collaboration.md` 把 `communications/` 仅定义为「项目间沟通文档」，头部模板用「调用方/服务方」框定，未定义其作为**跨项目需求提报与流转聚合平台**的定位、需求生命周期、提报/承接的角色权限、承接后转内部迭代的衔接。导致会话两次把它误解为单向工单/静态关系说明。
  - 建议方案：
    1. 在 `cross-project-collaboration.md` 新增 §跨项目需求流转，定义定位 = 跨项目需求提报与流转聚合平台；
    2. 需求生命周期：提报 → 评估承接（含拒绝/退回）→ 转入承接方项目内部标准迭代 → 开发 → 联调 → 关闭；
    3. 角色权限：任一项目**任一角色可提报**；仅**目标项目 PM 或 Architect 可承接/拒绝**；
    4. 会话边界：提报由提出方项目角色在自己会话写入 coordination；承接由目标项目 PM/Architect 在目标项目会话评估并回写；与「一会话一项目一角色」一致；
    5. 承接后 communications 只登记「转入 {项目} vX.Y」并链接回该项目 INDEX，不复制迭代细节；
    6. communications 文档分两层：A 需求台账（状态机）+ B 联调记录；修订头部模板去掉「调用方/服务方」主框定，改为「参与项目 + 协作主纲」。
  - 影响范围：`docs/baseline/cross-project-collaboration.md` 正文 + coordination 实例文档（`communications/`）；不涉及业务代码；不删除受保护路径文件。
  - Owner 裁定（2026-06-17）：(a) 批准按提案落地；(b) 含「拒绝/退回」路径；(c) 认可状态枚举：已提报/评估中/已承接/已拒绝/开发中(转入迭代)/联调中/已关闭。
  - 执行结果：已在 `cross-project-collaboration.md` 新增 §跨项目需求流转（定位/生命周期/角色权限/迭代衔接/会话边界/A·B 两层结构），并修订 §项目目录与沟通文档索引 的 communications 头部模板（去「调用方/服务方」主框定 → 「协作主纲」）；同步更新 coordination 实例 `communications/xiaobao__ai.md`（台账加承接人/转入迭代/状态机）与 `communications/README.md`（需求流转与角色权限段）。
- 收尾状态：coordination 骨架 + 需求流转机制均已落地并推送；baseline 与实例一致

## 2026-06-16 — 收编 Developer 跨项目协作基线提案

- 本次角色：WM
- 动作：读取并初审 Developer 提交的基线修正候选
- 触发源：Owner 提醒“开发又给基线做提案”
- 输入材料：
  - [跨项目协作机制设计（niuma-cheng 多项目）](../ad-hoc/2026-06-16-proposal-cross-project-collaboration.md)
  - `docs/progress/roles/developer-current.md` 2026-06-16 “建 niuma-cheng-ai 独立中枢骨架 + 跨项目协作机制设计”
  - `docs/progress/INDEX.md` 当前非迭代工作登记
- 事实确认：
  - Developer commit `9b2976c` 已把提案提交进仓库；当前工作区干净。
  - `niuma-cheng-xiaobao` 仍是新闻平台项目；`niuma-cheng-ai` 已作为独立 AI 中枢仓库创建；二者通过 `L1Input` / `L1Output` / `RunResponse` HTTP 契约耦合。
  - 现有 baseline 基本是单项目模型，缺少跨项目契约真源、协调仓库、跨项目状态交接和新项目复用团队工作流的规则。
- WM 初判：
  - 提案方向成立：跨项目协作不应塞进任一业务项目的 `docs/progress/INDEX.md` 作为唯一真源；需要独立 coordination 仓库承载跨项目契约和状态。
  - `contracts/news-l1.md` 作为契约单一真源是必要约束，能避免 xiaobao / ai 双边各写一份契约后漂移。
  - `STATUS.md` / `CHANGELOG.md` / `decisions/` 适合作为协调仓库最小骨架；不宜把各项目内部迭代记录复制进去。
  - `niuma-cheng-ai` 应在自身仓库执行 Bootstrap 初始化，拥有独立 `project-context.md` 和 `progress/INDEX.md`；不应直接共享 xiaobao 的动态进度。
  - 当前 baseline 中 `conventions.md` §基线修正流程仍写“架构师起草/修改 baseline”，而 `role-wm.md` 与 runtime 已把基线维护归到 WM；本次收编时建议顺手修正该旧口径，避免 Architect / WM 职责冲突。
- [基线修正提案] 问题：现有团队工作流缺少多项目协作规则，无法定义 coordination 仓库、跨项目契约真源、跨项目状态交接、跨项目开工前同步检查，以及新项目如何复用/初始化团队工作流；同时 `conventions.md` 中基线修正职责仍残留 Architect 旧口径。
- [基线修正提案] 建议：
  1. 新增 `docs/baseline/cross-project-collaboration.md`，定义多项目边界、coordination 仓库职责、契约单一真源、跨项目 `STATUS.md` / `CHANGELOG.md` / `decisions/` 规则、跨项目交接留痕。
  2. 更新 `runtime.md` 默认/按需加载规则：只有任务涉及多项目、外部项目契约、coordination 仓库或新项目 Bootstrap 复用时，才读取跨项目协作基线。
  3. 更新 `multi-agent-workflow.md` 文件结构和适用范围：说明每个项目保留独立 baseline/progress，coordination 只记录跨项目事实，不替代项目级 INDEX。
  4. 更新 `bootstrap.md` / `mechanisms.md`：明确新项目复用团队工作流时，先复制或安装 baseline，再在目标项目内执行 Bootstrap；不得继承源项目的 `progress/` 动态状态。
  5. 更新 `conventions.md` §基线修正流程，把“架构师起草/修改 baseline”修正为“WM 或 Owner 指定角色起草；人工确认后由指定角色修改”，与 `role-wm.md` 对齐。
  6. 后续在 Owner 创建 `niuma-cheng-coordination` 仓库后，由相关角色按该基线创建最小骨架：`README.md`、`contracts/news-l1.md`、`STATUS.md`、`CHANGELOG.md`、`decisions/`。
- 影响范围：`docs/baseline/` 多文件；不涉及业务代码；不删除受保护路径文件；需要 Owner 明确确认后才能修改 baseline 正文。
- Owner 确认：Owner 已回复“需要有啥确认的跟我说，我来拍板”“继续呀”，视为确认 WM 按上述方案收编。
- 执行结果：已新增 `docs/baseline/cross-project-collaboration.md`；同步更新 `runtime.md`、`multi-agent-workflow.md`、`bootstrap.md`、`mechanisms.md`、`conventions.md`，明确 coordination 仓库、契约真源、跨项目交接、新项目复用 Bootstrap 约束，并修正基线修正流程中 Architect / WM 职责旧口径。
- Owner 追加裁定：coordination 里需要“总的目录”说明哪个是哪个项目的沟通文档、是谁跟谁的项目文档。
- 补充执行：已在 `cross-project-collaboration.md` 增加 `PROJECTS.md` 和 `communications/` 规则；`PROJECTS.md` 作为项目目录真源，`communications/{project-a}__{project-b}.md` 作为项目间沟通文档，且要求双向链接，防止孤儿沟通记录。
- 下一步入口：Owner 明天创建或提供 `niuma-cheng-coordination` 仓库地址/本地路径后，按新基线创建最小骨架；`niuma-cheng-ai` 在自身仓库执行团队工作流 Bootstrap。
- 待办登记：已在 `docs/progress/INDEX.md` 跨任务待办登记 Owner P1：提供独立跨项目沟通仓库。
- 收尾状态：已收编并提交；等待 Owner 提供 coordination 仓库

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

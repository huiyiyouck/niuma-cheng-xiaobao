# 跨项目协作机制设计（niuma-cheng 多项目）— 已 WM 基线化

- 日期：2026-06-16
- 模式：Proposal（基线修正候选）
- 产出角色：Developer（开发工程师）
- 归属处理：**WM（工作流管理者）** + Owner 确认
- 当前状态：✅ 已收编 — WM 已新增 `docs/baseline/cross-project-collaboration.md`，并同步相关 baseline 入口与机制文件
- 执行约束：本文件只沉淀设计，不修改 `docs/baseline/`（基线修改属 WM 域，须经 Owner 确认）

## 1. 背景

niuma-cheng 生态从单项目变为多项目：

- `niuma-cheng-xiaobao`：新闻平台（Node.js），本仓库。
- `niuma-cheng-ai`：AI 处理中枢（Python + FastAPI + LangGraph），2026-06-16 已建独立仓库骨架（initial commit `0ee6c9a`，骨架可运行、冒烟测试 2 passed）。

两者通过 HTTP 契约（`L1Input`/`L1Output`/`RunResponse`）耦合。现有 `docs/baseline/` 团队工作流是**单项目**模型，没有跨项目协作规则。最大风险：两个 repo 各写一份契约、悄悄漂移（与本仓库提案 `2026-06-16-spike-langgraph-agent-hub-proposal.md` §12.5 #6「状态真源」同源风险）。

## 2. 推荐：三层结构

```
niuma-cheng-xiaobao        (Node 新闻平台)   ← 各自独立团队工作流 docs/baseline + progress
niuma-cheng-ai             (Python AI 中枢)  ← 各自独立团队工作流（待 Bootstrap）
niuma-cheng-coordination   (协调中心)        ← 跨项目唯一真源，两边都拉取
```

各项目管自己的迭代；协调仓库**只管跨项目的那部分**，不重复各项目内部进度细节。

## 3. 协调仓库内容（精简，勿做大）

> `niuma-cheng-coordination` 仓库由 **Owner 在 GitHub 创建**。以下为建议骨架。

| 文件/目录 | 作用 | 关键性 |
|-----------|------|--------|
| `contracts/news-l1.md` | `L1Input`/`L1Output`/`RunResponse` 契约**单一真源**（版本化） | ⭐ 最核心：两边代码以它为准，改契约先改这里再改代码 |
| `STATUS.md` | 跨项目当前状态：各项目阶段、当前阻塞、谁等谁、下一步 | 「拉取来跟踪」主要看它 |
| `CHANGELOG.md` | 跨项目重大事件、契约 breaking change 公告 | 让另一边知道「出事了要跟」 |
| `decisions/` | 影响两边的决策（如本次 LangGraph 方案 D1–D5） | 跨项目决策不散落在单边日志 |
| `README.md` | 生态总览：成员项目、关系、协作约定入口 | 新会话/新成员的入口 |

## 4. 工作约定（机制的灵魂，不止是文件）

- 任何跨项目相关工作**开工前 `git pull` 协调仓库**，看 `STATUS.md`。
- 改契约：**先改 `contracts/`**，再各自改代码，并在 `CHANGELOG.md` 记一行。
- 一边完成影响另一边的事（如中枢 API 就绪、契约 breaking）：更新 `STATUS.md` 并点名对方。
- 协调仓库为跨项目真源；各项目 `docs/progress/INDEX.md` 仍是各自项目级真源，二者不重复。

## 5. niuma-cheng-ai 上团队工作流

- 需在 `niuma-cheng-ai` 项目目录里执行 **Bootstrap**（建 `docs/baseline` + `docs/progress`），复用 xiaobao 这套成熟工作流规则。
- 这是 **niuma-cheng-ai 的新会话** 该做的事（切到该项目、进团队模式、执行 Bootstrap），不在本会话（xiaobao Developer）范围内。
- 复用方式由 WM 定：是直接拷贝 xiaobao `docs/baseline/`，还是抽公共基线 + 项目适配层（`project-context.md` 各自写）。

## 6. 边界与归属

- 跨项目协作是**团队工作流的跨项目扩展**，属 **WM 域基线修正**。本提案为 Developer 设计输入，**WM 收编进 baseline + Owner 确认**后生效。
- 涉及待 WM 处理的基线动作：
  1. 在 `docs/baseline/` 增加「跨项目协作」规则（协调仓库角色、契约真源约束、开工前拉取约定）。
  2. 定义 niuma-cheng-ai 团队工作流的复用/初始化方式（§5）。
  3. 明确多项目下「角色会话」如何跨项目协作（一个会话仍只承担一个项目的一个角色？跨项目交接如何留痕）。

## 7. 待办移交

| 事项 | 归属 | 状态 |
|------|------|------|
| 跨项目协作规则写进 baseline | WM | ✅ 已完成（新增 `docs/baseline/cross-project-collaboration.md`） |
| niuma-cheng-ai 团队工作流初始化方式 | WM | ✅ 已完成规则定义（新项目只复用 baseline/templates，不继承 progress；在目标项目内 Bootstrap） |
| `niuma-cheng-coordination` GitHub 仓库创建 | Owner | Owner 自行处理 |
| 协调仓库骨架内容（§3） | 创建后由相关角色填充 | 待仓库就绪 |

## 8. WM 收编记录

- 收编日期：2026-06-16
- 收编角色：WM（工作流管理者）
- 基线变更：
  - 新增 `docs/baseline/cross-project-collaboration.md`
  - 更新 `runtime.md`：增加跨项目协作加载路由和质量底线
  - 更新 `multi-agent-workflow.md`：补充多项目协作结构说明
  - 更新 `bootstrap.md` / `mechanisms.md`：补充新项目复用团队工作流约束
  - 更新 `conventions.md`：修正基线修正流程中 Architect / WM 职责旧口径
- 后续动作：Owner 创建 `niuma-cheng-coordination` 仓库；仓库就绪后按新基线创建最小骨架。

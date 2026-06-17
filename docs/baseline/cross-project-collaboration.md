# 跨项目协作基线

## 目标

本文件定义同一产品生态内多个项目仓库如何协作。它只处理跨项目边界，不替代任何单项目内部的 `docs/progress/INDEX.md`、迭代记录或角色日志。

适用场景：

- 一个功能需要两个以上项目共同交付。
- 一个项目暴露给另一个项目的 API、数据契约、事件或部署依赖发生变化。
- 新项目需要复用本团队工作流。
- Owner 创建或指定协调仓库，用来承载跨项目契约和状态。

## 基本模型

多项目协作采用三层结构：

```text
业务项目 A              ← 独立 baseline/progress/knowledge
业务项目 B              ← 独立 baseline/progress/knowledge
coordination 仓库       ← 跨项目契约和状态真源
```

每个业务项目仍然是独立项目。它们各自维护：

- `docs/baseline/project-context.md`
- `docs/progress/INDEX.md`
- `docs/progress/iterations/`
- `docs/progress/ad-hoc/`
- `docs/progress/roles/`

coordination 仓库只记录跨项目事实，不记录单项目内部的完整迭代细节。

## coordination 仓库

coordination 仓库由 Owner 创建或指定。推荐最小结构：

```text
README.md
PROJECTS.md
STATUS.md
CHANGELOG.md
contracts/
communications/
decisions/
```

| 路径 | 作用 |
|------|------|
| `README.md` | 生态总览、成员项目、协作入口 |
| `PROJECTS.md` | 项目目录：每个项目的仓库、职责、Owner、当前入口和关联沟通文档 |
| `STATUS.md` | 跨项目当前状态：谁等谁、阻塞项、下一步 |
| `CHANGELOG.md` | 跨项目重大事件、契约 breaking change、迁移提醒 |
| `contracts/` | 跨项目契约单一真源，如 HTTP schema、事件、字段语义 |
| `communications/` | 项目间沟通文档，按参与项目成对或多方归档 |
| `decisions/` | 影响两个以上项目的决策记录 |

coordination 仓库不要承载业务项目的全部 PRD、设计文档、测试报告或角色日志。需要查看项目内部细节时，从 `STATUS.md` 链接回对应项目文件。

## 项目目录与沟通文档索引

coordination 仓库必须有一个总目录，说明有哪些项目、每个项目负责什么、项目之间的沟通文档在哪里。

### `PROJECTS.md`

`PROJECTS.md` 是跨项目目录真源。推荐字段：

| 字段 | 说明 |
|------|------|
| 项目 id | 稳定短名，如 `xiaobao`、`ai` |
| 项目名称 | 人可读名称 |
| 仓库 | Git URL 或本地约定路径 |
| 职责边界 | 该项目负责什么、不负责什么 |
| 当前入口 | 指向该项目 `docs/progress/INDEX.md` 或项目 README |
| 关联项目 | 与哪些项目存在契约或交付依赖 |
| 沟通文档 | 指向 `communications/` 下的对应文件 |

### `communications/`

项目间沟通文档放在 `communications/` 下，按参与项目命名：

```text
communications/
├── xiaobao__ai.md
├── xiaobao__coordination.md
└── xiaobao__ai__coordination.md
```

命名规则：

- 两个项目之间：`{project-a}__{project-b}.md`
- 三个以上项目：`{project-a}__{project-b}__{project-c}.md`
- 项目 id 使用 `PROJECTS.md` 中的稳定短名
- 文件名只表达参与方，不表达临时议题；临时议题写进文档内章节

每份沟通文档是这组项目协作的**主纲**，不是单向工单或静态关系说明，定位与流转规则见 §跨项目需求流转。头部必须写清楚：

```markdown
# {项目 A} ↔ {项目 B} 协作主纲

- 参与项目：{project-a}, {project-b}
- 定位：本组项目所有跨项目协作的需求提报与流转主纲（双向对等，见各项目 baseline §跨项目需求流转）
- 契约真源：contracts/{contract-name}.md（涉及接口/字段时）
- 当前状态入口：STATUS.md#{anchor}
- 最近更新：YYYY-MM-DD
```

`PROJECTS.md` 必须反向链接每份沟通文档，避免出现“不知道这是谁和谁的文档”的孤儿沟通记录。

## 跨项目需求流转

`communications/` 不只是聊天记录，它是**跨项目需求提报与流转的聚合平台**。一组项目之间的协作需求在此提报、承接、跟踪、联调。

### 定位

- **双向对等**：不预设需求方/承接方，任一项目的任一角色都可提报需求。
- **调用方向 ≠ 需求方向**：HTTP 调用或部署依赖的方向是事实，但需求是双向的，二者不绑定。
- **一份看全**：一组项目的协作需求集中在该组的 communications 文档管理，读一份即掌握「有哪些需求、各自进展、在联调什么」。

### 需求生命周期

```text
已提报 → 评估中 → 已承接 ─┐(或 已拒绝)
                         └→ 开发中(转入承接方项目内部迭代) → 联调中 → 已关闭
```

| 状态 | 含义 | 谁推进 |
|------|------|--------|
| 已提报 | 提出方写入需求 | 任一项目任一角色 |
| 评估中 | 目标项目评估是否承接 | 目标项目 PM 或 Architect |
| 已承接 | 接受并认领 | 目标项目 PM 或 Architect |
| 已拒绝 | 评估后不承接，写明理由并退回提出方 | 目标项目 PM 或 Architect |
| 开发中 | 已转入承接方项目内部标准迭代 | 承接方项目按各自工作流 |
| 联调中 | 开发完成，跨项目联调 | 相关角色（通常 Developer） |
| 已关闭 | 联调通过 / 需求完成或作废 | — |

### 角色权限

- **提报**：任一项目的**任一角色**都可以提报需求。
- **承接 / 拒绝**：只有**目标项目的 PM（产品经理）或 Architect（架构师）**可以承接或拒绝需求；其他角色不得代为承接。
- **联调**：由相关角色（通常 Developer）执行。

### 与项目内部迭代的衔接

承接后，目标项目的 PM/Architect 把需求**转换为本项目内部的标准迭代**（按 `multi-agent-workflow.md` 走 PRD → 设计 → 实现 → 测试），由本项目独立开发。

communications 文档只登记「已转入 {项目} vX.Y」并链接回该项目 `docs/progress/INDEX.md` / 迭代记录，**不复制迭代细节**；开发完成后回到 communications 做基于该需求的联调。

### 会话边界

与 §角色会话边界 一致，一个会话仍只承担一个项目的一个角色：

- 提报：提出方项目的角色在自己会话里把需求写入 coordination。
- 承接 / 拒绝：目标项目 PM/Architect 在**目标项目会话**评估并回写 coordination，不能在提出方会话里替目标项目承接。
- 转入迭代后，开发在承接方项目会话内按其工作流进行。

### communications 文档两层结构

每份 communications 文档分两层维护：

- **A 需求沟通**：需求台账，字段建议 —— 需求 id / 提出方（项目·角色）→ 面向项目 / 内容 / 承接人（PM 或 Architect）/ 对应契约 / 转入迭代 / 状态。
- **B 联调沟通**：每条需求确立后的对接、字段对齐、调试、版本跟进，倒序时间线，条目标注所属需求 id。

## 契约真源

跨项目契约必须有单一真源。默认放在 coordination 仓库的 `contracts/` 下。

规则：

1. 修改跨项目 API、schema、事件、字段语义或错误码前，先更新 `contracts/`。
2. 修改契约后，在 `CHANGELOG.md` 记录影响范围、是否 breaking、需要哪些项目跟进。
3. 各业务项目按契约修改代码，并在本项目 `docs/progress/INDEX.md` 或相关 ad-hoc / 迭代记录中写清楚已跟进的 coordination 版本或 commit。
4. 不允许两个业务项目各自维护一份互相冲突的契约说明。

如果 coordination 仓库尚未创建，可以在发起项目先写临时提案，但必须标记为“临时真源”。coordination 仓库创建后，应迁移到 `contracts/` 并在原提案中留下引用。

## 开工前同步

涉及跨项目的任务，当前角色在进入具体工作前必须：

1. 拉取或查看 coordination 仓库最新状态。
2. 阅读 `STATUS.md`。
3. 若涉及契约，阅读对应 `contracts/` 文件。
4. 判断本项目是否等待其他项目、是否会阻塞其他项目。
5. 在本项目记录中写明 coordination 依据。

普通单项目任务不需要读取 coordination 仓库。

## 跨项目交接

一边完成会影响另一边的事项时，必须留下两处记录：

1. 本项目记录：更新本项目 `INDEX.md`、迭代记录或 ad-hoc，说明完成内容和对外影响。
2. coordination 记录：更新 `STATUS.md`，点名被影响项目和下一步责任。

如果是契约变更，还必须更新 `CHANGELOG.md`。

跨项目交接不等于替对方项目推进状态。被影响项目必须在自己的项目仓库内启动对应角色或工作模式后，才能更新自身进度。

## 角色会话边界

一个会话仍只承担一个项目中的一个角色。

允许：

- 当前项目角色阅读 coordination 仓库，了解跨项目状态。
- 当前项目角色在 coordination 仓库更新跨项目状态或契约变更公告。
- 当前项目角色提出“另一个项目需要由某角色处理”的交接建议。

不允许：

- 在一个会话里同时扮演两个项目的同名或不同角色。
- 在 A 项目会话里直接修改 B 项目的 `docs/progress/INDEX.md` 或角色日志。
- 用 coordination 仓库替代业务项目自己的 Review、测试或部署门禁。

如果需要切到另一个项目工作，先完成当前项目当前角色的收尾记录，再在目标项目目录中启动新会话。

## 新项目复用团队工作流

新项目复用团队工作流时，只能复用基线规则和模板，不能继承源项目的动态进度。

推荐步骤：

1. 在目标项目仓库准备客户端入口文件和 `docs/baseline/`、`docs/templates/`。
2. 按目标项目实际情况创建或后续由 PM 创建 `docs/baseline/project-context.md`。
3. 在目标项目进入团队模式。
4. 如果缺少 `docs/progress/INDEX.md`，按目标项目内的 Bootstrap 流程初始化。
5. 在目标项目的 `INDEX.md` 中记录 Bootstrap 结果。
6. 如该项目属于某个多项目生态，在 coordination 仓库 `README.md` 和 `STATUS.md` 登记。

禁止：

- 复制源项目的 `docs/progress/` 到新项目作为初始状态。
- 复制源项目的 `project-context.md` 后不改项目事实。
- 新项目 Bootstrap 后默认进入标准迭代。

## 与单项目基线的关系

- `runtime.md` 决定什么时候加载本文件。
- `multi-agent-workflow.md` 仍定义单项目内的角色、阶段和 Review 规则。
- `mechanisms.md` 仍定义 Bootstrap、收尾、关闭检查和流程审计。
- 本文件只补充跨项目真源、交接和新项目复用规则。

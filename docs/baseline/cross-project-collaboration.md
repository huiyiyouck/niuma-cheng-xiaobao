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
REQUESTS.md
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
| `REQUESTS.md` | 跨项目需求提报中心（需求池）：提报时不指定承接方，由项目方认领或 Owner 指派 |
| `STATUS.md` | 跨项目当前状态：谁等谁、阻塞项、下一步 |
| `CHANGELOG.md` | 跨项目重大事件、契约 breaking change、迁移提醒 |
| `contracts/` | 跨项目契约单一真源，如 HTTP schema、事件、字段语义 |
| `communications/` | 承接需求**之后**的项目间协作与联调沟通，按参与项目成对或多方归档 |
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

每份沟通文档承载一组项目**承接需求之后**的协作与联调（需求提报在 `REQUESTS.md`，规则见 §跨项目需求流转），不是单向工单也不是聊天室。头部必须写清楚：

```markdown
# {项目 A} ↔ {项目 B} 协作沟通

- 参与项目：{project-a}, {project-b}
- 定位：{project-a} 与 {project-b} 承接需求后的协作与联调沟通（需求源头见 ../REQUESTS.md）
- 契约真源：contracts/{contract-name}.md（涉及接口/字段时）
- 当前状态入口：STATUS.md#{anchor}
- 最近更新：YYYY-MM-DD
```

`PROJECTS.md` 必须反向链接每份沟通文档，避免出现“不知道这是谁和谁的文档”的孤儿沟通记录。

## 跨项目需求流转

coordination 提供一个**统一的需求提报中心**（`REQUESTS.md`）。跨项目需求先提报到需求池，**提报时不指定由哪个项目承接**；各项目的 PM/Architect 按本项目定位主动评估是否承接，Owner 也可直接指派。**承接之后**，提出方与承接方之间才建立 `communications/{a}__{b}.md` 做协作与联调沟通。

### 定位

- **提报面向需求池，不预设承接方**：任一项目的任一角色把需求提报到 `REQUESTS.md`，提报时不点名谁来做。
- **承接是认领，不是派单（Owner 除外）**：各项目 PM/Architect 根据本项目定位评估是否承接；**Owner（老板）可直接指定**某项目承接。
- **承接后才有沟通**：需求被某项目承接后，才在提出方↔承接方的 communications 文档展开协作与联调。
- **调用方向 ≠ 需求方向**：HTTP/部署依赖方向是事实，需求双向，二者不绑定。

### 需求生命周期

```text
已提报(需求池, 无承接方) → 评估中 → 已承接 ─┐(或 已拒绝)
                                          └→ 开发中(转入承接方内部迭代) → 联调中 → 已关闭
```

| 状态 | 含义 | 谁推进 |
|------|------|--------|
| 已提报 | 提报到需求池，未指定承接方 | 任一项目任一角色 |
| 评估中 | 项目方评估是否承接 | 各项目 PM / Architect（自主评估）|
| 已承接 | 某项目认领，或 Owner 指派 | 承接方 PM / Architect，或 Owner |
| 已拒绝 | 评估后不接 / 暂无项目承接 | 项目 PM / Architect（写明理由）|
| 开发中 | 已转入承接方项目内部标准迭代 | 承接方项目按各自工作流 |
| 联调中 | 开发完成，跨项目联调 | 相关角色（通常 Developer）|
| 已关闭 | 联调通过 / 需求完成或作废 | — |

### 角色权限

- **提报**：任一项目的**任一角色**都可以提报需求到 `REQUESTS.md`，**不指定承接方**。
- **承接 / 拒绝**：由**目标项目的 PM（产品经理）或 Architect（架构师）**评估认领或拒绝；**Owner 可直接指定**承接项目。其他角色不得代为承接。
- **联调**：承接后由相关角色（通常 Developer）执行。

### 需求提报中心（REQUESTS.md）

`REQUESTS.md` 是跨项目需求池的单一真源。字段建议：

| 字段 | 说明 |
|------|------|
| 需求 id | 稳定短号，如 `REQ-001` |
| 提出方 | 项目·角色 |
| 内容 | 需求一句话 + 必要背景 |
| 状态 | 见需求生命周期 |
| 承接方 | 承接后填（项目 + PM/Architect）；未承接留空 |
| 转入迭代 | 承接方项目 vX.Y（进入开发中后填）|
| 沟通文档 | 承接后指向 `communications/{a}__{b}.md` |

### 与项目内部迭代的衔接

承接后，承接方 PM/Architect 把需求**转换为本项目内部的标准迭代**（按 `multi-agent-workflow.md` 走 PRD → 设计 → 实现 → 测试），由本项目独立开发。`REQUESTS.md` 与 communications 只登记「已转入 {项目} vX.Y」并链接回该项目 `docs/progress/INDEX.md`，**不复制迭代细节**；开发完成后回到 communications 联调。

### 会话边界

与 §角色会话边界 一致，一个会话仍只承担一个项目的一个角色：

- 提报：提出方项目的角色在自己会话里把需求写入 `REQUESTS.md`。
- 承接 / 拒绝：目标项目 PM/Architect 在**目标项目会话**评估并回写；不能在提出方会话里替目标项目承接（Owner 指派除外）。
- 转入迭代后，开发在承接方项目会话内按其工作流进行。

### communications 文档（承接后建立）

需求被承接后，在提出方↔承接方之间建立 `communications/{a}__{b}.md`，承载该组项目**承接之后**的协作与联调：

- 通过需求 id 关联回 `REQUESTS.md`。
- 内容是承接后的接口对接、字段对齐、调试、版本跟进，倒序时间线，条目标注所属需求 id。
- 涉及接口/字段的，契约以 `contracts/` 为单一真源。

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

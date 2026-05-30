# 上下文治理

## 目标

随着迭代和非迭代工作增多，角色日志、Review 记录和 ad-hoc 记录会快速膨胀。上下文治理的目标是：保留历史，但不让 Agent 每次启动都读完整历史。

核心原则：

```text
入口先分流，团队模式读索引，工作读相关，定期做摘要，旧记录归档。
```

## 启动读取层级

普通 Claude Code 模式只读取 `CLAUDE.md` 的模式入口，不读取团队基线。

进入团队模式后只默认读取：

1. `CLAUDE.md`
2. `docs/baseline/runtime.md`
3. `docs/baseline/project-context.md`，如存在
4. `docs/progress/INDEX.md`，如存在
5. 当前角色手册
6. 本角色的 `*-current.md` 或最近摘要
7. 本角色纠错记录

不要默认读取：

- `docs/baseline/multi-agent-workflow.md`
- `docs/baseline/work-modes.md`
- `docs/baseline/mechanisms.md`
- `docs/baseline/knowledge-base.md`
- 所有模板文件
- 所有历史迭代全文
- 所有角色日志全文
- 所有 Review 记录全文
- 整个知识库全文

进入团队模式后按 `docs/baseline/runtime.md` 判断工作模式，再读取对应规则文件。不要为了“保险”把所有 baseline 文件一次性读入上下文。

## 按需加载层级

| 场景 | 加载文件 |
|------|----------|
| 标准迭代 | `multi-agent-workflow.md`、当前迭代记录、本阶段产出物 |
| 非迭代工作 | `work-modes.md`、当前 ad-hoc 记录 |
| 收尾归档 | `mechanisms.md`；达到归档阈值时再读 `context-policy.md` |
| Bootstrap 初始化 | `mechanisms.md`、`bootstrap.md` |
| 知识库沉淀 | `knowledge-base.md`、`docs/knowledge/INDEX.md`、具体知识条目 |
| 创建文档 | 对应 `docs/templates/` 模板 |

## 状态真源

动态状态只能放在 `docs/progress/` 下：

| 状态类型 | 真源文件 | 说明 |
|----------|----------|------|
| 项目级当前状态 | `docs/progress/INDEX.md` | 当前迭代、当前模式、当前下一步入口 |
| 迭代阶段细节 | `docs/progress/iterations/vX.Y.md` | 阶段门禁、Review 轮次、Change Note、关闭归档 |
| 角色最近动作 | `docs/progress/roles/{role}.md` 或 `{role}-current.md` | 角色做了什么、遗留什么 |
| 项目事实 | `docs/baseline/project-context.md` | 项目目标、技术栈、边界、约束；不写当前阶段 |

状态变化时，先更新最具体的真源，再同步上层索引：

1. 阶段或 Review 状态变化，先更新 `docs/progress/iterations/vX.Y.md`。
2. 如果影响当前项目入口，再更新 `docs/progress/INDEX.md`。
3. `project-context.md` 不记录当前阶段，除非项目事实本身发生变化。
4. PRD、设计文档、测试报告头部可以保留状态摘要，但不能替代迭代记录和 INDEX。

## 角色日志分层

角色日志默认使用单文件：

```text
docs/progress/roles/{role}.md
docs/progress/roles/{role}-corrections.md
```

当角色日志超过 30 条或 300 行（见下方归档触发时机），再拆为三层：

```text
docs/progress/roles/{role}-current.md    ← 最近 10 条，启动默认读
docs/progress/roles/{role}-summary.md    ← 长期摘要，启动默认读
docs/progress/roles/{role}-archive.md    ← 旧日志，按需搜索
```

| 文件 | 用途 | 启动是否默认读 |
|------|------|----------------|
| `{role}.md`（默认） | 单文件日志，最新在上 | 是 |
| `{role}-current.md`（分层后） | 最近工作日志，最多保留 10 条 | 是 |
| `{role}-summary.md`（分层后） | 长期摘要、当前关注点、常见风险 | 是 |
| `{role}-archive.md`（分层后） | 旧日志归档 | 否，按需搜索 |

单文件阶段也必须保持”最新在上”，并在超过 30 条后按下方通用归档流程拆分。

## 归档触发时机

以下情况必须执行上下文归档：

- 某角色日志超过 30 条。
- 某迭代 Review 超过 3 轮。
- 单个角色日志文件超过 300 行。
- Agent 启动时需要读取超过 5 个历史文件才能判断状态。
- 用户感觉 Claude Code 变慢、变啰嗦或开始遗忘关键状态。
- 用户要求“今天收尾”“下班”“先停一下”。
- 非迭代工作、Change Note 或标准迭代已经完成。

## 会话收尾最小流程

每次会话结束，不管是否完成一个迭代，都必须做最小收尾：

1. 更新当前角色日志：本次动作、涉及文件、结论、遗留问题、下一步入口。
2. 如果本次会话完成了一个阶段定稿（如设计阶段 Review 通过并改为已定稿），同时更新迭代记录（`vX.Y.md`）中对应阶段状态和 `INDEX.md`。
3. 如果只是阶段性工作（如 Review 进行中、修改中），只更新角色日志，不更新迭代记录。
4. 记录验证证据；如果没有验证，写明原因。
5. 判断是否需要知识库沉淀。
6. 判断是否达到上下文归档阈值。
7. 如果本次有文件变更，提交 Git；如果暂不提交，写明原因和风险。

会话收尾不等于迭代关闭。会话收尾保证”今天到这里”之后下次 Agent 能接得上；迭代关闭是整个迭代完成后的归档操作（见 `mechanisms.md`）。

## 通用归档流程

1. 读取旧日志或旧记录。
2. 提炼到 `{role}-summary.md`：
   - 当前稳定事实
   - 常见错误
   - 未关闭风险
   - 可复用经验
   - 关联知识库条目
3. 将旧日志移入 `{role}-archive.md` 或 `docs/progress/archive/`。
4. 保留最近 10 条在 `{role}-current.md`。
5. 如果有长期价值，提炼进 `docs/knowledge/`，不要只留在日志里。

## 迭代关闭归档

每个迭代关闭后，应生成一个短摘要：

```text
docs/progress/iterations/vX.Y-summary.md
```

摘要包含：

- 做了什么
- 关键决策
- 关键问题
- 遗留项
- 知识库链接
- 后续机会

后续 Agent 默认读 summary，不读完整 PRD、设计、Review 记录，除非任务需要。

迭代关闭归档还必须检查：

- 阶段门禁是否全部为已定稿、已跳过、已延期或已关闭。
- Change Note 是否已归档、已废弃或已转入下一迭代。
- 遗留问题是否有明确归属和下一步。
- 关键知识是否已经进入 `docs/knowledge/` 或写明不沉淀原因。
- `docs/progress/INDEX.md` 是否能表达当前项目状态。

## 非迭代工作归档

非迭代工作完成后，归档位置仍然是 `docs/progress/ad-hoc/`。不要把非迭代工作硬塞进迭代记录。

归档时必须写清：

- 最终状态：已完成 / 已中止 / 升级为标准迭代。
- 执行角色和涉及文件。
- 验证证据或未验证原因。
- 是否需要后续角色介入。
- 是否需要进入知识库。
- 如果升级为标准迭代，建议版本号和建议由 PM（产品经理）创建 PRD。

## Change Note 归档

Change Note 归档时必须同时完成四件事：

1. Change Note 自身状态更新为 `已归档`，或标记为 `已废弃` / `升级为重大变更`。
2. 迭代记录或 ad-hoc 记录中登记该 Change Note 的状态和结论。
3. 如果修改了已定稿文档，该文档必须保留 Change Note 引用或变更记录。
4. 对应角色日志写明确认、执行和验证结果。

如果 Change Note 产生了可复用经验，例如某类接口边界、测试缺陷、部署风险，应提炼到知识库。

## 知识库读取治理

知识库是长期资产，不是启动上下文。

Agent 使用知识库时应：

- 先读 `docs/knowledge/INDEX.md`
- 再读相关领域索引或具体条目
- 不全文扫描整个 `docs/knowledge/`
- 用关键词检索而不是盲读

## 不允许做的事

- 不允许把所有历史日志塞进 `CLAUDE.md`。
- 不允许让 Agent 每次启动读完整 `docs/progress/`。
- 不允许把流水账当知识库。
- 不允许为了省上下文删除历史，只能归档和摘要。
- 不允许把密钥、Token、Cookie 写入摘要或知识库。

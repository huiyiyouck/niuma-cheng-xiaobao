# 代码与协作规范

> **迁移说明（2026-05-30）：** 本文件中的工作流规则（状态管理、Review 流程、基线修正等）已升级为多角色协作 v1.0 基线，详见 `docs/baseline/multi-agent-workflow.md`、`docs/baseline/mechanisms.md`。本文件保留项目特有的 Git 规范和 commit 约定，这些内容在新基线中没有覆盖。
>
> 最后更新：2026-05-23
> 维护者：架构师

## 代码规范

### Python
- 遵循 PEP 8
- 异步代码使用 `async/await`，数据库操作用 SQLAlchemy async（API 层）或 asyncpg（Worker 层）
- 类型注解：关键函数参数和返回值使用 type hints

### TypeScript / Vue
- Vue 3 Composition API + `<script setup lang="ts">`
- 组件命名：PascalCase，文件名匹配组件名

### 通用
- 注释和沟通使用中文

## Git 规范

### 工作流（每次会话）
> 与当前客户端入口文件中的启动必做 + 设计文档第 6.3 节保持一致。此处为完整版。

```
开始：
  1. git pull --rebase
  2. git log --oneline -10  检查 [角色] 标记
  3. 确认无冲突或未推送的他人修改

结束：
  1. git add 修改的文件
  2. git commit -m "[角色] 动作摘要"
  3. git pull --rebase（再次确认无冲突）
  4. git push
```

### 冲突处理
- 若 pull --rebase 出现冲突，不要强制解决
- 检查冲突文件的当前状态，以远程最新版本为准
- 将自己的修改重新应用到最新版本之上

#### 并行 Review 冲突场景（常见）
两个 Review 方并行审同一文档时，可能在同一文件上产生冲突。因为双方改的是不同位置（各自的状态列 + 各自的 Review 章节），冲突通常很容易解决：

**门禁表行冲突**：两个 Review 方修改了同一行的不同列。解决方式——手动保留双方的状态修改，合并为一行：
```
<<<<<<< HEAD
| R1 | 开发提交 | ❌需修改 | ⏳ | Review中 |
=======
| R1 | 开发提交 | ⏳ | ✅通过 | Review中 |
>>>>>>>
```
→ 合并为：`| R1 | 开发提交 | ❌需修改 | ✅通过 | Review中 |`

**文件末尾追加冲突**：两个 Review 方都在文件末尾追加了 Review 章节。解决方式——两个章节都保留（顺序任意），之间用空行分隔即可。

## Commit Message 格式

### 常规提交
`type(scope): description`

示例：
- `feat(worker): add X/Twitter fetcher`
- `fix(api): correct sub-channel cascade delete`
- `docs: update README`

### 多 Agent 协作标记
`[角色] 动作 — 详情`（用于 Agent 之间传递协作信号）

**角色标识**：PM、Architect、Developer、Tester、DevOps、UI

**动作关键词**：待Review、Reviewed、已定稿、会话记录

示例：
```
[PM] v0.2 PRD 待Review              ← 产出通知，等待 Review
[Architect] Reviewed v0.2 PRD R1     ← Review 完成，注明轮次
[PM] v0.2 PRD R2 待Review           ← 修改后重新提交，新轮次
[PM] v0.2 PRD 已定稿                 ← 阶段定稿
[PM] 会话记录 — 修改 PRD R2          ← 角色日志提交
```

## 禁止事项
- 禁止 force push
- 禁止跳过 Git hooks（--no-verify）
- 禁止直接修改他人角色日志
- 禁止在 Review 阶段修改产出文档正文（只能追加 Review 章节）
- 禁止未经人工审核修改 baseline/ 任何文件
- 禁止跳过「受保护路径删除 Review 门禁」直接删除受保护路径下的文件（见下方章节）

## 受保护路径删除 Review 门禁

### 背景
2026-05-30 一次基线同步 commit（`5500ac2`）把生产源码 `server/` 整目录 + `deploy/systemd/news-api.service` + 7 个前端组件一起删掉，commit 信息严重不匹配 diff stat；后续 commit 又把 `.gitignore` 中保护 `server/node_modules/` 的规则删除，掩盖问题。生产源码在磁盘和 GitHub 同时丢失，靠 Linux unlink-while-open 维持 17 小时未被察觉。

事故根因是「Agent 自决直接删受保护路径，无第二角色把关」。本门禁把删除从「事后核对」变成「事前 Review 门禁」。

### 受保护路径名单
- `server/`
- `frontend/src/`
- `deploy/`
- `docs/baseline/`
- `docs/templates/`
- `CLAUDE.md`
- `AGENTS.md`

### 主门禁流程
1. **停止删除**：Agent 不得直接执行 `git rm`、`rm`、`Edit` 删除文件内容、或在 commit 中产生删除变更。
2. **列出清单**：在会话中给出
   - 待删文件完整路径列表
   - 每个文件的删除原因（一行）
   - `git log -1 --format='%h %s' -- <文件>` 简要说明该文件最近一次变更
3. **指定架构师 Review**：明确请求"由架构师角色 Review 本删除清单"。**Review 必须以 Architect 角色身份显式进行**（用户说"你是 Architect"或"切换到架构师"触发角色切换），不允许当前角色 Agent 自称"以架构师视角看一下"自审。
4. **架构师 Review 输出**：架构师必须给出
   - ✅通过 / ❌驳回 / ⚠️有条件通过（注明条件）
   - 驳回或有条件通过时，列出风险点
5. **执行删除**：仅在架构师 ✅通过后，原角色 Agent 才执行删除并 commit。
6. **commit 留痕**：commit message body 必须包含
   ```
   删除清单：
     - <path1>（原因）
     - <path2>（原因）
   Review：架构师 ✅通过（会话时间 / 关联角色日志条目）
   ```

### 配套规则

#### commit message 规范
受保护路径的删除 commit，标题第一行必须包含「删除」「移除」「清理」等明示字样；禁止用「同步」「对齐」「整理」等模糊动词遮蔽删除事实。

#### 协作 commit 二次核对
由 AI Agent 生成或标注 `Co-Authored-By` 的 commit（无论是否涉及删除），push 前 Agent 必须把 `git diff --stat` 输出贴进会话；如果 stat 与 commit message 描述范围不一致，停下等 Owner 决策。

### 例外情况
- **架构师自身需要删除受保护路径文件**：架构师不能自审。此时必须由 Owner 直接 Review（不能切换到其他 Agent 角色代替）。
- **删除单个文件且属于本会话刚创建的临时文件**：可豁免（避免新建废稿走 Review 的繁琐）。
- **已在标准迭代记录、Change Note、Bugfix/Incident ad-hoc 中明确登记"将删除 X 文件"的删除**：可在执行删除时引用该记录路径，跳过架构师 Review；但 commit message 仍需含「删除」字样和记录路径。

## 基线修正流程

baseline/ 是项目宪法，不能由任何单一角色单方面修改。修正流程：

1. 任何角色发现问题 → 在角色日志"遗留问题/风险"中记 `[基线修正提案] 问题描述 — 建议方案`
2. WM（工作流管理者）启动流程审计或基线修正时，收集未处理的 `[基线修正提案]`
3. WM 或 Owner 指定的角色起草具体修改方案，提交人工审核
4. **人工审核通过后**，被指定角色才能修改 baseline/ 正文并 commit
5. commit 标记建议使用 `[WM] 基线修正 — 原因描述`，若 Owner 指定其他角色执行，则使用对应角色标记

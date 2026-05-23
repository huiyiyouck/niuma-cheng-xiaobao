# 代码与协作规范

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
> 与 CLAUDE.md 启动必做 + 设计文档第 6.3 节保持一致。此处为完整版。

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

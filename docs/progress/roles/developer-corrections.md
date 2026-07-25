# 全栈开发 纠错记录

> 本角色发现错误后可追加。保持 30 条以内，超出时删除最旧条目。
> 每次 Agent 启动时读取本文件，避免重复犯错。

## 2026-07-25 — v0.6.1 实现 R3 只指定 PM 单方验收，违反 ≥2 Review 方门禁
- 现象：补实现前端展示层（实现 R3）后，迭代记录轮次只指定 PM 单方「对照 PRD §5.10 验收」，未沿用本迭代实现 R1/R2 的 PM/Architect/DevOps 三方 Review；违反 P1 红线「标准迭代核心产出默认 ≥2 个 Review 方，少于 2 须用户确认」。由 Owner 指出后订正。
- 修正：R3 Review 方订正为 PM / Architect / DevOps 三方；流程订正为三方 Review → DevOps 部署 → PM 迭代关闭检查收尾。
- 预防：
  1. **实现阶段每轮登记轮次时，Review 方默认沿用本迭代上一轮的 Review 方清单**——上一轮是三方就登记三方
  2. **想缩减 Review 方必须先获 Owner 确认**，不得因"本轮改动小/是补遗留"自行降级为单方验收
  3. 「PM 发现的遗留」不等于「只需 PM 验收」：发现方 ≠ 唯一 Review 方

## 2026-05-31 — 基线同步 commit 误删生产源码 server/
- 现象：以 Developer 角色顺手做了"从 claude-code-one-person-company-workflow 同步基线"操作，commit `5500ac2` 标题为「同步 CLAUDE.md 三层分流机制」，实际 diff 含 48 文件 -7076 行，把 `server/` 整目录（38 个 Node.js 后端源码）+ `deploy/systemd/news-api.service` + 7 个前端组件一起删掉；后续 commit `70a1b19` 又把 `.gitignore` 中保护 `server/node_modules/` 的规则删除，掩盖问题。生产源码在磁盘和 GitHub 同时丢失，靠 Linux unlink-while-open 维持 17 小时未被察觉，任何重启都会导致后端宕机。详见 [Incident 2026-05-31](../ad-hoc/2026-05-31-incident-server-source-deleted-by-baseline-sync.md)。
- 修正：从本地 git 历史 `5500ac2^` 恢复 server/ 38 文件 + deploy/systemd/news-api.service；`npx tsc --noEmit` 零错误；重启后端 + 健康检查通过；commit `ec8073e` 推送 GitHub。
- 预防：
  1. **不越界做基线同步**——「同步基线 / 同步工作流 / 基线对齐」属于 WM 职责，Developer 不要"顺手做"
  2. **commit 前必看 diff stat**——`Co-Authored-By: Claude` 的 commit 在 push 前必须把 `git diff --stat` 输出贴进会话核对；范围不对停下来等 Owner
  3. **commit message 不能用模糊动词遮蔽删除**——"同步"、"对齐"、"整理"不能掩盖大规模删除；删除必须明示「删除」「移除」「清理」字样
  4. **受保护路径删除门禁已生效**（commit `dfede2b` 落地）——`server/`、`frontend/src/`、`deploy/`、`docs/baseline/`、`docs/templates/`、`CLAUDE.md` 下的任何删除必须先切换到 Architect 角色 Review 通过；不要再用 git rm/rm 直接删

## 2026-05-31 — 前后端契约：v0.3 砍后端 WS 后前端 ws.ts 残留 5 个月
- 现象：v0.3 后端砍 WebSocket，但前端 `ws.ts` / `WSStatus` / `WS_BASE_URL` / `useWS` 调用没同步删除，残留到 2026-05-31 v0.4 视觉验证时才被发现（控制台 WebSocket failed 持续刷错）。流程死角：子 Agent 调度策略只覆盖当轮并行开发的契约一致性，没覆盖跨迭代场景。
- 修正：删除前端 ws.ts + WS_BASE_URL + WSStatus + useWS 调用 + NewsPage 状态指示条（commit `e736980`）。
- 预防：
  1. **后端砍能力时必须同时跑前端引用扫描**——删除/弃用任何后端 API 端点、WS channel、字段、事件时，必须在同 commit（或紧邻 commit）内 `grep` 该端点/事件/字段在 `frontend/src/` 的引用；引用为零 → commit message 注明「前端已无引用，已核对」；引用非零 → 同步删除前端调用代码或登记 P1 残留清理待办
  2. **前端弃用调用时必须反查后端**——删除前端某个 API 调用/订阅时，commit message 注明后端是否仍在提供
  3. **自检清单已加 3 项**（commit `dfede2b` 落地）——提交 Review 前必逐项确认本轮是否有后端能力删除 + 前端引用是否为零

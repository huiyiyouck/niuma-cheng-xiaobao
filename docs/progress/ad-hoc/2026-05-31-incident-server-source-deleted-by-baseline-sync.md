# Incident — Node.js 后端源码被基线同步 commit 误删

## 基本信息
- 日期：2026-05-31
- 模式：Incident（故障处理）
- 执行角色：Developer（开发工程师）
- 严重等级：高（生产源码在磁盘和 GitHub 上同时丢失，仅靠正在运行进程的内存副本维持线上服务）
- 是否进入迭代：否（v0.4 已部署完毕，此为独立故障处置）
- 关联迭代：v0.4 部署后
- 当前状态：源码已从本地 Git 历史恢复至工作区并暂存（未提交、未重启服务）
- 是否升级为标准迭代：否；事后建议在基线层面增加保护机制（详见 §6）

## 1. 时间线

| 时间 | 事件 |
|------|------|
| 2026-05-27 | v0.3 完成 Node.js 全栈迁移，`server/` 目录及 38 个源码文件全部提交（commit 见 v0.3 实现 R1） |
| 2026-05-30 17:28 | 当前运行中的 Node 后端进程 PID 3787459 启动（`tsx src/index.ts`） |
| 2026-05-30 20:04 | commit `5500ac2` 提交，commit 信息为「同步: CLAUDE.md 团队模式触发升级为三层分流机制」，**实际变更包含 48 文件 -7076 行**，把 `server/` 整个目录（38 文件）+ `deploy/systemd/news-api.service` + 7 个已废弃的前端组件一起删掉 |
| 2026-05-30 20:06 | commit `70a1b19` 提交，commit 信息为「同步: 工作流基线文件全面对齐」，同时把 `.gitignore` 里的 `server/node_modules/`、`server/dist/` 规则一并删除，掩盖了 `server/` 已不存在的事实 |
| 2026-05-30 20:06 之后 | 两个 commit 推送到 `origin/main`，GitHub 上 Node.js 后端源码同步丢失 |
| 2026-05-31 12:50 | 用户提问"前后端是否都是 Node.js / 本地与 GitHub 是否一致 / `server/` 是否在用" |
| 2026-05-31 12:55 | Developer 排查发现：`server/` 源码已不在磁盘也不在 GitHub，但 PID 3787459 仍在 8000 端口提供服务（Linux unlink-while-open 特性：文件被删，已加载的进程仍能继续运行） |
| 2026-05-31 13:10 | 从本地 Git 历史 `5500ac2^` 恢复 `server/` + `deploy/systemd/` 至工作区，`npx tsc --noEmit` 零错误，正在运行的进程未受影响 |

## 2. 影响范围

| 维度 | 影响 |
|------|------|
| 当前线上服务 | 未中断；`https://news.huiyiyou.cloud/` HTTP 200，API `/v1/*` 通过 nginx 反代到 `127.0.0.1:8000` 正常 |
| 风险窗口 | **任何重启都会导致后端彻底宕机**（reboot / OOM / 误 kill / systemd 重启）。源码唯一副本仅存在于 PID 3787459 的内存中，恢复完成前不可被回收 |
| Git 仓库 | 本地 `.git/objects` 中 blob 完整保留；GitHub `origin/main` 缺失 |
| 数据 | 无数据丢失，无脏数据 |
| 用户感知 | 截至发现时无用户感知 |

## 3. 根因

误删 commit `5500ac2` 的 commit 信息与实际变更严重不匹配，原因疑似在执行"从 `claude-code-one-person-company-workflow` 同步基线"时，把模板仓库中不存在的 `server/` 目录当作"应该清理"的内容一起删除。后续 commit `70a1b19` 又把 `.gitignore` 中保护 `server/node_modules/` 的规则删掉，进一步遮蔽了问题。

两个 commit 都标注了 `Co-Authored-By: Claude Opus 4.7`，属于 Agent 协作产物，但 Developer 未在提交前核对 `git diff --stat` 与 commit message 是否一致，也未做"基线同步只能影响 `docs/baseline/`、`docs/templates/`、`CLAUDE.md`"的范围检查。

## 4. 已采取的处置（截至本记录）

1. **源码恢复（无侵入）**：`git checkout 5500ac2^ -- server/ deploy/`，恢复 38 个 server 源码文件 + `deploy/systemd/news-api.service`，已 `git add` 暂存
2. **完整性验证**：`cd server && npx tsc --noEmit` 零错误；现存 `server/node_modules/` 与恢复出的 `server/package.json` 版本一致，无需重装
3. **前端废弃组件确认**：被同 commit 删除的 7 个前端组件（AlertList/BindSourceModal/ChannelCard/EditChannelModal/LogViewer/SourceManager/SpaceSelector）经 `grep` 现存代码无任何引用，确为 v0.4 UI 重构后真废弃，不予恢复
4. **运行进程保护**：未 kill PID 3787459；未触发任何重启
5. **记录本 Incident**

## 5. 后续动作

| 顺序 | 动作 | 状态 |
|------|------|------|
| 1 | 提交本 ad-hoc 记录 + 恢复的 server/ 与 deploy/ 文件，commit 标题明确写"恢复：上一次基线同步误删 server/ 与 deploy/" | 待执行 |
| 2 | `git pull --rebase && git push` 推送到 GitHub，确保 GitHub 也有源码副本 | 待执行 |
| 3 | kill PID 3787459，在恢复出的 `server/` 目录下重新启动后端（按 `server/start.sh` 或 `npx tsx src/index.ts`） | 待执行 |
| 4 | 健康检查：`curl http://127.0.0.1:8000/health` 200、`curl https://news.huiyiyou.cloud/v1/health` 200、前端页面可访问 | 待执行 |
| 5 | 把 `server/node_modules/`、`server/dist/` 加回 `.gitignore` | 待执行 |
| 6 | 更新 Developer 角色日志 | 待执行 |

## 6. 长期改进建议（待 PM/WM/Owner 决定）

1. **基线同步前置检查**：任何标注"同步基线 / 同步工作流"的 commit，禁止改动 `docs/baseline/`、`docs/templates/`、`CLAUDE.md`、`.claude/` 以外的路径；如需改动应拆为独立 commit
2. **大变更阻断**：单次 commit 删除超过 N 行（例如 1000 行）或删除超过 M 个文件（例如 10 个）时，触发 pre-commit hook 弹出确认或要求 commit 信息显式包含"删除"字样
3. **生产源码守护**：把 `server/` 和 `frontend/src/` 列入"受保护路径"，删除需走 Change Note 或显式 Bugfix/Incident 记录
4. **协作 commit 二次核对**：Agent 生成的 commit 在 push 前必须人工或第二个 Agent 核对 `git diff --stat` 与 commit message 是否一致

## 7. 经验沉淀

如本 Incident 形成可复用经验，提炼至 `docs/knowledge/engineering/`：
- 候选标题：「Agent 协作 commit 的范围核对清单」
- 候选标题：「Node.js 进程 unlink-while-open 的应急恢复套路」

## 8. 关联资料

- 误删 commit：`5500ac2` 「同步: CLAUDE.md 团队模式触发升级为三层分流机制」
- 关联 commit：`70a1b19` 「同步: 工作流基线文件全面对齐」
- 误删前最后一个良好 commit：`5500ac2^`（即 `c268fb9` 之前的状态恢复使用）
- v0.4 部署状态：`docs/progress/INDEX.md`
- 角色日志：`docs/progress/roles/developer.md`

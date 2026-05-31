# Node.js 进程 unlink-while-open 应急恢复套路

## 元信息
- 类型：Engineering
- 来源：[Incident 2026-05-31 server-source-deleted-by-baseline-sync](../../progress/ad-hoc/2026-05-31-incident-server-source-deleted-by-baseline-sync.md)
- 创建日期：2026-05-31
- 相关角色：Developer、DevOps
- 相关迭代/任务：v0.4 部署后 Incident

## 内容摘要

Linux 文件被 unlink 后，已经打开它的进程仍可正常运行——内核保留 inode 直到最后一个引用关闭。Node.js 用 `tsx` 直接执行 `.ts` 时，源代码已被加载进 V8 引擎；即使磁盘上的源文件被 `git checkout` 或 `rm` 删除，**进程不会立即崩溃，会继续提供服务直到自身退出**。

这是一个**双刃**特性：
- 利：源码意外丢失（误删 commit、误 rm）后服务不会立刻挂，给救援留窗口
- 弊：会掩盖"代码已不存在"的事实，让监控/健康检查仍然显示绿灯，但**任何重启（reboot / OOM / systemd restart / 手动 kill）都会让服务彻底宕**

## 应急判断与恢复步骤

发现"代码在磁盘上没了但服务还在跑"时：

1. **立即冻结**——禁止 reboot、禁止 kill、禁止任何 service restart 操作；进程的内存副本是当前唯一可用源
2. **诊断现状**：
   ```bash
   ps -fp <PID>                   # 确认进程是否还活着
   ls -la /proc/<PID>/cwd         # 确认工作目录
   ls -la /proc/<PID>/fd          # 看看打开了哪些文件
   curl http://127.0.0.1:<port>/health   # 业务是否还正常响应
   ```
3. **首选恢复路径：从 Git 历史 checkout 回来**（无侵入，不动进程）：
   ```bash
   git log --all --diff-filter=D --pretty=format:'%h %s' -- '<path>/*'   # 找误删 commit
   git checkout <commit>^ -- <path>/    # 从误删前一个 commit 恢复
   ```
4. **验证恢复出的代码可用**：编译检查（`tsc --noEmit`）、依赖核对（`node_modules` 与 `package.json` 版本是否对得上）
5. **commit + push GitHub**——这一步必须在重启前完成，让 GitHub 也有源码副本
6. **才能重启服务**：用恢复出的代码起新进程，老进程自动让位（端口冲突 → start.sh kill 老 PID）
7. **健康检查**：本机端点 + 公网端点 + 业务真实请求

## 应急判断与恢复步骤（备用：内存抢救）

如果 Git 历史里也没有源码（罕见，比如本地仓库损坏 + 远端也丢失），仍可以从运行中进程内存里抢救：

```bash
gdb -p <PID>
(gdb) gcore /tmp/core.dump   # 转储进程内存
# 然后用 strings + 模式匹配从 core 里捞出 .ts 源代码字符串
```

`tsx` 通过 esbuild 转译 `.ts`，源代码会以字符串形式留在 V8 堆里。这条路成本高、不完美，但当 Git 都救不了时是兜底。

## 适用场景

- Node.js / Python / Ruby 等**解释型或 JIT 语言**的进程，且源码以文件形式被加载（不是已经编译成单一二进制）
- 当前发现源码丢失（磁盘上没了 / Git 仓库里也没了 / 误删 commit 已 push）
- 进程仍然存活，监控显示业务正常
- 需要在不影响业务可用性的前提下恢复源码

## 不适用场景

- 编译型语言部署成**单一二进制**（Go 静态编译、Rust release build）——二进制本身就在 `/proc/<PID>/exe`，直接 `cp /proc/<PID>/exe /tmp/recovered` 就能拿回完整可执行文件，不需要这套套路
- 进程已经退出——窗口已关，只能走 Git/备份恢复
- 容器化部署——容器重启就完蛋，且容器内不一定有 Git 仓库

## 关键陷阱

1. **不要相信 health check 绿灯**：进程还活只是说"已加载到内存的代码还在跑"，不代表代码文件还在；新功能、热重载、子进程派生都会立刻失败
2. **不要先 stop 再修**：传统直觉是"先停服务避免脏数据"，但本场景下停了就回不来
3. **`/proc/<PID>/fd` 不一定能直接读出源码**：tsx 不会把 .ts 文件以 fd 形式长期持有，源码是被加载进 V8 后 close 的——所以"从 fd 抢救"通常不起作用，要么 Git 历史要么 gdb gcore

## 证据/链接

- 实战案例：commit `5500ac2` 在 2026-05-30 误删 server/ 38 文件 + deploy/systemd 服务单元，进程 PID 3787459 靠这个特性连续运行约 17 小时直到 2026-05-31 13:10 由 Developer 完成 Git 恢复 + 重启
- 恢复 commit：`ec8073e`
- Incident 完整记录：[2026-05-31 server-source-deleted-by-baseline-sync.md](../../progress/ad-hoc/2026-05-31-incident-server-source-deleted-by-baseline-sync.md)

## 后续动作

- 后端 Node 已切换为 systemd 管理（commit `a64bdff`）后，崩溃自动重启变成了**风险**而非保护——一旦内存里的 tsx 进程被 systemd OOM kill 或 restart，将再无源码可加载。降低概率的关键在「源码不可丢」而非"进程不可重启"
- 已在 baseline 落地配套保护机制（commit `dfede2b`）：受保护路径删除前必须走 Review 门禁，从源头降低本类 Incident 复发概率

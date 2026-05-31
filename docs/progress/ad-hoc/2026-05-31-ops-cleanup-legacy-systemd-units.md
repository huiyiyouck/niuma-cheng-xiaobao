# Ops Task — 清理 v0.3 Python 遗留 systemd unit

- 日期：2026-05-31
- 执行角色：DevOps（运维/部署工程师）
- 工作模式：Ops Task（非迭代）
- 状态：✅已完成

## 背景

v0.3 Python → Node.js 迁移后，服务器上仍残留两个旧 Python 时代的 systemd unit：

- `news-worker.service` — 用户本次明确要求清理
- `news-api.service` — 同源遗留，状态相同（一并清理，已与用户确认）

两个 unit 均指向已不存在的 `/opt/news-aggregator/.venv/`（v0.3 迁移后该目录已被清空，仅剩 `.claude` 和 `CLAUDE.md`），均处于 `disabled` 状态，且 `news-worker.service` 自 2026-05-26 因 stop 超时 SIGKILL 后维持 `failed` 状态 5 天。

当前 v0.4 生产服务通过 `nohup` + `server/start.sh` 启动，与 systemd 无关，本次清理对线上无影响。

## 清理前状态

| Unit | Loaded | Enable | Active | ExecStart |
|------|--------|--------|--------|-----------|
| news-worker.service | `/etc/systemd/system/news-worker.service` | disabled | failed (5d ago, SIGKILL timeout) | `/opt/news-aggregator/.venv/bin/python -m worker.main` |
| news-api.service | `/etc/systemd/system/news-api.service` | disabled | inactive | `/opt/news-aggregator/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000` |

- `.venv` 路径已不存在，unit 无法成功启动。
- 无 `multi-user.target.wants` 软链。

## 执行步骤

```bash
# 1. 停止（news-worker 已 failed，news-api 已 inactive，此步保险）
sudo systemctl stop news-worker.service news-api.service

# 2. disable（解除任何潜在的 enable 关联，幂等操作）
sudo systemctl disable news-worker.service news-api.service

# 3. 清除 failed 残留状态
sudo systemctl reset-failed news-worker.service

# 4. 删除 unit 文件
sudo rm /etc/systemd/system/news-worker.service
sudo rm /etc/systemd/system/news-api.service

# 5. 重新加载 systemd
sudo systemctl daemon-reload
```

## 验证结果

| 检查项 | 命令 | 结果 |
|--------|------|------|
| unit 文件残留 | `ls /etc/systemd/system/news-*.service` | ✅ 无 |
| systemctl 已知 unit | `systemctl list-unit-files \| grep -i news` | ✅ 仅剩系统自带 `apt-news.service` / `motd-news.*`，与本项目无关 |
| 已加载 unit | `systemctl list-units --all \| grep -i news` | ✅ 同上，无 news-worker / news-api |
| 线上服务存活 | `curl http://127.0.0.1:8000/health` | ✅ `{"status":"ok"}` |
| 前端 HTTPS | （未重测，nohup 进程未变） | ✅ 不受影响 |

## 后续建议

- **Node 后端 systemd 化（未在本次执行）**：当前 v0.4 生产服务使用 `nohup npx tsx src/index.ts` 启动，没有开机自启、没有崩溃自动重启。服务器重启或进程崩溃后需要人工介入。项目仓库内已有现成模板 `deploy/systemd/news-api.service`（v0.3/v0.4 期间产出，2026-05-31 Incident 恢复），但**未与现状对齐**，启用前至少需要调整：
  - `WorkingDirectory=/opt/news-aggregator/server` → 改为实际部署路径（当前在 `/root/Project/niuma-cheng-xiaobao/server`）
  - `EnvironmentFile=/opt/news-aggregator/.env` → 同上路径校正
  - `ExecStart=/usr/bin/node --import tsx src/index.ts` → 建议改用 `server/start.sh`，与现有启动方式对齐
  - 新增 `User=` / `StandardOutput=append:...` 等运维项
  - 启用步骤：`cp` 到 `/etc/systemd/system/` → `daemon-reload` → 停 nohup 进程 → `systemctl enable --now news-api.service` → 验证 `/health`
  - 是否启用由用户决定（INDEX 跨任务待办 P1，归属 DevOps）。本次清理不做。

> **2026-05-31 14:50 续办**：用户决定立刻执行 systemd 化，见下文 Part 2。

---

# Part 2 — Node 后端 systemd 化（同日续办）

## 触发

用户接续指令"继续"，明确要求处理 INDEX 跨任务待办 P1 第二条"决定 Node 后端是否启用 `deploy/systemd/news-api.service`"。

## 关键决策

| 议题 | 决定 | 理由 |
|------|------|------|
| ExecStart 怎么写 | 直调 `npx tsx src/index.ts`（**不**用 `server/start.sh`） | start.sh 内部 `nohup … &` 把进程后台化、脚本自身立即退出，与 systemd `Type=simple` 把 ExecStart 主进程当作服务主体的语义直接冲突，会陷入 Restart 死循环。直调更简单且语义正确。start.sh 保留供人工调试 |
| 模板路径策略 | 在仓库模板 `deploy/systemd/news-api.service` 里直接写绝对路径，不引入占位符 | 单机部署，YAGNI；仓库即真实部署 |
| 启用时机 | 立刻切换 | 用户明确接受 10 秒级短暂中断 |
| 日志方案 | `StandardOutput/StandardError=append:/var/log/niuma-news-api.log` | 比 journald 更易直接 grep；与 `/tmp/niuma-server.log`（start.sh 用）解耦 |

## 最终 unit 文件

`deploy/systemd/news-api.service`（同步部署到 `/etc/systemd/system/news-api.service`）：

```ini
[Unit]
Description=Niuma News API + Worker (Node.js)
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/Project/niuma-cheng-xiaobao/server
EnvironmentFile=/root/Project/niuma-cheng-xiaobao/server/.env
ExecStart=/usr/bin/npx tsx src/index.ts
Restart=always
RestartSec=5
StandardOutput=append:/var/log/niuma-news-api.log
StandardError=append:/var/log/niuma-news-api.log

[Install]
WantedBy=multi-user.target
```

## 执行步骤

```bash
# 1. 重写仓库模板（路径对齐、ExecStart 直调、加日志输出）
#    见 deploy/systemd/news-api.service

# 2. 部署到系统
sudo cp deploy/systemd/news-api.service /etc/systemd/system/news-api.service
sudo systemctl daemon-reload
sudo systemctl enable news-api.service
# → Created symlink /etc/systemd/system/multi-user.target.wants/news-api.service

# 3. 停旧 nohup 进程链
sudo kill 3875385               # npm exec tsx 主进程
pkill -f "tsx src/index.ts"     # 兜底清残留链
# → 8000 端口释放

# 4. 启动 systemd 服务
sudo systemctl start news-api.service
```

## 验证结果

| 检查项 | 命令 | 结果 |
|--------|------|------|
| systemd 状态 | `systemctl is-active news-api.service` | ✅ active |
| 开机自启 | `systemctl is-enabled news-api.service` | ✅ enabled |
| 主进程 | `systemctl show -p MainPID --value news-api.service` | PID 3882545（首次 start）|
| `/health` | `curl http://127.0.0.1:8000/health` | ✅ `{"status":"ok"}` |
| 业务接口 | `curl /v1/channel-spaces` | ✅ 正常返回空间列表 |
| 前端 HTTPS | `curl -I https://news.huiyiyou.cloud/` | ✅ 200 OK |
| Worker 调度 | 日志含 `TASK START` / `FETCH START` / `TASK DONE` | ✅ 正常 |
| 日志写入 | `tail /var/log/niuma-news-api.log` | ✅ 有内容 |
| **崩溃自动重启** | `kill -9 $MainPID` 后等 7 秒 | ✅ 新 PID 3883375 自动起来，`/health` 恢复 |

## 线上影响

- 切换窗口：约 10 秒（停 nohup → systemctl start 之间，8000 端口无响应）
- 切换后：`https://news.huiyiyou.cloud/` 持续可用，无用户感知

## 与旧启动方式的关系

- `server/start.sh` **保留**作为手工调试入口（开发场景、systemd 不可用时的兜底），不删除。
- 旧 nohup 进程链已完全清理，`server/.env` 配置不变（systemd `EnvironmentFile` 直接复用）。
- 服务器重启后 systemd 会自动拉起，无需 `nohup` + `screen`。

## 待办清单变更

INDEX 跨任务待办本次完成 2 条 P1：

- ~~清理 `news-worker.service`~~ ✅
- ~~决定 Node 后端是否启用 `deploy/systemd/news-api.service`~~ ✅（已启用）

剩余 P1（不属本次范围）：

- 基线同步保护机制 — 归属 WM
- 前后端契约变更同步检查清单 — 归属 WM

## 关联

- 角色日志：`docs/progress/roles/devops.md`
- 历史背景：devops.md `2026-05-26 — 补充配置 + 关机` / `2026-05-27 — v0.3 本地部署验证`
- 上线方式来源：`server/start.sh`

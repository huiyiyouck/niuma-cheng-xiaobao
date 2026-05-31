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

## 关联

- 角色日志：`docs/progress/roles/devops.md`
- 历史背景：devops.md `2026-05-26 — 补充配置 + 关机` / `2026-05-27 — v0.3 本地部署验证`
- 上线方式来源：`server/start.sh`

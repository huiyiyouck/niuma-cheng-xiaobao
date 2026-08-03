# DevOps（运维）纠错记录

> 本角色发现错误后可追加。保持 30 条以内，超出时删除最旧条目。
> 每次 Agent 启动时读取本文件，避免重复犯错。

---

## 2026-05-24 — 越界修复代码
- **问题**：发现 Worker bug 后直接尝试 Edit 修复代码
- **纠正**：DevOps 只做部署验证和问题报告，不修改业务代码。发现 bug → 记录到部署报告 + 通知开发修复

## 2026-08-03 — 重试循环包裹改状态命令触发 start-limit
- **问题**：SSH 抖动期用 `for i in seq…; do ssh "…systemctl restart…" && break; done` 重试整串命令——第一次实际已执行但连接掉了无回显，循环把 restart 重跑 3 次，触发 systemd `StartLimitBurst` → 服务 `start-limit-hit` 拒启（生产短暂不可用，`reset-failed` 恢复）
- **纠正**：**重试循环只准包裹幂等只读命令**；改状态命令（restart/UPDATE/部署）单次执行，失败后先实查现场状态再决定是否重试。批量 UPDATE 前先 SELECT count 预检命中行数（同日 seed 过量事故同源教训）

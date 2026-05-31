# DevOps 工作日志

## 2026-05-31 — Step 3: drizzle 迁移机制部署侧落地 ✅完成

- 本次角色：DevOps（运维/部署工程师）
- 工作模式：执行 [ADR-001](../../baseline/architecture.md#adr-001drizzle-迁移机制选型) Step 3 + Architect Review R2 的配套要求
- 前置：Developer Step 2 完成（commit `9b96a58`）+ Architect Review R2 通过（commit `ec10001`）

### 执行 8 步全部完成

| 步骤 | 动作 | 结果 |
|---|---|---|
| 3.0 | 生产 `drizzle.__drizzle_migrations` 注入 baseline 已应用记录 | ✅ hash `34b7133d...` + when `1780214254537` 注入；9 业务表未变；`drizzle-kit migrate` 静默通过 |
| 3.1 | A2：`drizzle-kit` 从 devDependencies 移到 dependencies | ✅ `npm install --save drizzle-kit@^0.31.10` |
| 3.2 | 临时目录验证 `npm install --omit=dev` 仍可用 drizzle-kit | ✅ `drizzle-kit v0.31.10 / drizzle-orm v0.38.4` 正常输出 |
| 3.3-3.4 | systemd unit 加 `ExecStartPre=drizzle-kit migrate` + `StartLimitIntervalSec=60` / `StartLimitBurst=3`（systemd 255 放 `[Unit]`）；部署生效 | ✅ `Process: ExecStartPre=... (code=exited, status=0/SUCCESS)`；新 PID 3899906；中断窗口约 6 秒 |
| 3.5 | 验证 #B1 复现拦截 | ✅ 临时加假迁移 → ExecStartPre 退出 1 → 主进程不启动 → `/health` 不通 |
| 3.6 | 验证 StartLimitBurst 触发 | ✅ 3 次重试后 systemd 报 `Start request repeated too quickly` 停在 failed |
| 3.7 | 操作手册 `docs/knowledge/devops/db-migration-handbook.md` | ✅ 含开发期工作流 / 部署期自动行为 / 首次部署 baseline 注入 / 故障排查 / 回滚 / 工具版本约束章节（drizzle-kit↔drizzle-orm 兼容矩阵）/ 禁止事项 |
| 3.8 | 归档 + 升维 | ✅ 本条目 + INDEX P2 关闭 + commit + push |

### 关键决策

- **systemd 255 `StartLimitIntervalSec` 放 `[Unit]` 而非 `[Service]`**：旧 systemd 文档里放 `[Service]`，从 systemd 230+ 起放 `[Unit]`。当前 systemd 255 必须 `[Unit]`，否则只是被解析但不生效
- **ExecStartPre 用 `/usr/bin/npx drizzle-kit migrate` 而非直调 node**：npx 解析 node_modules 路径，免去硬编码绝对路径
- **测试失败迁移用 `DROP TABLE not_exist`**：纯 SQL 错误，无副作用，与 `DROP IF EXISTS` 拼写故意避开，确保必然失败
- **包事务保护**：drizzle-orm pg dialect `session.transaction` 包所有迁移 → 失败回滚 → `__drizzle_migrations` 不留半应用记录 → 修完即可 restart

### 当前生产运行态

```
news-api.service  loaded enabled active (running)
  MainPID 3900723 npm exec tsx src/index.ts
  ExecStartPre=/usr/bin/npx drizzle-kit migrate (code=exited, status=0/SUCCESS)
  ExecStart=/usr/bin/npx tsx src/index.ts
  StartLimitIntervalSec=60, StartLimitBurst=3
drizzle.__drizzle_migrations  1 行 baseline，待 v0.5 起累加
```

### 实际中断窗口

- Step 3.3-3.4 unit 切换重启：约 **6 秒**（含 ExecStartPre 跑 baseline migrate 时间）
- Step 3.5-3.6 验证失败拦截：约 **1 分 50 秒**（刻意等 60 秒看 StartLimitBurst 生效）
- 合计：约 2 分钟。前端 HTTPS 不中断（nginx + dist 静态文件），仅 API 调用层有响应延迟

### Architect Review R2 配套要求落地确认

| Architect R2 要求 | 落地证据 |
|---|---|
| A2 移依赖 | Step 3.1 完成 |
| baseline 注入 `__drizzle_migrations` | Step 3.0 完成 |
| `ExecStartPre` + `StartLimitInterval/Burst` | Step 3.3-3.4 完成 |
| 操作手册含版本约束章节 | Step 3.7 完成（手册「工具版本约束」一节） |

### 整条 P2 关闭

- Step 1（Architect 决策） ✅
- Step 2（Developer baseline + 老路径清理） ✅
- Step 3（DevOps 部署侧自动迁移） ✅
- #B2 评估（Architect 独立） ✅
- **INDEX P2 待办本次会话结束后从跨任务待办表移除**

### 不在范围

- 根目录 `db/schema.sql` 归档到 `_legacy/`（架构师 R2 建议 Developer 顺手做，本次会话不动）

## 2026-05-31 — INDEX P2 评估：数据库迁移机制规范化

- 本次角色：DevOps（运维/部署工程师）
- 触发：用户问"P2 待办也归你做吧？先评估这条需要你参与的"
- 评估范围：INDEX 跨任务待办 P2「数据库迁移机制规范化」
- 结论：**应该做，但需拆三步推进；本次仅评估存档，Step 1 留给后续 Architect 会话**

### 现状勘察

| 维度 | 现状 |
|---|---|
| ORM | drizzle-orm 0.38 + drizzle-kit 0.30 已装 |
| schema 真源 | `server/src/db/schema.ts` |
| drizzle.config.ts | 配置就绪，`out: "./drizzle"`，但**该目录不存在**（drizzle-kit 从未生成过迁移文件） |
| package.json scripts | 仅 `db:push`（drizzle-kit push，**直推不留痕**） |
| 已有手写 SQL 迁移 | 散落两处：`db/migrations/v0.{1,2}.sql`（根目录）+ `server/db/migrations/v0.4.sql`（v0.3 跳号） |
| 部署时谁执行迁移 | **没人**。start.sh 不跑，systemd unit 不跑 — 这就是 #B1 的真根因 |
| 回滚 | v0.1/v0.2 有 rollback.sql，v0.4 没写 |

### 拆分方案

| 顺序 | 子任务 | 主责 | 依赖 |
|---|---|---|---|
| Step 1 | 选定工具流（drizzle generate vs push）+ 统一迁移路径 | Architect 决策 + DevOps 评审 | — |
| Step 2 | 已有 v0.1/v0.2/v0.4 SQL 归并到选定路径 + 补 v0.3 baseline + 补 v0.4 rollback | Developer 执行 + DevOps 评审 | Step 1 |
| Step 3 | 部署时自动跑迁移（`ExecStartPre=/usr/bin/npx drizzle-kit migrate` 加到 news-api.service） | **DevOps 独担** | Step 1, Step 2 |

### 我的评审意见（仅供 Architect 参考）

倾向 **drizzle-kit generate + journal**，理由：
- 产出版本化 SQL，可代码评审
- CI/CD 友好、幂等可重放
- 与已有手写 SQL 路径几乎一致，迁移成本低
- 失败时 systemd `ExecStartPre` 直接挡住主进程启动，避免 #B1 那种"服务起来了但 schema 没对齐"

push 仅保留给开发期快速试 schema，不进部署链。

### #B2 我不参与

「两步查询拆 FOR UPDATE」是查询代码层调整，归 Architect 评估 + Developer 改。当前 `FOR UPDATE OF cs` 临时修复在生产稳跑，无运维侧紧迫性。

### 下一步入口

- **后续 Architect 会话**：从 Step 1 上手，拍板工具流 + 迁移路径
- Step 1 完成后**回到 DevOps**：做 Step 3（systemd unit 加 ExecStartPre）

### 用户决定

用户已确认（2026-05-31）：本次评估存档即可，不启动 Step 1。

**2026-05-31 续办**：用户进一步要求让 Architect Review，本评估已**升格为正式提案文档** `docs/progress/ad-hoc/2026-05-31-devops-proposal-db-migration-mechanism.md`（含 A/B/C 方案对比、5 项待决策、风险表、验证标准、Review 计划与状态区）。下一步：用户切换到 Architect 角色 → 读提案 → 拍板 Step 1。

**2026-05-31 再续办**：Architect Review R1 ✅通过（commit `f512dee`），5 项决策逐条拍板，与我倾向完全一致（方案 A / 路径 P1 / introspect + 对账 / 分类强制 down / 仅部署机）。配套新增 A1-A4 四项补充，其中 **A2（drizzle-kit 移到 dependencies）是我提案风险表的盲点修正，标为 Step 3 硬前置**。决策已落项目首条 ADR-001（`docs/baseline/architecture.md`）。下一步：Developer 做 Step 2 → 我做 Step 3。

### Step 3 实施计划初稿

> 前置：Developer 完成 Step 2（`server/drizzle/` 目录已建、`0000_baseline.sql` + `0001_v0.4.sql` 已 generate 并验证、老路径已清理、`package.json` 已加 `db:generate` / `db:migrate` 脚本）

#### 任务清单

| # | 子任务 | 预估 | 说明 |
|---|---|---|---|
| 3.1 | A2：drizzle-kit 从 devDependencies 移到 dependencies | 5min | `npm install drizzle-kit --save`（不用 --save-dev），验证 `npm ls drizzle-kit` 在 `--production` 模式下仍可用 |
| 3.2 | systemd unit 加 ExecStartPre + 启动限制 | 10min | 改 `deploy/systemd/news-api.service`：加 `ExecStartPre=/usr/bin/npx drizzle-kit migrate`，加 `StartLimitIntervalSec=60` + `StartLimitBurst=3` |
| 3.3 | 部署到生产 + 验证 | 15min | `cp` unit 文件 → `daemon-reload` → `systemctl restart news-api.service` → 验证 /health + journal 无错误 |
| 3.4 | 验证 #B1 复现拦截 | 5min | 在 schema.ts 里加一个假列 → `systemctl restart` → 确认 migrate 报错（缺迁移文件） → 主进程不启动 → revert |
| 3.5 | 验证 migrate 失败不循环 | 5min | 故意写一条会失败的迁移 SQL → 确认 systemd 只重试 3 次后停住（StartLimitBurst） → 清理 |
| 3.6 | 写操作手册 `docs/knowledge/devops/db-migration-handbook.md` | 15min | 覆盖：generate 流程 / commit 约定 / down.sql 写法 / 部署时自动迁移行为 / 失败排查 / 回滚步骤 |
| 3.7 | 归档更新 | 5min | 更新 devops.md + INDEX P2 状态 + ad-hoc 提案文档 |

**总预估**：约 1 小时会话

#### 关键风险与缓解

| 风险 | 缓解 |
|---|---|
| A2 执行后 `npm install --production` 仍然拉不到 drizzle-kit | 先在 staging 验证：`npm install --production && npx drizzle-kit --version` |
| ExecStartPre 首次跑 migrate 时 `server/drizzle/` 为空（Developer Step 2 还没 generate） | 严格等 Step 2 完成后再做 Step 3。如提前部署，migrate 会因找不到 meta/_journal.json 报错，不会损坏数据 |
| migrate 失败后 journal 表记录残留，修完后重跑报"已应用" | 人工删 `__drizzle_migrations` 表对应行后重试，操作手册里写清 |

#### 不做的事

- ❌ 不跳序（Step 2 未完成不动代码）
- ❌ 不动 `server/start.sh`（架构师 Review 明确只用 systemd ExecStartPre）
- ❌ 不处理 #B2（Architect 另开会话）

## 2026-05-31 — Ops Task：Node 后端 systemd 化 + 旧 unit 清理 ✅完成

- 本次角色：DevOps（运维/部署工程师）
- 工作模式：Ops Task（非迭代）
- 触发：INDEX 跨任务待办 P1 × 2（清理旧 systemd unit + 决定 Node 后端是否启用 systemd）
- 执行内容：
  1. **清理旧 Python unit**：删除 `/etc/systemd/system/news-worker.service`（failed 5d）+ `news-api.service`（disabled，指向已不存在的 `.venv`），daemon-reload
  2. **重写 `deploy/systemd/news-api.service`**：对齐实际部署路径 `/root/Project/niuma-cheng-xiaobao/server`，ExecStart 改为 `npx tsx src/index.ts` 直调（不用 start.sh，因为 start.sh 内部 nohup 后台化与 systemd Type=simple 冲突），日志重定向到 `/var/log/niuma-news-api.log`
  3. **部署并启用**：`cp` → `/etc/systemd/system/` → `daemon-reload` → `enable` → 停旧 nohup PID 3875385 → `systemctl start`
  4. **验证**：`/health` ✅、频道空间 API ✅、前端 HTTPS ✅、Worker 调度 ✅、日志写入 ✅
  5. **崩溃重启验证**：`kill -9` 主进程后 5 秒自动重启，新 PID 正常，`/health` 恢复 ✅
- 最终状态：`systemctl is-active news-api.service` → `active (running)`，`is-enabled` → `enabled`
- 线上中断：约 10 秒（停 nohup → 启 systemd 间隔）
- 关联记录：`docs/progress/ad-hoc/2026-05-31-ops-cleanup-legacy-systemd-units.md`

## 2026-05-31 — Ops Task：清理 v0.3 Python 遗留 systemd unit ✅完成

- 本次角色：DevOps（运维/部署工程师）
- 工作模式：Ops Task（非迭代）
- 触发：用户要求"清理失效的 systemd unit news-worker.service"
- 范围扩展：勘察发现 `news-api.service` 是同源遗留（同样 disabled、同样指向已不存在的 `/opt/news-aggregator/.venv/`），与用户确认后一并清理
- 动作：`systemctl stop` → `disable` → `reset-failed` → 删除 `/etc/systemd/system/news-{worker,api}.service` → `daemon-reload`
- 验证：unit 文件无残留、`systemctl list-unit-files` 无 news-worker / news-api、Node 后端 `/health` 仍正常返回 `{"status":"ok"}`
- 线上影响：无。v0.4 生产服务用 nohup 启动，与 systemd 无关
- 后续建议（未在本次执行，用户已确认延后）：Node 后端 systemd 化以获得开机自启 + 崩溃重启，待用户决定后单独执行
- 记录：`docs/progress/ad-hoc/2026-05-31-ops-cleanup-legacy-systemd-units.md`

## 2026-05-30 — 会话收尾

- 本次会话：DevOps（运维/部署工程师），v0.4 部署阶段全程
- 完成工作：预部署检查（发现 #D1-#D5）→ 复审 R1（#D2 阻塞）→ 复审 R2（全部通过）→ 生产部署 → 重新部署
- 部署结果：✅ v0.4 已上线 https://news.huiyiyou.cloud/，所有验证通过
- 遗留：无 DevOps 侧遗留问题
- 下一步：用户浏览器视觉验证 → PM 复审测试报告 → 迭代关闭

## 2026-05-30 — v0.4 生产部署 ✅完成

- 本次角色：DevOps（运维/部署工程师）
- 动作：v0.4 生产环境部署
- 部署步骤：
  1. `npm install` — 依赖同步（package.json 已清理前端依赖）
  2. `npm run build` — 前端生产构建（vue-tsc + vite）
  3. 停止旧进程（PID 3782498，nohup 方式）
  4. `server/start.sh` 启动新服务（PID 3784214，API + Worker 同进程）
- 验证结果：全部通过
  - `/health` → `{"status":"ok"}`
  - 前端 HTTPS → HTTP 200
  - 频道空间 API → 4 个空间正常
  - 新闻查询 API → 正常（0 条，Worker 待新抓取）
  - Worker 日志 → 无报错，调度正常
- 前端部署：dist 通过软链接 `/var/www/news.huiyiyou.cloud/` → `frontend/dist` 自动生效
- 关联迭代：v0.4
- 下一步：用户浏览器视觉验证 → PM 复审测试报告 → 迭代关闭

## 2026-05-30 — v0.4 预部署检查再次复审 ✅部署就绪

- 本次角色：DevOps（运维/部署工程师）
- 动作：v0.4 部署再次复审（Developer 修复 #D2 后）
- 结论：✅**全部通过** — #D1-#D5 全部关闭，部署门禁满足
- 复审明细：
  - #D1 ✅ 前端构建通过
  - #D2 ✅ `server/package.json` 已清除前端依赖，node_modules 清理完毕
  - #D3 ✅ `ADMIN_TOKEN` 已配置
  - #D4 ✅ 迁移文件已就位
  - #D5 ⚠️ 维持，不阻塞
- 通过项（8/8）：DB 迁移 / TS 编译 / rss-parser / 环境变量 / 系统依赖 / start.sh / 服务运行 / 健康检查
- 下一步：执行部署 → 用户浏览器视觉验证 → 迭代关闭

## 2026-05-30 — v0.4 预部署检查复审（第一次）

## 2026-05-30 — v0.4 预部署检查

- 本次角色：DevOps（运维/部署工程师）
- 动作：v0.4 预部署检查
- 前置条件：实现阶段 ✅已定稿 / 测试阶段 ✅有条件通过（#B1-#B3 全部修复）
- 检查范围：依赖审计、编译构建、数据库迁移、环境变量、服务运行状态、启动脚本
- 结论：🔴**部署阻塞** — 2 个阻断项
  - **#D1 🔴阻断**：前端生产构建 `vue-tsc -b && vite build` 失败（9 个 TS 错误）
  - **#D2 🔴阻断**：`server/package.json` 含 3 个前端依赖（@vueuse/core、sortablejs、vuedraggable），服务器代码零引用
  - **#D3 🟡警告**：ADMIN_TOKEN 为空
  - **#D4 🟡警告**：迁移文件 `db/migrations/v0.4.sql` 路径不标准（项目根而非 server/db/migrations/）
  - **#D5 🟡警告**：.env 含明文 API Key
- 通过项：DB 迁移已执行、服务器 TS 编译通过、rss-parser 已安装、无新增环境变量、无新增系统依赖、start.sh 兼容、所有服务运行正常、健康检查通过
- 详细报告：`docs/progress/iterations/v0.4.md` 部署阶段段
- 下一步：Developer 修复 #D1 #D2 → DevOps 复审部署 → 用户浏览器视觉验证 → PM 复审测试报告 → 迭代关闭

## 2026-05-27 — v0.3 本地部署验证

- 本次角色：DevOps（兼职，全栈开发兼任）
- 动作：部署验证
- 部署目标：本地生产（Node.js v22.22.0 直跑，无 Docker）
- 涉及文件：`server/start.sh`（新增启动脚本）
- 部署步骤：
  1. `npm install` 安装依赖
  2. `nohup npx tsx src/index.ts` 启动 API + Worker 同进程服务
  3. 健康检查 → API 端点验证 → Worker 调度验证
- 验证结果：全部通过
  - 健康检查 `/health` → `{"status":"ok"}`
  - Channel Spaces (4) / Sources (2) / Stats (20 news, 6 today, 1 active)
  - Worker fetch task 执行成功（@alpha123cc X推文）
- 结论：部署就绪。API + Worker 运行正常，数据库连接正常。
- 关联迭代：v0.3
- 遗留问题/风险：Docker 未安装，当前使用 nohup + tsx 直跑。若需生产环境（news.huiyiyou.cloud）部署，需先在该服务器上安装 Node.js 22 + npm 依赖 + 配置 systemd。

## 2026-05-26 — 补充配置 + 关机

- 前端更新：SourceManager 添加 X/Twitter 特有配置字段（抓取模式、搜索关键词、追踪账号）
- LLM 配置更新：切换为火山云 deepseek-v4-pro（`OPENAI_API_KEY` + `OPENAI_BASE_URL`）
- 前端静态目录优化：`/var/www/news.huiyiyou.cloud` 改为软链接指向 `frontend/dist`
- 服务关闭：news-api + news-worker 已停止并禁用开机自启，nginx + PostgreSQL 保留

## 2026-05-25 — 生产环境部署（news.huiyiyou.cloud）

- 目标：在服务器上部署完整服务，通过 nginx 反向代理提供 HTTPS 访问
- 数据库：本地 PostgreSQL 16（用户 `news`，库 `news`），9 张表初始化
- 前端：`npm run build` 静态文件部署到 `/var/www/news.huiyiyou.cloud/`
- 后端：systemd 管理 API + Worker，开机自启
- Nginx：反向代理 `/v1/` `/ws` `/docs` → `127.0.0.1:8000`，前端 SPA fallback
- SSL：Certbot 自动签发 Let's Encrypt，HTTPS 自动续期
- 健康检查：全部通过（前端/API/Worker/数据库/Nginx）
- 备注：部署中修复 1 个构建阻断（LogViewer.vue 未使用的 `getLogsConfig` 导入）+ 1 个配置问题（DATABASE_URL 缺少 `+asyncpg` 驱动前缀）
- 待用户填写：OPENAI_API_KEY

## 2026-05-24 — v0.2 部署就绪检查

- 产出：v0.2 本地部署 + 健康检查
- 启动结果：API + Worker + 前端全部启动成功
- 健康检查：7 项端点检查通过，1 项 Bug 阻塞
- Bug：Worker `fetch_and_ingest` 中 `row["display_name"]` 键名不匹配 → 开发已修复（`d92fab3`），重启后验证通过
- 详细报告：docs/progress/iterations/v0.2.md 部署就绪检查段

## 2026-05-23 — v0.1 部署就绪检查

- 产出：Dockerfile、docker-compose.yml
- 补充：.env.example 增加 POSTGRES_* 变量
- 部署验证：本地启动 API + 前端构建，全部通过
- 详细报告：docs/progress/iterations/v0.1.md 部署就绪检查段

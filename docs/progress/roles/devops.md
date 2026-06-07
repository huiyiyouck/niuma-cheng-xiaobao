# DevOps 工作日志

## 2026-06-07 — v0.5.1 生产部署上线

> 角色：DevOps（运维/部署工程师）；模式：标准迭代部署执行。

### 部署范围

- 代码：HEAD `a032dbe`（含 v0.5.1 X 反向同步 commit `7aca9d6` + Owner 试用 Bugfix commit `75ca9ae`）
- Schema：`drizzle/0001-0004`（首次正式经由 drizzle migrate 同步到生产 `__drizzle_migrations` 表）
- 配置：.env 8 项变更（详见下方），符合「合并不替换」原则
- 目标环境：本机生产 systemd `news-api.service`（同机部署 = 部署人在生产机操作）

### 执行步骤（按计划 7 步）

1. **Step 1 .env 对比**：原 27 项 vs 用户贴出 8 项 → 6 改 + 2 新增 + 21 保留
   - 关键 catch：用户贴的 `DATABASE_URL` 指向 `:5433`，本机 PG 在 `:5432` → **保留 5432 端口，仅去掉 `+asyncpg` 旧 Python 驱动头**
2. **Step 2 dry-check**（4 项全过）
   - `LOWER(display_name)` 无重复 ✅（0004 唯一索引安全）
   - drizzle journal 与 `__drizzle_migrations` 严重漂移：journal 仅 0000/0001，DB 仅 baseline，但 DB schema 已是 v0.5.1 终态。0001-0004 SQL 全部使用 `IF [NOT] EXISTS`，确认幂等安全
   - sources 表 4 条 x_twitter 全部 `x_synced`，与 X Portal 4 条 rules 完美对应
   - X API GET rules 走 `X_PROXY_URL=http://127.0.0.1:10809` 联通 ✅
3. **Step 3 pg_dump 备份**：`/var/backups/niuma-news/db-pre-v0.5.1-20260607-173753.sql.gz`（4.6K / 12 表）
4. **Step 4 .env 精准 patch**：Python 脚本逐 key 替换，diff 校验只动了预期的 8 项；备份原 .env 至 `/var/backups/niuma-news/env-pre-v0.5.1-*.env`
5. **Step 5 systemctl restart** — **第一次失败**（见下方"部署期发现")
6. **Step 5 retry** — npm install 后 reset-failed → restart → 3s 内 active running
7. **Step 6 健康检查 6/6 通过**
8. **Step 7 回写产出物**（本日志 + v0.5.md + INDEX.md）

### 部署期发现并已修复的问题

| # | 问题 | 根因 | 修复 |
|---|------|------|------|
| A | worker 启动崩 `ERR_MODULE_NOT_FOUND: undici` | commit `75ca9ae` 新增 `"undici": "^7.27.2"` 到 `server/package.json`，但部署机未跑 `npm install` | `cd server && npm install` → 装 183 包，8s 完成 |
| B | drizzle journal 与 DB 三方不一致：`_journal.json` 只有 0000/0001、`__drizzle_migrations` 表只有 baseline、disk 上有 0001-0004、DB 实际 schema 已是 v0.5.1 终态 | 历史上人工 `psql` 应用了部分迁移、`db:generate` 没跟上 schema.ts 变更，节奏不规范 | drizzle migrate 幂等重跑 0001-0004（全部 IF [NOT] EXISTS 保护），journal 与 DB 状态自动对齐。同时把 0002 写入 journal（由 drizzle-kit 自动完成） |
| C | scheduler 旧版日志狂刷 `relation "channel_sources" does not exist` | 旧 worker 进程还跑 v0.4 代码 + 新 schema（channel_sources 已 DROP），跨版本不一致 | restart 后旧进程退出，新 worker 用新代码不再查 channel_sources，噪音消失 ✅ |

### .env 变更（脱敏）

| 字段 | 旧 → 新 |
|------|---------|
| `DATABASE_URL` | `postgresql+asyncpg://news:news@localhost:5432/news` → `postgresql://news:news@localhost:5432/news`（仅去 Python 驱动头） |
| `OPENAI_BASE_URL` | `ark.cn-beijing.volces.com` → `token-plan-cn.xiaomimimo.com` |
| `OPENAI_MODEL` | `deepseek-v4-pro` → `mimo-v2.5-pro` |
| `OPENAI_API_KEY` | 旧 token → 新 token（换供应商） |
| `X_BEARER_TOKEN` | 旧 → 新 |
| `PROCESS_CONCURRENCY` | `1` → `5` |
| `JIN10_MCP_URL` / `JIN10_MCP_TOKEN` | 新增（金十数据 MCP 接入） |

### 健康检查结果（6/6）

| # | 检查 | 结果 |
|---|------|------|
| 6.1 | GET /health | 200 `{status:ok}` |
| 6.2 | GET /v1/spaces | 200，3 空间 |
| 6.3 | POST /v1/x/sync-rules（带 ADMIN_TOKEN） | 200 `{added:0, updated:4, removed:0, restored:0}` |
| 6.4 | sources 表 x_rule_id 回填 | 4/4（OpenAI / Solanamobile / 加密狗 / Claude code）|
| 6.5 | X STREAM connected | ✅ XRuleSyncer 启动、首次 sync `remote=4 local=4`、Stream 连接成功 |
| 6.6 | 全局代理 | `http://127.0.0.1:10809` 生效 |

### 遗留与建议

- **🔴 密钥轮换建议**：本次部署的 X_BEARER_TOKEN / OPENAI_API_KEY / JIN10_MCP_TOKEN 在与 Owner 的对话历史中**已明文出现**。强烈建议 Owner 尽快在各服务控制台轮换。本日志按手册原则不记录原始值。
- **🟡 知识沉淀建议**（待 Owner 决定是否新增）：
  - 「Developer 改 `server/package.json` 必须同步通知 DevOps 跑 `npm install`」—— 可考虑列入 `docs/baseline/conventions.md` 或 `db-migration-handbook` 类似的"应用变更手册"
  - 「drizzle journal 漂移可通过幂等 migrate 自动修复，但仅当所有 SQL 严格使用 IF [NOT] EXISTS 时安全」—— 可补充进 `docs/knowledge/devops/db-migration-handbook.md`
- **🟡 工作区遗留**：`docs/baseline/*.md` 12 文件未提交修改 + `AGENTS.md` 未跟踪文件，是一项**未结的 WM 域多客户端基线迁移工作**（把 baseline 同时支持 Claude Code + Codex 入口）。**DevOps 本会话未动**这些文件，按角色边界由 WM/Owner 后续处理。
- **🟢 v0.5.1 后端部署已完成**，等 Owner 浏览器验证 v0.5 / v0.5.1 前端 UI 即可关闭 v0.5 迭代。

### 下一步入口

Owner 浏览器手测前端 → 通过则 PM 执行 v0.5 迭代关闭检查。

### 知识沉淀（同一会话补做，按角色手册 step 6）

按 Owner 要求"知识沉淀必须做"，本次部署的 2 条经验已落档到 `docs/knowledge/devops/`：

1. **新建** [`devops/dependency-change-handbook.md`](../../knowledge/devops/dependency-change-handbook.md) — Node 依赖变更全链路规范：Developer 改 package.json 必做 4 步、commit 检查清单、DevOps 部署前 dry-check 命令、`ERR_MODULE_NOT_FOUND` / 版本不一致 / devDeps 边界 / StartLimitBurst 锁定 4 个故障排查、5 条禁止事项。
2. **补充** [`devops/db-migration-handbook.md`](../../knowledge/devops/db-migration-handbook.md)：
   - 故障排查新增「现象 4：journal / `__drizzle_migrations` / DB schema 三方漂移」——含触发原因、风险评估表（按 SQL 是否幂等分流处置）、检测命令、预防规则
   - 禁止事项新增 1 行：「用 psql 跑迁移不同步 `__drizzle_migrations` 和 `_journal.json`」
3. **更新** [`docs/knowledge/INDEX.md`](../../knowledge/INDEX.md) DevOps 节，新增 1 条索引、修订 db-migration-handbook 索引描述。

知识写入符合 [`knowledge-base.md`](../../baseline/knowledge-base.md) 规则：含适用/不适用场景、来源链接（v0.5.1 部署日志）、无密钥/Token、写短不写流水账（dependency-handbook 约 250 行、migration-handbook 增量约 50 行）。

---

## 2026-06-07 — v0.5.1 X 反向同步迁移落库 + 拓扑变更

> 本次工作以 Owner + Developer 实施为主，DevOps 视角记录 schema migration 与运行时拓扑变更。

- 数据库 migration：
  - 新增 `server/drizzle/0002_x_reverse_sync.sql`，已落本地（通过 SSH tunnel 连服务器 PostgreSQL）
  - 字段：sources 表 `source_origin varchar(20) NOT NULL DEFAULT 'manual'` / `x_rule_id text` / `paused boolean NOT NULL DEFAULT false`
  - 数据回填：所有 `type='x_twitter'` 且 `source_origin='manual'` 的旧记录回写为 `x_synced`（之后 syncOnce 按 username 匹配自动回填 `x_rule_id`）
  - 备注：本次绕过 `drizzle-kit push`（因检测到 channel_spaces 一处不相关变更要求 TTY 交互），直接 `pg.query()` 执行 SQL；线上发布时需手动 `psql -f 0002_x_reverse_sync.sql`，迁移与 baseline 注入流程不变
- worker 拓扑变更：
  - **新增**：`XRuleSyncer` 定时任务（启动一次 + 每 5min 一次 `setInterval`），调 X API `GET /2/tweets/search/stream/rules`
  - **移除**：X Stream 推规则方向的所有出站请求（`POST /2/tweets/search/stream/rules` 不再调用）
  - **移除**：x_twitter 类型从 scheduler polling 队列排除
  - 总体出站调用频次变化：每 5min 1 次 GET（轻量）+ 长连接保持（不变）
- 环境变量：无新增；`X_BEARER_TOKEN` 未配置时 XRuleSyncer 与 XStreamManager 都自动跳过
- 已验证：本地启动 `bash server/start.sh`，日志 `X RULE SYNC done: +0 ~1 -0 ↻0`、`X STREAM connected`，端到端 10 项 API 测试通过
- 遗留：
  - 线上服务器（systemd 管理的 news-api）部署本次变更时需先停服 → 执行 `0002_x_reverse_sync.sql` → 拉新代码 → systemd restart
  - 前端 UI 视觉验证待 Owner 浏览器手测
- 下一步入口：等 Owner 浏览器验证通过后，由 DevOps 安排线上部署窗口

## 2026-06-06 — 会话收尾

- 本次会话：DevOps（运维/部署工程师），完成 3 件事
  1. v0.5 PRD R1 Review（需修改 — 1 高/2 中/1 低）
  2. v0.5 PRD R2 复审（通过 — 4 条全部关闭）
  3. v0.5 设计文档 R1 Review（需修改 — 1 高/2 中/1 低）
  4. v0.5 设计文档 R2 复审（通过 — 4 条全部关闭）
  5. v0.5 本地部署验证（阻塞 — 前后端路由不匹配）
- 部署验证详情：
  - 目标环境：本地 macOS + SSH 隧道连服务器 PostgreSQL
  - drizzle migrate ✅ / 后端启动 ✅ / 前端启动 ✅ / /health ✅
  - 阻塞：3 条前端请求 404（`/v1/spaces/{id}/news|stats|sources`），根源是前后端路由路径 + 参数名不一致
  - `X_BEARER_TOKEN` 未配置（本地验证不需要 X Stream）
- 产出：部署检查结果已写入 `v0.5.md` 部署就绪检查表；`INDEX.md` 当前阶段已更新
- 遗留：前后端契约对齐 → Developer
- 下次启动入口：切换到 Developer 修复路由不匹配；然后 DevOps 重新部署验证

## 2026-06-06 — v0.5 设计文档 R2 Review

- 本次角色：DevOps（运维/部署工程师）
- 工作模式：标准迭代 设计阶段 R2 复审
- R1 4 条意见（1 高/2 中/1 低）逐项核验，全部已正确关闭
- 结论：通过
- R2 新增内容（§6.3 环境变量汇总、§4.3 Stream/systemd 交互明确、`X_BEARER_TOKEN` 缺失降级策略）均运维友好
- 设计文档已达到实现阶段准入标准
- 产出：R2 Review 记录已写入 `iterations/v0.5-design.md`、`iterations/v0.5.md`、`INDEX.md`
- 下一步入口：Developer 进入实现阶段

## 2026-06-06 — v0.5 设计文档 R1 Review

- 本次角色：DevOps（运维/部署工程师）
- 工作模式：标准迭代 设计阶段 Review
- 审查范围：数据清理脚本安全性、X Stream 单实例约束可行性、迁移步骤可执行性、环境依赖
- 结论：需修改
- 发现 1 高（清理脚本引用迁移后表名）、2 中（新旧表名混用、缺环境变量汇总）、1 低（Stream/systemd 交互未定义）
- 已确认正确：单实例约束、清理安全措施四层防护、FK 删除顺序、X API 端点依赖、ExecStartPre 兼容性
- 产出：Review 记录已写入 `iterations/v0.5-design.md`、`iterations/v0.5.md`、`INDEX.md`
- 下一步入口：PM 完成 R1 Review → Architect 汇总 → 设计文档 R2

## 2026-06-06 — v0.5 PRD R2 Review

- 本次角色：DevOps（运维/部署工程师）
- 工作模式：标准迭代 PRD R2 复审
- R1 4 条意见（1 高/2 中/1 低）逐项核验，全部已正确关闭：
  - 高：pg_dump 备份 → §4.10 + §7 + AC-5.8.1 三层覆盖
  - 中：环境变量 → §7.4 列出 `X_BEARER_TOKEN`，完整清单委托设计阶段
  - 中：X API 门禁 → §7.2 明确"核验不通过则 X 主线阻塞"
  - 低：/health + 日志 → 维持现状可接受；R2 新增事务回滚和 /health 回归 AC 为额外收益
- 结论：通过
- R2 新增内容（清理回滚、空库迁移、健康检查回归、告警去重）从运维视角均正面
- 产出：R2 Review 记录已写入 `iterations/v0.5-prd.md`、`iterations/v0.5.md`、`INDEX.md`
- 下一步入口：Tester 完成 R2 复审 → PRD 定稿 → UI 方案阶段

## 2026-06-06 — v0.5 PRD R1 Review

- 本次角色：DevOps（运维/部署工程师）
- 工作模式：标准迭代 PRD Review（非独立运维任务）
- 审查范围：X API 环境依赖、环境变量、单实例约束、不可逆数据清理、上线验证风险、回滚条件
- 结论：需修改
- 发现 1 项高严重度（数据重置缺 pg_dump 备份）、2 项中严重度（环境变量清单缺失、X API 核验未设部署门禁）、1 项低严重度（/health 不感知 Stream、日志保留策略未明确）
- 已确认无问题：单实例约束、不可逆清理审批链、现有基础设施（drizzle/systemd/nginx）、删除操作不丢数据
- 产出：PRD Review 记录已写入 `iterations/v0.5-prd.md`；`iterations/v0.5.md` 门禁状态已更新；`INDEX.md` 当前阶段已更新
- 下一步入口：Architect 完成 R1 Review → PM 汇总 → PRD R2

## 2026-05-31 — 会话收尾

- 本次会话：DevOps（运维/部署工程师），完成 5 件事，全部归档推送
  1. 清理 v0.3 Python 遗留 systemd unit（news-worker + news-api）
  2. Node 后端 systemd 化（`deploy/systemd/news-api.service` 启用，含崩溃自动重启验证）
  3. P2「数据库迁移机制规范化」评估 → 升格独立提案 → Architect Review R1 通过（ADR-001）
  4. Architect Review R2 同步归档（Developer Step 2 微调审议）
  5. Step 3：drizzle 迁移机制部署侧落地（baseline 注入 + A2 移依赖 + systemd ExecStartPre + StartLimitBurst + #B1 拦截验证 + 操作手册落档）
- 整条 P2 全线关闭，从 INDEX 跨任务待办移除
- 生产运行态：`news-api.service active (running)`，MainPID 3900723，ExecStartPre+ExecStart 双段都正常
- 工作区干净：本次 DevOps 产出全部 commit 推送 origin/main（commits: `a64bdff` / `a38ef3e` / `8674245` / `0038382` / `f5d3c9a` / `5879440`）
- 沉淀：操作手册 [`docs/knowledge/devops/db-migration-handbook.md`](../../knowledge/devops/db-migration-handbook.md)；2 条 memory（systemd-startlimit-in-unit-section / drizzle-kit-in-dependencies）
- DevOps 侧无遗留事项；INDEX 跨任务待办无归属 DevOps 的剩余项
- 下次启动入口：用户决定（v0.5 启动 / 其他角色 / 其他任务）

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

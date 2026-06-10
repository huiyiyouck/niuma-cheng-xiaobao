# DevOps 工作日志（当前）

> 最近 10 条工作日志。长期摘要、当前关注点和常见风险见 `devops-summary.md`；旧日志在 `devops-archive.md`。

## 2026-06-10 — v0.6 PRD R1 DevOps Review + 会话收尾 + DevOps 日志分页归档

> 角色：DevOps；模式：标准迭代 PRD 阶段 R1 Review。

### 触发

v0.6 PRD R1 前 4 方（Architect / UI / Developer / Tester）已完成 Review 全部 ❌需修改，Owner 切到 DevOps 完成第 5 方 Review 闭环。

### 执行

1. 读 `runtime.md` + `INDEX.md` + `role-devops.md` + DevOps 工作日志（554 行，分层归档前最后一次完整读）+ `v0.6.md` + `v0.6-prd.md`（含已 Review 4 方意见全文）。
2. 现场勘察部署侧基线：`server/.env`（28 项）+ `news-api.service`（含 ExecStartPre + StartLimit）+ nginx `/etc/nginx/sites-enabled/news.huiyiyou.cloud`（软链接模式 + `/assets/` 长缓存 + `/index.html` no-cache + `/v1/` 反代）+ `@fastify/static` 注册（`server/src/index.ts:13-22`，prefix `/assets/`）+ `dispatcher.ts requeueTask` 退避公式（`min(300, 10*(tries+1))`，线性 5 分钟）+ 磁盘 16GB 可用 + `/var/log/niuma-news-api.log` 当前 428K + `winston-daily-rotate-file` 已装但未接 systemd stdout。
3. 严格守 DevOps 视角边界（部署方式、环境变量、云服务、发布风险、回滚条件），与已 Review 4 方明显错开重复。

### 产出

**结论**：❌ 需修改。共 12 条意见（4 高 / 5 中 / 3 低）。详见 `iterations/v0.6-prd.md` DevOps R1 段。

| # | 严重度 | 主题 | 与其他角色关系 |
|---|---|---|---|
| #O1 | 高 | 4 类外部依赖（LLM / 链接读取 / Web 搜索 / X 搜索）网络出口/超时/成本/速率全部模糊，部署侧无 dry-check 与熔断基准 | 与 #A3 同源，但补"运维约束三表"（网络出口表 / 超时上限表 / 成本速率表） |
| #O2 | 高 | "原始信息先入库" + L1 重试堆积无数据保留策略，6 个月内磁盘告警（年增 5-40GB） | 独立视角，无重复 |
| #O3 | 高 | 软链接部署模式 × 空间图标上传：存储路径选错会让上传文件每次 build 丢失，PRD 没把"不得放 frontend/dist 内"列硬约束 | 与 #A8/#D4 同源，补软链接架构约束（v0.5.1 部署经验已沉淀到 `full-stack-deploy-handbook.md`） |
| #O4 | 高 | L0/L1 任务卡死、外部依赖大面积失败、任务堆积、月费突破等运维事件告警载体未在 PRD 收敛 | 独立视角，扩展 `alerts` 表枚举 |
| #O5 | 中 | npm 依赖增量未列，sharp/playwright 类有 native binding 与系统依赖要预审 | 与 #D12 同向，补部署侧系统依赖视角 |
| #O6 | 中 | env 增量清单 + `.env / .env.example / systemd EnvironmentFile` 三处同步流程缺失 | 独立视角，v0.5.1 部署经验值 |
| #O7 | 中 | 软链接模式下 mock fixture 误打包到 prod build 的部署侧检测门禁缺位 | 与 #A9 / #U6 / #D1 / #T11 同源，补部署侧 grep 门禁 |
| #O8 | 中 | systemd `StandardOutput=append:` 无轮转，L0/L1 引入后 10-50MB/天会让日志失控 | 独立视角 |
| #O9 | 中 | 本期改动涉及前端+后端+DB schema+用户上传文件+.env 五维，"无回头路边界"未定 | 独立视角 |
| #O10 | 低 | 3-5 个新增 API Key 的密钥轮换 SOP 缺失 | 与 v0.5.1 部署期密钥泄漏教训呼应 |
| #O11 | 低 | AC-28 上传图标在浏览器缓存层兼容性（hash 命名 + 长缓存还是 no-cache）未说明 | 与 #O3 路径联动 |
| #O12 | 低 | 上线前外部依赖 dry-check 命令清单缺失 | 与 #A3 候选选型联动 |

### 边界守住

- 状态机定义（#A1）、错误分类（#A2）、外部依赖选型（#A3）、评分公式（#A4）、API 字段名（#D2）、AI 输出策略（#D5）、前端视觉密度（#U4）、测试 mock（#T2）等已被其他角色高严重度覆盖，本文不重复。
- 与 #A3/#A8/#D4/#D12/#T11 部分同源但视角错开：Architect 关心"架构选型"、Developer 关心"工程契约"、Tester 关心"测试断言"、DevOps 关心"运维边界"。

### 同步动作

- 更新 `v0.6-prd.md` Review 记录区域追加 DevOps R1 段（约 200 行）+ Review 状态表 DevOps 待 Review → 需修改。
- 更新 `v0.6.md` PRD R1 行：5 方齐 → R1 完成，等待 PM 汇总产出 R2。
- 更新 `INDEX.md` 当前状态：阶段 → R1 Review 完成（5/5 已 Review，全部需修改）/ 下一步入口 → PM 汇总 R1 五方意见，产出 PRD R2；最近收尾摘要表追加本次记录。
- 同 commit 完成 **DevOps 日志分页归档**：原 554 行 → `devops-current.md`（10 条以内）+ `devops-summary.md`（长期摘要 + 当前关注点 + 8 类常见风险）+ `devops-archive.md`（旧条目），按 `context-policy.md` 三层架构。`INDEX.md` 角色日志表同步更新。

### 下一步入口

PM 汇总 R1 五方意见（Architect 11 + UI 12 + Developer 13 + Tester 12 + DevOps 12，共 60 条），产出 PRD R2；R2 后 5 方各自复审。

---

## 2026-06-07 — v0.5.1 前端部署上线 + 软链接架构发现（同日第 2 次出场）

> 角色：DevOps；模式：标准迭代部署执行（前端补部署）。

### 触发

Developer 已交付前端 TS 错误修复（commit `ebd9d1e` 修 9 个正用文件 + `a79acfb` 删 5 个孤儿组件，经 Architect Review `b02cbd4` ✅通过，`cda1a75` 收尾归档），Owner 切回 DevOps 执行前端部署。

### 执行

1. **代码就位**：`git fetch` 显示本地已是 origin/main HEAD（无需 pull）
2. **前端构建**：`cd frontend && npm install`（幂等 OK）→ `npm run build` 通过 **0 TS 错误 / 135 modules / 17 bundles**（114k js + 11k css gzip）
3. **本计划走 rsync**：执行 `rsync -av --delete frontend/dist/ /var/www/news.huiyiyou.cloud/`，结果 `sent 716 bytes received 13 bytes` —— 几乎零字节传输
4. **异常根因排查**：
   - sha256 对比：备份与新 dist 的 `index-hZzDm_iU.js` 完全一致（`c7d98fb8...`）
   - `stat`：`/var/www/news.huiyiyou.cloud/index.html` 与 `frontend/dist/index.html` **同 Inode 561912 同 Device 253,2**
   - `ls -la /var/www/`：`news.huiyiyou.cloud -> /root/Project/niuma-cheng-xiaobao/frontend/dist`（May 26 08:57 创建的软链接）
   - **真相**：`/var/www/news.huiyiyou.cloud` 是软链接到项目内 `frontend/dist/`，`npm run build` 一完成就立即上线，rsync 是无效但无害的操作
5. **完整 12 项 verify 全过**：
   - 后端 1-5：systemd active / undici 已装 / /health 200 / /v1/spaces 200 / X RULE SYNC 18:18/18:23/18:28 三次 `remote=4 local=4`
   - 前端 6-8：deps OK / dist 时间戳 18:28 / nginx -t syntax ok
   - 公网 9-12：HTTPS 首页含 `index-hZzDm_iU.js` 引用 / 引用的 bundle 200 可下载 / API 反代 200 返回 3 空间 / **公网下载的 bundle sha256 与本地 dist 完全一致**

### 本次会话的两个失误及修正

| # | 失误 | 修正 |
|---|------|------|
| A | 一开始按 handbook 走了 rsync 步骤，没先 `readlink -f` 确认部署模式 | 已增补 `full-stack-deploy-handbook.md` 新章节「部署模式判别」+「软链接模式」3 条风险，DevOps 每次部署第一步必须做模式判别 |
| B | 备份在 `cp -r` 时序上发生在 `npm run build` 之后（计划时混淆了顺序），结果"备份的 5-31 旧前端"实际是刚 build 完的新 dist 自己。本次没真的留下回滚点 | 已在 handbook「软链接模式」节明确：备份必须在 build 之前；本次具体回滚路径：`git checkout <旧 commit> && cd frontend && npm run build`（用 git 历史回退而非备份文件） |

### 知识沉淀

[`docs/knowledge/devops/full-stack-deploy-handbook.md`](../../knowledge/devops/full-stack-deploy-handbook.md) 新增：
- §「部署模式判别（执行前必做）」—— `readlink -f` 命令、A/B/C 三种模式判别表、软链接模式精确动作清单
- §「软链接模式的特性」—— 3 条风险（无灰度 / 回滚需 git checkout / 备份必须 build 之前）
- §「验证证据」追加本次 2026-06-07 第 2 次出场条目

### 下一步入口

Owner 浏览器验证 → 验证通过 → PM 执行 v0.5 迭代关闭检查。

---

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
- **🟢 v0.5.1 后端部署已完成**，等 Owner 浏览器验证 v0.5 / v0.5.1 前端 UI 即可关闭 v0.5 迭代。

### 收尾发现：前端部署阻塞（重大失误复盘）

Owner 要求给生产 URL 用于浏览器验证。检查发现：

- 公网 `https://news.huiyiyou.cloud/` 由 nginx 托管 `/var/www/news.huiyiyou.cloud/`
- 该目录 + 项目内 `frontend/dist/` 时间戳均为 **2026-05-31 14:32**（v0.4 末期，比 v0.5 PRD 启动还早 1 天）
- **整个 v0.5 / v0.5.1 期间从未发生过前端构建/部署**
- 现场重新 `cd frontend && npm run build` → vue-tsc 报 **31 个 TS 错误**（14 个文件，v0.5 重构遗孤）：
  - 7 处 TS2724：`SubChannel` → `Channel` 重命名遗孤（`InlineAddSource.vue`、`SubChannelManager.vue`、`VerifyDialog.vue` 等）
  - 5 处 TS2339：`Source.source_url` / `Source.status` 字段消失
  - 3 处 TS2322：`SourceRole` / `AvailabilityStatus` / `DomainTag` 类型契约偏移
  - 2 处 TS2739：`SpaceDeletePreview` / `ChannelDeletePreview` 形状变化
  - 2 处 TS2305：`markVerified` / `listSubChannels` 函数已删
  - 12 处 lint/未使用 imports / null 检查未通过
  - 完整清单：[`v0.5.1-frontend-ts-errors.txt`](../iterations/v0.5.1-frontend-ts-errors.txt)

**失误复盘**：

1. **根因**：本次部署计划只覆盖了后端 systemd 链路，**完全没有把前端构建/部署纳入检查清单**。我从 v0.5.md「部署阻塞」条目的描述（"前后端路由不匹配"由 Developer commit 75ca9ae 修复）就主观推断"前端已经在某处部署过了"，没有 verify。
2. **错误的翻牌**：Step 7 把部署就绪表翻成「部署通过」、INDEX 当前阶段写「v0.5.1 生产部署通过」——**这是不准确的报告**，只是后端通过，前端从未部署。已在本次收尾里如实修正为「后端部署通过 / 前端部署阻塞」。
3. **如果不是 Owner 在收尾时要 URL**，这个失误会让"v0.5 关闭"在错误前提下推进——PM 会以为前端已上线，Owner 试用时拿到旧前端会得出"v0.5/v0.5.1 全部没生效"的错误结论，反而怀疑后端有 bug。
4. **教训**：DevOps 部署检查清单必须**显式列前端构建 + 部署**为独立步骤，且任一失败都阻塞「部署通过」翻牌。这条已沉淀到 [`devops/full-stack-deploy-handbook.md`](../../knowledge/devops/full-stack-deploy-handbook.md)（本次会话同步落档）。

### 知识沉淀（同一会话补做，按角色手册 step 6）

按 Owner 要求"知识沉淀必须做"，本次部署的 **3 条经验**已落档到 `docs/knowledge/devops/`：

1. **新建** [`devops/dependency-change-handbook.md`](../../knowledge/devops/dependency-change-handbook.md) — Node 依赖变更全链路规范：Developer 改 package.json 必做 4 步、commit 检查清单、DevOps 部署前 dry-check 命令、`ERR_MODULE_NOT_FOUND` / 版本不一致 / devDeps 边界 / StartLimitBurst 锁定 4 个故障排查、5 条禁止事项。
2. **补充** [`devops/db-migration-handbook.md`](../../knowledge/devops/db-migration-handbook.md)：
   - 故障排查新增「现象 4：journal / `__drizzle_migrations` / DB schema 三方漂移」——含触发原因、风险评估表（按 SQL 是否幂等分流处置）、检测命令、预防规则
   - 禁止事项新增 1 行：「用 psql 跑迁移不同步 `__drizzle_migrations` 和 `_journal.json`」
3. **新建** [`devops/full-stack-deploy-handbook.md`](../../knowledge/devops/full-stack-deploy-handbook.md) — 全栈部署检查清单：前端构建 + 后端 systemd + nginx 反代的全链路审计、8 项部署执行检查表、翻牌「部署通过」前的 verify 命令、3 类故障排查（TS 错误强行构建禁令 / dist 时间戳盲区 / 浏览器缓存）、5 条禁止事项。**触发事件**：本次 DevOps 翻牌「部署通过」后才被 Owner 索取 URL 时发现前端从未构建/部署，是本次会话最大的失误。
4. **更新** [`docs/knowledge/INDEX.md`](../../knowledge/INDEX.md) DevOps 节，新增 2 条索引、修订 db-migration-handbook 索引描述。

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

---

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

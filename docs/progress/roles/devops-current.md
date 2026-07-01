# DevOps 工作日志（当前）

> 最近 10 条工作日志。长期摘要、当前关注点和常见风险见 `devops-summary.md`；旧日志在 `devops-archive.md`。

## 2026-06-28 — v0.6 部署阶段：#142 去软链接化 + 前后端全隔离 + test/生产上线

> 角色：DevOps；模式：标准迭代 部署阶段（Owner「你是运维」→「去除软连接」→「进行部署：test/生产、与开发隔离、打包部署」）。

### 触发

承接 INDEX 跨任务待办 #142（去软链接化）+ v0.6「下一步=切 DevOps 部署生产」。Owner 三诉求：① test 部署 ② 生产部署 ③ 生产/测试与开发环境隔离、均通过打包部署上线。

### 执行

1. **打通通路**：本地公钥未授权，Owner 授权 `id_ed25519.pub` 后用别名 `zijie` 打通 SSH。
2. **盘点**：生产 `news.huiyiyou.cloud` 软链 → `frontend/dist`；test 已独立目录；生产/测试后端**共享** `/root/Project/.../server`（仅 systemd env 区分库/端口）→ 两层隔离缺口。前端走相对路径（prod/test 可共用一份 build 产物）。
3. **构建源**：服务器 git pull 到 `92beb8e`（开发收口已 push），前端 build、后端 deps 幂等。
4. **test 隔离**：建 `/srv/niuma-news/test/server` rsync server；纠正 env 真源；改 news-api-test unit WD→/srv；0007 回填 154 条 X 直显；整站验证通过。
5. **生产部署**（Owner 确认后）：备份 db/env/unit/nginx；建 `/srv/niuma-news/prod/server` + prod `.env`（`news` 库/AI 未放开）；库 schema 对齐（DROP 0006 残留唯一约束，约束 7→6 与 test 一致；0007 空库影响 0）；改 news-api unit WD→/srv + **去 `ExecStartPre migrate`**；前端去软链（symlink→真目录 + rsync）；起 news-api，公网首页/bundle/反代全通。
6. **隔离实证**：构建源 `frontend/dist` 写 canary，生产/测试 www 均不出现 → build 不再污染线上。
7. **沉淀**：固化 `deploy/deploy.sh`；更新 handbook（全隔离取代软链接模式）、INDEX（关闭 #142 + 部署阶段完成）、v0.6.md 部署就绪检查。

### 结论

✅ 部署通过（test + 生产）。两环境前后端与开发目录全隔离、均打包部署。

### 关键发现 / 教训

- **`.env.test` ≠ test 部署配置**：它是 `npm test`（vitest）的 `news_vitest` 库；test **环境**真源是 systemd unit 内联 env（`news_test`）。隔离迁移时不能拿 `.env.*` 当部署配置，要以**运行进程实际 env**（`/proc/PID/environ`）为准。
- **生产/测试库 drizzle 元数据脱轨**：schema 当初 `db:push` 建，`__drizzle_migrations` 只 1 条（或无），实际 schema 已 v0.6 → 带 `ExecStartPre=drizzle-kit migrate` 的 unit 会重放 0001~0007 撞已存在 schema 致起服失败。处置：去 ExecStartPre migrate，schema 变更走人工；恢复 migrate 机制需单独对齐元数据（技术债，建议登记）。
- **前端相对路径** → prod/test 共用一份 build 产物，区别仅 nginx 反代端口；去软链后前端打包目标 = nginx root `/var/www/<domain>`（真实目录）。
- **生产库几乎空**（1 源/0 新闻）使迁移风险大降，但部署成功 ≠ 生产有内容，需 Owner 配源。

### 下一步入口

Owner 验收生产/test 站点 → PM 执行 v0.6 迭代关闭检查；生产配信息源。

### 后续更新（2026-07-01 收尾据实补登）

- **数据迁移**：Owner 反馈生产"数据/空间全没"。核查证明非删除——生产 `news` 库自接手前（06-28 `pg_dump` 备份为证）就只有占位数据（"测试空间"/"Conflict Test"），Owner 真实数据一直在 `news_test`（AI/财经 + 154 新闻）；此前生产 `news-api` 长期 inactive，用户看的其实是 test 环境。应 Owner 要求把 `news_test` 8 张业务表迁到生产：停服 → 备份 `db-pre-migrate` → 事务内 TRUNCATE + 导入（`session_replication_role` 因 news 非 superuser 被拒，改用 pg_dump 拓扑顺序导入成功）→ 起服。生产得 AI/财经 2 空间 + 4 源 + 7 展示位置 + 154 新闻。
- **X sync 403**：Owner 报"X 规则同步失败"。定位为 admin 鉴权——`/v1/x/sync-rules` 走 adminGuard，生产 `ADMIN_TOKEN` 有值触发严格 token 校验，前端带的 token 不匹配 → 403（test 因 `ADMIN_TOKEN` 空跳过校验 + nginx 注入而无此问题）。交研发；开发重新部署修复（前端更新为 `index-Ufw1OiMD.js`，X sync 06-28 16:26 转 200）。**开发的重新部署未破坏隔离架构**（news-api WD 仍 `/srv/prod/server`、`/var/www/news` 仍 directory）。
- **代码合并**：本地部署留痕与远端最新（`64d87f4`，含开发 AI 联调入口 + PM 06-30 状态订正）合并——INDEX 让位 PM 最新版并叠加 DevOps 补登，其余留痕保留。
- **当前实况（07-01 核查）**：两服务均 active；生产 AI/财经空间在、新闻 worker 持续抓取增至约 320；X RULE SYNC 每日自动同步正常；隔离与去软链完好。
- **既有技术债（登记）**：生产/测试库 drizzle 迁移元数据脱轨（db:push 历史），两 unit 去 `ExecStartPre migrate`；后续如恢复 migrate 机制需单独对齐元数据。

## 2026-06-12 — v0.6 设计文档 R2 DevOps 复审 + 会话收尾（同日第 2 次出场）

> 角色：DevOps；模式：标准迭代 设计阶段 R2 复审。

### 触发

v0.6 设计文档 R2 前 3 方（PM / Developer / Tester）已完成 R2 复审均 ⚠️ 有条件通过，Owner 切到 DevOps 完成第 4 方复审闭环。

### 执行

1. 读 `runtime.md` + `INDEX.md` + `role-devops.md` + `devops-current.md`（确认 R1 11 条意见全文）+ `v0.6-design.md` 全文 2192 行（重点 R2 修改摘要 + Review 状态表 + PM/Developer/Tester R2 复审段）。
2. 按 R1 11 条逐条核验 R2 关闭情况，叠加 R2 新增内容部署层评估，叠加"R2 摘要 vs 正文不一致"在 DevOps 域的具体可执行性影响（与 PM R2 #P5 / Developer R2 #D12 / Tester R2 #T13 同源）。
3. 现场快速核验部署侧基线 8 项：`df -h` = 16GB 可用（与 R1 时点 15GB 偏差小，与 PRD R2 时点一致）；`systemctl is-active` = active；`/var/log/niuma-news-api.log` = 682K（R1 时点 +10K，6 小时增量符合 v0.5 增速）；`/var/lib/niuma-news/` 仍不存在；`deploy/` 仅 `systemd/news-api.service` 一文件；nginx 7 location 无 `client_max_body_size` 无 `/uploads/`；`server/package.json` 仍未装 `@fastify/multipart`。
4. 严守 DevOps 视角边界 + 与 PM/Developer/Tester R2 视角错开（R1 时段已踩过的"5 方一致 / 共识门槛达成"等聚合判断教训维持，本轮不预判 R3 vs 实施阶段）。

### 产出

**结论**：⚠️ **有条件通过（R2）**。R1 11 条 R2 关闭：1 完全关闭（#O6 由 §4.4/§4.5 间接关）+ 3 基本关闭（#O1/#O2/#O3 R2 摘要方向 100% 与 DevOps R1 推荐对齐——部署前置工作 / 选项 A / npm 增量 + native binding 红线，但**正文一字未动**）+ 6 合理分流（部署侧自治承接）+ 1 未关闭（#O8 client_max_body_size，1MB 边界 P0 风险，R2 摘要声称已关、正文未落）。R2 新增 1 条意见 #O15（中）：R2 摘要 vs 正文 4 处不一致致部署侧执行依据缺失，与 PM R2 #P5 / Developer R2 #D12 / Tester R2 #T13 同源——DevOps 视角强调"部署执行环节按正文拍 mkdir/nginx -t/apt install"，摘要方向不能直接落地。详见 `iterations/v0.6-design.md` DevOps R2 段（约 280 行）。

| # | R1 严重度 | 主题 | R2 关闭状态 |
|---|---|---|---|
| #O1 | 高 | uploads 目录创建/属主/权限 | 🟡 基本关闭（§4.7.1 部署前置工作摘要点了，正文无该子节）|
| #O2 | 高 | nginx 配置同步路径选 A/B/C | 🟡 基本关闭（DevOps 推荐选项 A 摘要采纳，但 §4.7 末尾仍写 deploy/nginx 矛盾）|
| #O3 | 高 | npm 依赖增量 + native binding 红线 | 🟡 基本关闭（方向对、§6.3 正文未落）|
| #O4 | 中 | logrotate 配置归属 | 🟡 合理分流（部署侧 handbook 自治承接）|
| #O5 | 中 | 磁盘容量预估 + 扩容触发线 | 🟡 合理分流 |
| #O6 | 中 | worker timeout 与并发对齐 | ✅ **完全关闭**（§4.4 3 sem 池 + §4.5 LLMCallOpts.timeout 间接关）|
| #O7 | 中 | 系统级磁盘告警与业务 alerts 分离 | 🟡 合理分流 |
| #O8 | 中 | nginx client_max_body_size | ❌ **未关闭**（R2 摘要声称关、正文未落，1MB 边界 P0）|
| #O9-#O11 | 低 | UPLOAD_DIR 命名 / 浏览器缓存 / §7.3 重复 | 🟡 合理分流 |
| **R2 新增** | | | |
| #O15 | 中 | R2 摘要 vs 正文 4 处不一致致部署侧执行依据缺失 | 与 PM #P5 / Tester #T13 同源 |

R2 间接贡献（schema/worker/llm 维度对部署侧友好）：`tasks.last_error_kind` 让 external_dep_down 告警可一行 SQL 实现 + `workerLoop` 5 sem 池策略（fetchSem/processSem/l1Sem）让 60s LLM 不阻塞 process_raw_item + `callLLM<T>` 双模型不破坏 v0.5 行为 + 错误归档对照表让运维侧可观测能力提升。**部署侧接力基础 75% → 82-85%**。

### 边界守住

- R2 复审严格控制在"R1 11 条逐条关闭核验 + R2 新增内容部署层评估 + 4 方一致 #P5 类问题在 DevOps 域影响"范围。
- 不重复审 PM 域（产品范围底线 + #P5 中影响产品语义部分）/ Developer 域（#D11/#D12/#D5）/ Tester 域（#T13 中影响测试用例部分）。
- 4 方一致的"R2 摘要 vs 正文不一致"问题中，DevOps 域是**最严重的一处**（PM/Developer/Tester 各 1-2 条不一致，DevOps 是 3 高 + 1 中共 4 条全部踩中）—— 把这点独立提出 #O15 是 DevOps 视角应有补充，与 PM #P5 / Tester #T13 同源不同视角。
- 不预设项目级聚合判断（是否定稿、是否进实施阶段、是否开 R3）—— 由 PM/Owner 决定。

### 同步动作

- 更新 `v0.6-design.md` Review 状态表（DevOps 待复审 → ⚠️ 有条件通过 R2）+ Review 记录区域追加 DevOps R2 段（约 280 行）。
- 更新 `v0.6.md` 设计阶段 R2 行：DevOps 复审状态 ⚠️ 有条件通过 + 11 条逐条结论摘要 + 阶段状态机械事实"4/4 方已完成 R2 复审"。
- 更新 `INDEX.md` 当前状态：阶段 → "设计阶段 R2 — 4/4 方均已完成 R2 复审" / 下一步入口 → "PM 介入 v0.6 设计文档 R2，决定开 R3 微调或直接进实施阶段"（不预判方案 A vs B，不预判共识/通过）；版本列表 v0.6 状态改为机械事实；最近收尾摘要表追加本次记录。

### 下一步入口

PM 介入 v0.6 设计文档 R2。后续推进决策（方案 A 开 R3 微调 vs 方案 B 不开 R3 + 部署侧自治承接 + 摘要文案订正）由 PM/Owner 决定。如最终走方案 B，DevOps 在 v0.6 部署就绪检查前自治承接以下 4 类（已写入 `v0.6-design.md` DevOps R2 段条件 B + 待沉淀到 handbook）：①目录创建命令 + 健康检查 / ②nginx 选项 A 手工增补 + `client_max_body_size 2m` / ③依赖增量预审 + native binding 红线 / ④logrotate + 磁盘告警 cron + 扩容触发线。

### 待办（自治承接）

会话本次未做、需在 v0.6 部署期前完成的部署侧 handbook 沉淀（同时与 R2 #O15 / #O3 / #O4 / DevOps PRD R2 #O14 联动）：
- `dependency-change-handbook.md` 增补"v0.6 依赖增量预审清单"小节
- `full-stack-deploy-handbook.md` 增补"v0.6 上传目录前置 + nginx /uploads/ + client_max_body_size 调优"章节
- `full-stack-deploy-handbook.md` 增补"logrotate 配置模板（copytruncate 关键性）"小节
- `full-stack-deploy-handbook.md` 增补"上线前 .env 真实性验证清单"

### DevOps 日志容量观察

current 当前 7 条（追加本次后），约 420 行，超过 `context-policy.md` 300 行阈值。下次会话开始时优先评估将最旧 2026-06-07 X 反向同步条目移入 `devops-archive.md`。

---

## 2026-06-12 — v0.6 设计文档 R1 DevOps Review + 会话收尾

> 角色：DevOps；模式：标准迭代 设计阶段 R1 Review。

### 触发

v0.6 设计文档 R1 前 2 方（PM / Tester）已完成 Review 分别 ⚠️ 有条件通过，Owner 切到 DevOps 完成第 3 方 Review。

### 执行

1.  读 `runtime.md` + `INDEX.md` + `role-devops.md` + DevOps 日志（确认 PRD R1/R2 意见全文）+ 8 项现场勘察（systemd / 磁盘 / 日志 / nginx 7 location / `/var/lib/niuma-news/` 不存在 / `deploy/` 目录 / dispatcher / config.ts）。
2.  读 `v0.6-design.md` 全文 1064 行 + PM R1 Review / Tester R1 Review。
3.  按 DevOps 视角逐段核验设计文档对 PRD R1/R2 12 条意见的承接情况 + 设计层新引入的部署侧硬约束 + 文档假设与仓库现状一致性。

### 产出

**结论**：⚠️ **有条件通过**。11 条意见（3 高 / 5 中 / 3 低）。详见 `iterations/v0.6-design.md` DevOps R1 段。

| # | 严重度 | 主题 | 与其他角色关系 |
|---|---|---|---|
| #O1 | 高 | `/var/lib/niuma-news/uploads/` 目录创建/属主/权限可执行清单缺失 | 部分同源 Tester #T8（上传异常路径）|
| #O2 | 高 | §4.7 / §6.3 写「同步到 deploy/nginx 和 deploy/scripts/deploy.sh」但两者在仓库均不存在 | 独立视角 |
| #O3 | 高 | §6.3 未列 npm 依赖增量 + native binding 红线未划 | 同源 PRD R1 #O5（残留）|
| #O4 | 中 | logrotate 配置文件产出来明确 | 同源 PRD R1 #O8（残留）|
| #O5 | 中 | 磁盘容量预估缺图标上传 + 扩容触发线 | 同源 PRD R1 #O2（细化）|
| #O6 | 中 | worker timeout 与 Fastify route timeout 对齐缺设计层定义 | 同源 PRD R1 #O1（细化）|
| #O7 | 中 | 系统级磁盘告警与业务级 alerts 表分离方案未定 | 独立视角 |
| #O8 | 中 | nginx `client_max_body_size` 缺失导致合法 1MB 上传被 413 拦截 | 部分同源 Tester #T8 |
| #O9 | 低 | env 项 `UPLOAD_DIR` 命名与未来扩展关系 | 措辞口径 |
| #O10 | 低 | 同 hash 重复上传的浏览器缓存反馈 | 措辞口径 |
| #O11 | 低 | §7.3 第 3 条与 #O1 内容重复 | 措辞口径 |

### 边界守住

-   严格控制在"部署方式、环境变量、云服务、发布风险、回滚条件"五个边界。
-   11 条意见全部基于"作为 DevOps 如何把这套设计上线"视角 + 现场 8 项勘察核验。
-   不复审 schema DDL（Developer 域）、ADR 选型（Architect 自审 + PM 域）、测试断言（Tester 域）。
-   不预设项目级聚合判断（是否定稿、是否进实施、是否开 R2）——由 Architect/PM 介入决定。

### 同步动作

-   更新 `v0.6-design.md` Review 状态表（DevOps 待 Review → ⚠️ 有条件通过）+ Review 记录区域追加 DevOps R1 段（约 230 行）。
-   更新 `v0.6.md` 设计阶段 R1 行（DevOps 结论填入 ⚠️ 有条件通过 11 条摘要）。
-   更新 `INDEX.md` 当前状态（阶段 → DevOps 已 Review / 等待 Developer；中性表述，不预判推进决策）。

### 下一步入口

Developer Review `iterations/v0.6-design.md`。

---

## 2026-06-11 — v0.6 PRD R2 DevOps 复审 + 会话收尾

> 角色：DevOps；模式：标准迭代 PRD 阶段 R2 复审。

### 触发

v0.6 PRD R2 前 4 方（Architect / UI / Developer / Tester）已完成复审，Owner 切到 DevOps 完成第 5 方复审。

### 执行

1. 读 `runtime.md` + `INDEX.md` + `role-devops.md` + DevOps current 层日志（确认 R1 12 条意见全文）+ `v0.6-prd.md` R2 改稿主体（§1-§6 + §3.1-§3.8 28 条 AC）+ 4 方 R2 复审段（Architect / UI / Developer / Tester）。
2. 现场快速核验部署侧基线无变化：systemd `news-api.service` active；磁盘 `40G / 22G 已用 / 16G 可用`（与 R1 时点一致）；`/var/log/niuma-news-api.log` 540K（R1 时点 428K，2 天增长 ~112K = 56K/天，与 v0.5 X Stream 日志增速预期一致）。
3. 按 R1 12 条意见逐条核验 R2 关闭情况，叠加 R2 新增内容部署层评估，叠加 R2 新引入意见识别。
4. 严格守 DevOps 视角边界：不重复审 Architect / UI / Developer / Tester 在 R1/R2 各自覆盖的视角（如 #A12-#A20 / #D14-#D15 / #T13-#T14 / #U13-#U14），仅在影响"部署侧实施路径"时标注配套调整方向。

### 产出

**结论**：⚠️ **有条件通过**。R1 12 条意见 5 完全关闭 / 4 基本关闭 / 2 合理分流 / 1 未关闭（#O8）。详见 `iterations/v0.6-prd.md` DevOps R2 段。

| # | 严重度 | 主题 | R2 关闭状态 |
|---|---|---|---|
| #O1 | 高 | 4 类外部依赖网络出口/超时/成本/速率 | 🟡 基本关闭（§5 边界表四列收敛 + Owner 决策不设成本上限） |
| #O2 | 高 | 原始信息入库 + L1 重试堆积磁盘告警 | 🟡 合理分流（Owner 接受本期不建治理能力 + §6.1 风险登记） |
| #O3 | 高 | 软链接部署 × 图标上传存储硬约束 | ✅ 完全关闭（§2.7 硬约束 + 持久目录方向） |
| #O4 | 高 | L0/L1 告警载体 | 🟡 基本关闭（AC-29~AC-32 落地；具体类型枚举/阈值留设计阶段） |
| #O5 | 中 | npm 依赖增量审计 | 🟡 基本关闭（§5 列出 multipart + 增量原则；具体 native binding 留设计阶段） |
| #O6 | 中 | env 三处同步流程 | ✅ 完全关闭（`.env.example` + 生产 .env + systemd EnvFile 三处同步原则写入 §5） |
| #O7 | 中 | mock 部署门禁 | ✅ 完全关闭（AC-25a/b/c + AC-35 部署前 grep） |
| #O8 | 中 | systemd 日志轮转 | ❌ **未关闭**（R2 0 字回应；建议 R3 补 1 句或部署侧自治承接） |
| #O9 | 中 | 回滚路径与无回头路边界 | 🟡 基本关闭（上传文件硬约束规避；DB 字段绑定用户数据后无回头路由设计阶段承接） |
| #O10 | 低 | 密钥轮换 SOP | 🟡 合理分流（handbook 承接） |
| #O11 | 低 | 浏览器缓存方向 | 🟡 合理分流（设计阶段细化） |
| #O12 | 低 | dry-check 命令清单 | 🟡 合理分流（部署侧 handbook 承接） |

**R2 新引入 2 条意见**：

| # | 严重度 | 主题 | 承接 |
|---|---|---|---|
| #O13 | 中 | LLM 供应商切换的 final_failed 爆增告警语义（与 #D14/#A20 同源） | 建议 PM 在 §6.1 或 AC-32 补一句；DevOps 在 `dependency-change-handbook.md` 增补"LLM 供应商切换观察清单"小节 |
| #O14 | 低 | 生产 .env 真实性验证清单（部署侧自治） | DevOps 在 `full-stack-deploy-handbook.md` 增补"上线前 .env 真实性验证清单" |

### 边界守住

- 严格控制在"部署方式、环境变量、云服务、发布风险、回滚条件"五个边界。
- 复审专注核验 R1 12 条意见的关闭情况 + R2 新增内容的部署层评估 + R2 引入的 2 条新意见（#O13/#O14）。
- 不重复审 Architect / UI / Developer / Tester 在 R1/R2 各自覆盖的视角。
- 与 #A17/#D15（告警阈值缺位）+ #A20/#D14（错误分类语义）部分同源但视角错开：DevOps 关注告警分级与部署侧响应。

### 同步动作

- 更新 `v0.6-prd.md` Review 记录区域追加 DevOps R2 段（约 130 行）+ Review 状态表 DevOps 待复审 → ⚠️ 有条件通过。
- 更新 `v0.6.md` PRD R2 行：DevOps 复审状态填入 ⚠️ 有条件通过 + 12 条逐条结论；阶段状态列改为机械事实「5/5 方已完成 R2 复审，等待 PM 介入」。
- 更新 `INDEX.md` 当前状态：阶段 → "PRD 阶段 R2 — DevOps 已复审（5/5 方已分别完成 R2 复审）" / 下一步入口 → "PM 介入 v0.6 PRD R2"（不预判 R3 vs UI 方案阶段，不预判共识/通过）；版本列表 v0.6 状态改为机械事实；最近收尾摘要表追加本次记录。
- 本次会话已纠错：上一轮 R1 收尾和本轮 R2 初版均越界写了"5 方一致 / 共识门槛达成 / 等待 PM 决定 R3 vs UI" 等项目级聚合判断，已按 Owner 反馈全部回滚为中性表述。聚合是否通过、是否进下一阶段属 PM/Owner 决策域，DevOps 不预设。
- DevOps 日志 current 层追加本次会话条目（current 当前 9 条，本次后 10 条恰好到分层阈值边缘；下次会话产生新条目时需评估是否将最旧 2026-06-06 PRD R1 Review 移入 archive 层）。

### 下一步入口

PM 介入 v0.6 PRD R2。后续任何阶段推进（R3 / UI 方案 / 其他）由 PM/Owner 决定，DevOps 不预判。设计阶段被 Review 时配套带入 4 条部署侧硬约束（详见 v0.6-prd.md DevOps R2 段条件 B）。

---

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


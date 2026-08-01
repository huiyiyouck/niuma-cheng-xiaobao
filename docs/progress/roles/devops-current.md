# DevOps 工作日志（当前）

> 最近 10 条工作日志。长期摘要、当前关注点和常见风险见 `devops-summary.md`；旧日志在 `devops-archive.md`。

## 2026-08-01（续2）— 生产 LLM provider 换 volcengine（INDEX 任务书 · 任务 1，备料不点火）

> 角色：DevOps；模式：任务书执行。Owner 拍板生产 LLM 对齐 test 同款。

- prod `/srv/niuma-news/prod/server/.env` LLM 段对齐 test volcengine：`OPENAI_BASE_URL=ark.cn-beijing.volces.com/api/plan/v3` + `OPENAI_API_KEY`（volcengine，同机同源，不入 git）+ `OPENAI_MODEL`/`L0_LLM_MODEL=deepseek-v4-flash`。备份 `.env.bak-20260801-task1`，**未重启**（AI 关、config 不被 running worker 读，下次开 AI 重启加载）。
- **红线守住**：`AI_INTEGRATION_MODE=http` 未动、`ENABLE_AI_PROCESSING` 未设 → `aiProcessingEnabled=false`，AI 仍关。
- **验证法偏差（记一笔）**：任务书原定「造 `l0_classify` task → succeeded」在红线下不可行——`dispatcher.ts:292` `if(!task && aiProcessingEnabled)`，AI 关时 worker 不 claim `l0_classify`。改用**直连 volcengine** 发最小 chat completion 验证：HTTP 200、model `deepseek-v4-flash-260425`、正常应答「可用」，等效证明 provider（key/端点/模型）可用。
- 备料完成，点火（开 AI）仍缺 ai 侧 prod worker 那环（见 #16 / ai v0.2 上生产里程碑）。

## 2026-08-01（续）— REQ-003 部署包 test+prod 落地（超时四项 + x-stream + 数组列收口）

> 角色：DevOps；模式：部署。Owner 部署包指令，test 先行、prod 一批。

- **代码 `166fe51`**（含 `744d20a` x-stream 适配批〔prod 前欠〕+ `51927cc` 超时四项 + 数组列收口）经 `deploy.sh test`/`prod`：pull→build→rsync→重启，news-api-test / news-api 均 `active`、health `200`。
- **`fix_sources_jsonb_array_columns.sql`** 手工 psql test+prod：`domain_tags` + `content_topics` 存量归一（object→数组）+ 默认值 `'{}'`→`'[]'` + 两条 CHECK 约束。**跑前预检**两库两列 jsonb 类型分布确认无 `null`/`string` 等（否则 CHECK 会失败回滚）；两库验证均 默认 `'[]'` / 非数组 0 行 / 2 约束。
- **§5 超时验证** 两库：以 `pool.ts` 同款 `options=-c` 机制连库 SHOW `30s/1min/5s` + `SET statement_timeout=1s; pg_sleep(2)` 被杀 + 重启后无超时误杀日志 + 近 1h 0 告警。`ai_worker` rolconfig 集群级此前已闭合，未重验。
- **持续项**：24h `alerts` 无新增超时类告警（观察窗）。
- 连带销账：INDEX 待办『下次生产部署 DevOps 验证包』标完成；『测试队列不可领』旧账核实闭合（seed 07-28 已订正、当前 6 可领 0 孤儿）。

## 2026-08-01 — REQ-003 契约 v1.7 阈值回填 + 8100 ai 服务链路排查

> 角色：DevOps；模式：跨项目协作收尾（REQ-003 契约 v1.7 遗留回填）。

### 核实 + 回填（`AI_STALE_TIMEOUT_MS`）
- **背景**：契约 v1.7（coordination `b2c581e`）把卡死回收阈值的实际生效值标为「待 DevOps 核实回填」——契约此前写的 1800s 系起草臆定无依据，代码默认 `600000`（`config.ts:95`），实际值取决于服务器 env。
- **核实**：直连部署机 `zijie`（`news.huiyiyou.cloud` / 115.191.43.79）grep 两库 `server/.env`：prod 与 test 的 `AI_STALE_TIMEOUT_MS` **均显式设为 `600000`（600s / 10 分钟）**，与代码默认一致，全场无 1800s。
- **回填**：契约 `news-l1-db.md` 三处（line 275 主 ⚠️ 块 / line 273 卡死阈值行 / line 4 v1.7 版本头 TODO），**不升版本**（完成契约自留的 DevOps 待办，非 Architect 改订）。commit `6209b72` 已 push。

### 8100 ai 服务链路排查
- **触发**：核实 env 时发现 prod=`AI_INTEGRATION_MODE=http`、test=`database`，两模式对 8100 依赖不同，遂实测。
- **实测**（zijie）：8100 端口 uvicorn（pid 3026041）在听 `127.0.0.1:8100`；`/health` 返回 `200`（1.2ms），ai 服务健康。prod `.env`：http 模式、**无** `AI_HUB_BASE_URL`、**无** `ENABLE_AI_PROCESSING`；test `.env`：database 模式。
- **判断**（据 `config.ts:90` `aiProcessingEnabled = getBool("ENABLE_AI_PROCESSING",false) || AI_INTEGRATION_MODE==="database"`）：
  1. **prod AI 整体关闭**：http 模式且未设 `ENABLE_AI_PROCESSING` → `aiProcessingEnabled=false`，prod 不发起对 8100 的调用（未配 `AI_HUB_BASE_URL` 也无影响）。与既有记录一致（生产 key 失效 / 生产 AI 关闭）。
  2. **test 走 database 队列**：claim/queue 机制，不走 8100 http 路径。
  3. 故本次回填的 `600000` 卡死回收阈值**只对 test（database 模式）有效**；prod AI 关闭、且 http 模式本就不触发这套 reclaim。
  4. 8100 的 ai 服务当前为「常驻热备 / 联调」态：活着但不在任何 prod/test 活跃集成路径上，闲置无害。

### 结论
契约阈值真源钉死（`600000`，双库一致，已回填 + push）。当前无环境走 8100 http 路径，8100 服务健康但闲置，无需处置、记录在案。生产上 AI 前仍需先定 LLM provider（既有遗留）。

## 2026-07-27~30 — v0.6.1 生产部署 + REQ-003 数据库边界 DevOps 全系列（跨会话汇总）

> 角色：DevOps；模式：标准迭代部署 + 跨项目协作（REQ-003）。本条汇总一系列工作，逐项详情见 coordination `communications/REQ-003-db-boundary-async.md` 与本项目 INDEX。

### v0.6.1 生产部署（07-27）
- `deploy.sh both` → `2c20da6`，Architect R4 三项核实全过（#A-R4-1 无 proxy_cache / #A-R4-2 `ADMIN_REQUIRE_BOTH=false` / #A-R4-4 verify 0 行）；新 bundle `index-BFek7phs.js`，公网/API 字段验证通过。R4 代码遗留 3 项（#A-R4-3 外链 XSS / #A-R4-5 / #A-R4-2）登记 INDEX 跨任务待办转 Developer。

### REQ-003 DevOps 交付（07-25~30）
- **ai_worker 角色 + 列级 GRANT**：`v0.6.1_ai_contract.sql` 执行到 `news_test` + 生产 `news`（postgres 超级用户，news 无 CREATEROLE），逐列对齐契约 + 端到端连库 + 越权拦截验证。
- **多轮 GRANT 增补**：契约 v1.3 三列（`source_item_url`/`l0_label` SELECT + `run_after` UPDATE）、C-14 `sources`（`domain_tags`/`attention_level` SELECT），test+prod 双库对称。
- **造数脚本**：`seed_ai_queue_test.sql` 初版只 reset raw_items 未建 task（ai 领不到），修正为同步建 `l1_ai_process` task；补建 5 条 queued 供冒烟。
- **L0 链路修复**：`news_test` 8 条 `l0_classify` 全 failed，根因 LLM key 失效（401）+ `L0_LLM_MODEL` 默认 `gpt-4o-mini` 撞 endpoint（400）；改用 OpenClaw `volcengine-plan` provider + `deepseek-v4-flash`，端到端验证 L0 `succeeded`（`l0_label=high_priority_candidate`、自动建 `l1_ai_process` task）。8 条原 failed 保留现场。
- **澄清/纠错**：契约「四处不一致」系我误读参照源（撤回）；`run_after` UPDATE 伪确认点撤回；C-6 `processing` 笔误更正（`tasks.status` 后端用 `running`，与 C-2/ai 一致无分叉）。C-6 行锁在列级 GRANT 下可行（DevOps 佐证 + ai 并发验证闭合）；KB token 定方案 A（同机直连免 token）。

### 遗留（待推进）
- **生产 LLM provider**：生产 key 同失效，生产 AI 关闭故无当前影响；生产上 AI/L0 前需定 provider + 更新生产 `.env`。
- ~~**domain_tags 预期类型**：`sources` 2 array + 2 `{}`（脏数据）……定后 DevOps 归一 + 造数~~ → ✅ **已闭合（2026-08-01）**：Architect 已定型（数组，`{}` 系误写，契约 v1.6/v1.8）；DevOps 已归一 test+prod 存量各 2 个 `{}`→`[]`（0 残留）；非空冒烟条目已有 `303fc961`（`["AI"]`）覆盖。**剩列 DB 默认值迁移**——`schema.ts:68` 代码侧已 `'[]'::jsonb`，但 test/prod 库列 DEFAULT 仍 `'{}'::jsonb`（漂移），转 Developer（见 INDEX 跨任务待办 P2）。
- **L0 model 选型**：test 暂用 `deepseek-v4-flash`，Owner 可调（volcengine 网关多 model）。

### 下一步入口
DevOps 无独立主动待办；~~等 Architect 定 domain_tags 预期 → DevOps 归一+造数~~（已闭合，见遗留）；生产上 AI 前定 provider；`domain_tags` 列默认值迁移已转 Developer（INDEX P2）。

## 2026-07-12 — v0.6.1 PRD R1 DevOps Review

> 角色：DevOps；模式：标准迭代 PRD 阶段 R1 Review。

### 触发

v0.6.1 PRD R1 PM 已产出（2026-07-12 更新版），指定 Review 方 Architect / Developer / DevOps。Architect 已完成 R1（❌ 需修改 5 条），Owner 切到 DevOps 完成 Review。PM 在开放问题 5 明确标注"灰度切换策略待 DevOps Review 后确定"。

### 执行

1. 读 `runtime.md` + `INDEX.md` + `role-devops.md` + `devops-current.md`（确认 v0.6 部署经验与既有技术债）+ `devops-corrections.md`（强制全读，1 条：不越界改代码）+ `v0.6.1.md` + `v0.6.1-prd.md` 全文 + Architect R1 Review 段。
2. 基线参考据 devops-current.md 07-01 补登：两服务 active、生产 worker 抓取约 320 条、隔离与去软链完好、既有技术债——生产/测试库 drizzle 迁移元数据脱轨（两 unit 去 ExecStartPre migrate）。
3. 按 DevOps 视角逐段核验 PRD 对部署方式、环境变量、云服务、发布风险、回滚条件五个边界的覆盖情况。
4. 严守 DevOps 视角边界：不重复审 Architect #A1-#A5（状态字段/写回职责/数据流转/卡死回收/字段命名的架构设计），仅在影响部署落地时标注配套方向。

### 产出

**结论**：❌ **需修改**。10 条意见（3 高 / 4 中 / 3 低）。详见 `iterations/v0.6.1-prd.md` DevOps R1 段。

| # | 严重度 | 主题 | 与其他角色关系 |
|---|---|---|---|
| #O1 | 高 | 共享库权限边界部署侧实施路径缺失（AC-10 落地：新建 ai_worker 用户 + GRANT 限定表/列） | 独立视角（Architect #A2 同源但关注边界清晰度，DevOps 关注 GRANT 范围） |
| #O2 | 高 | 灰度切换数据一致性与回滚路径未定（PM 开放问题 5 明确待 DevOps 定） | 独立视角 |
| #O3 | 高 | ai worker 部署模式变更对 xiaobao 部署侧影响未评估（ai-hub.ts 策略+部署时序+过渡期） | 独立视角 |
| #O4 | 中 | 数据库连接资源与连接池配置 | 独立视角 |
| #O5 | 中 | 运维侧监控告警缺位（进程/队列/卡死回收/最终失败） | 部分同源 Architect #A4（卡死回收设计 vs 回收告警） |
| #O6 | 中 | 环境变量增量清单与三处同步流程 | 独立视角（v0.5.1 部署经验承接） |
| #O7 | 中 | 回滚路径与无回头路边界 | 独立视角 |
| #O8 | 低 | 上线前 dry-check 命令清单 | 独立视角 |
| #O9 | 低 | 数据库迁移脚本与备份策略（drizzle 元数据脱轨技术债处理） | 独立视角 |
| #O10 | 低 | 部署时序与跨项目协调验证清单 | 独立视角 |

### 边界守住

- 严格控制在"部署方式、环境变量、云服务、发布风险、回滚条件"五个边界。
- 10 条意见全部基于"作为 DevOps 如何把这套集成模式切换上线"视角 + v0.6 部署经验（去软链/隔离/drizzle 元数据脱轨）+ v0.5.1 部署经验（env 三处同步/dry-check）。
- 不复审状态字段策略（Architect #A1）、写回职责架构（Architect #A2）、数据流转（Architect #A3）、卡死回收设计（Architect #A4）、字段命名（Architect #A5）、xiaobao 侧改造工程量（Developer 域）。
- 不预设项目级聚合判断（是否进 R2 / 是否定稿）—— 由 PM/Owner 决定。
- PM 开放问题 5"灰度切换策略待 DevOps Review 后确定"是 DevOps 必须回应的，#O2 给出三选一推荐方案。

### 同步动作

- 更新 `v0.6.1-prd.md` Review 状态表（DevOps 待 Review → ❌ 需修改）+ Review 记录区域追加 DevOps R1 段（约 40 行意见表 + 整体评价 + 不阻塞观察）。
- 更新 `v0.6.1.md` PRD R1 行：3 方 Review 结果填入 + 阶段状态改为「R1 Review完成（3/3方已Review）」+ Git 关键节点追加 Review 完成行。
- 更新 `INDEX.md` 当前状态：阶段 → "PRD R1 Review完成（3/3方已Review）" + 下一步入口 → "PM 汇总 3 方 R1 意见产出 PRD R2"；版本列表 v0.6.1 状态更新；最近收尾摘要表追加本次记录。

### 下一步入口

PM 汇总 3 方 R1 意见（Architect 5 条 + Developer + DevOps 10 条）产出 PRD R2。#O2 灰度策略三选一推荐方案①（先全量切数据库模式，HTTP 客户端代码保留但默认不调用）供 PM 参考。

### DevOps 日志容量观察

current 当前 8 条（追加本次后），约 530 行，超过 `context-policy.md` 300 行阈值。下次会话开始时优先评估将最旧 2026-06-07 两条移入 `devops-archive.md`。

---

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


# DevOps 工作日志（当前）

> 最近 10 条工作日志。长期摘要、当前关注点和常见风险见 `devops-summary.md`；旧日志在 `devops-archive.md`。

## 2026-08-03 — ai v0.2 上生产里程碑点火：prod 切 database + 首批 5 条实测（provider 挂，转 ai）

> 角色：DevOps；模式：里程碑部署（Owner 放行「搭最新的环境」）。ai 侧 08-03 报 prod worker 部署完成（`niuma-ai-worker@prod`，127.0.0.1:8103，RUN_MODE=db），交四件事。

- **前置核对**：8103 `/health` mode=db 空转正常；④ 6i① default `'[]'` + 2 CHECK 已在位（08-01 做过）；③ 补算 tick 已在 prod（08-02 两批）；任务面干净（0 l0/l1 task）——四件事实际只剩 ①②。
- **切换**：备份 `.env.bak-20260803-flip` → `AI_INTEGRATION_MODE=database` + `AI_HUB_BASE_URL=http://127.0.0.1:8103`（注释：仅回滚生效，顺序见 ai 帖 §五）+ 订正三条过时护栏注释 → 重启 active + health 200。
- **小批量 5 条**（3 有值源 + 2 空值源，120 条积压全 `process_type=ai`、0 有 processed_news 无复位需求）：ai worker **秒级 claim**，重试退避 → **5/5 `llm_process:provider_error` final_failed**，0 残留锁，raw/task 状态同步正确——**我方链路机械全通，ai prod provider 挂**（其 08-02 自报过期 CodingPlan 归其 DevOps 更新，08-03 部署验证未含真实 LLM 调用）。
- **处置**：保持 database 不回切（X 断流无自然流量，无实害；回滚预案在手）；coordination 回执帖 + 登记待跟进 22 转 ai DevOps（`a228913`）。修复后用 #7 重试接口恢复 5 条再放量。
- **风险敞口（挂起监视）**：X 断流恢复前 ai 须修完 provider，否则新推文进失败链不直显；已在帖内催。

## 2026-08-02（续2）— 非单调修复批（662238a）部署 test+prod + coordination 知会

> 角色：DevOps；模式：部署。Developer 非单调核对闭环批（补算 tick 全 0 判据 + seed 复位修复 + 幂等护栏订正）落地。

- 前置：diff `c55869d..662238a` 仅 5 文件（worker/脚本/测试/docs），无依赖变更。
- `deploy.sh both`（nohup）：双端 active + health 200；复核 `isSilentZeroDims` test/prod 双端在位、服务器 seed 脚本副本已带 `running` 护栏。
- **12 条 queued 队列实查完好**（部署不动 DB）；存量 total 已由 Developer 复位——ai 重跑后 total 全为新 dims 公式值。
- 留痕：coordination 知会帖（`707f450`）+ INDEX 部署项销账。

## 2026-08-02（续）— 前端修复部署 + seed 补 12 条（销 21）+ 子项 5 证据 + kb-search 收敛回帖

> 角色：DevOps；模式：跨项目协作（Owner 指令「回到沟通文档」）。ai 侧当日已跑通端到端主路径 8/8，最新帖点名我方三件事。

- **前端修复部署**：`aa7a05a`（三处 ai 写回消费缺陷）`deploy.sh both`（nohup 脱会话）上 test+prod：双端 active + health 200 + 公网 200，新 bundle `index-CljE8E8S.js`；coordination 知会（ai「等贵方 ③」闭）。销 INDEX「前端修复随下次部署」项。
- **seed 补 12 条**（ai 请求 8~12，销待跟进 21）：有值源 3 条（`303fc961`/`43e0a770`/`6aa19d77`）定向 reset + 幂等脚本 `N=9`（sed 覆写不动仓内脚本）；验证 queued=12、有值 3、raw/task 一致、全可领。
- **⚠️ 操作事故与纠偏（记档）**：定向 reset 的 WHERE 写成「按源」，误将有值源全部 57 条历史条目入队（含 54 条既有 completed）。同会话内事务纠偏：54 条删新建 task + 按其 processed_news 恢复 `completed`（`l1_processed_at` 取 processed_news 落库时间近似、`l1_attempt` 置 1）；最终态 12 条与目标一致。窗口数分钟、ai worker 未常驻，无 claim 发生；已在 coordination 帖如实留痕。**教训：reset 类 UPDATE 先 SELECT count 预检命中行数再执行。**
- **子项 5（ai 不可用不阻塞）证据**：长时段（v0.2 全程 worker 未常驻、两环境正常）+ 当前实查（active/公网 200/alerts 0/无 running 残留）；prod 近 24h 抓取 0 系 X Stream 断流既有问题，如实标注不冒充。建议 ai 销项。
- **kb-search 绑定收敛回帖**：答 ai 端点基线帖 §四——非有意（`.env` 缺 HOST 走默认），已收敛 127.0.0.1，双环境仅回环可达。
- **score_total 非单调**：不越权答公式，转 Developer（INDEX 登记 + 帖内声明），连带 ai 的「JOIN tasks 未限定 type」排雷提示。
- 留痕：coordination `7e6f1b5`（回帖 + 销 21 + 更新 7）。

## 2026-08-02 — Developer 三项部署 + needs_context 落库 test+prod + coordination 销待跟进 18

> 角色：DevOps；模式：部署（Owner 指令「部署并回复」）。

- **起因**：Owner 让核对 ai 侧沟通文档「needs_context 列迁移落库…不卡开工，卡联调」一说。核实：coordination REQ-003 待跟进 18 确有此行、描述与实机一致（脚本 `0c01e51` 就绪、两库列确不存在，ssh 实查 count=0）——无需修正，球在我方（落库后回帖销行）。Owner 随即指令部署。
- **前置检查**：待部署 `166fe51..0c01e51`（16 commits，代码仅 Developer 三项：`l1-tasks.ts`/`schema.ts`/`worker/index.ts`/`l1-processor.ts` + 迁移脚本 + 新测试）；**package.json 无变更**（无依赖风险）；部署机构建源干净。
- **部署**：`deploy.sh test` 先行 → `news-api-test` active + health 200 + 日志干净（WORKER START 正常）。prod 首跑**被 SSH 瞬断打断在中途**（前端已 rsync、后端未同步、未重启——半完成态，幸本批无前端代码变更无实害）；改 **nohup 脱离会话**重跑 → 完整通过：`news-api` active + health 200，新代码/脚本已同步（`backfillScoreTotalTick` 在位），11:13 重启，日志正常（X STREAM 瞬断重连为已知常态）。
- **落库**：`add_processed_news_needs_context.sql`（幂等）psql 执行 `news_test` + `news`，两库 `information_schema` 验证 **`needs_context / boolean / nullable=YES`**，与契约 v1.9 一致。
- **销账**：coordination 回帖（xiaobao DevOps 08-02 帖）+ 待跟进 18 标 ✅（`3df2b40` 已 push）——ai 写回联调前置至此全齐。
- **例行**：08-01 部署观察窗到期确认——prod/test 36h 内 **0 条**告警（含超时类），窗口干净关闭。
- **经验（记一笔）**：部署机 SSH 抖动期，长命令一律 `nohup … > log &` 脱离会话跑 + 轮询取结果，避免半完成态；本次半完成态靠「前端 bundle 已新、后端 grep 无新代码、服务未重启」三点交叉核出。
- **顺办 · kb-search 绑定收敛**（Architect 同日转的核对项）：核实 prod 绑 `0.0.0.0:8000` **非有意**——prod `.env` 缺 `HOST` 走 `config.ts:62` 默认，test 显式回环。补 `HOST=127.0.0.1` + 重启（备份 `.env.bak-20260802-host`）；验证绑回环 + health 200 + 公网 nginx 200。nginx 反代/KB 同机直连均走回环，零影响。

## 2026-08-01（续3）— 6i② 冒烟条目收尾（INDEX 任务书 · 任务 3）

> 角色：DevOps；模式：任务书执行。

- `news_test` `["AI"]` source（`8ab58eb2`）补 2 条待处理条目 + 重跑 `seed_ai_queue_test.sql`（psql，`UPDATE 5`/`INSERT 0` 幂等跳过已有 task）。
- 现 8 条 queued `l1_ai_process`、**3 条挂非空数组 `domain_tags`**（`303fc961`/`43e0a770`/`6aa19d77`=`["AI"]`）、全可领 → 冒烟同时覆盖「有值」+「空值」两路径。
- 留痕：coordination 待跟进 6i② 已销行、6i 全项闭合（`b4a0178`）；INDEX 任务书任务 3 标 ✅。

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

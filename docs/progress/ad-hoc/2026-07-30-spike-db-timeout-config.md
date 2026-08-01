# 数据库超时配置方案（共享库场景）

- 日期：2026-07-30
- 模式：Tech Spike / 技术方案（非迭代）
- 角色：Architect
- 状态：方案待确认（Owner 已定「契约 + ad-hoc」落点与「全套四项」范围）
- 关联：REQ-003 数据库契约边界异步解耦；coordination `contracts/news-l1-db.md`
- Review 说明：本方案涉及**部署配置**（pool 参数、`ALTER ROLE`）与**跨项目契约**，按 `non-iteration-quick.md` §禁止项与 Review，**邀 DevOps 确认实施侧**（服务器执行 `ALTER ROLE`、env 落地），并**须先告知 ai 侧再执行**（见 §5 风险）。代码改动由 Developer 落。

## 1. 现状：数据库层超时一个都没有

| 位置 | 现有配置 | 缺什么 |
|------|---------|--------|
| `server/src/db/pool.ts` | `max: 10`、`idleTimeoutMillis: 30000`（**连接池空闲回收**，非语句超时） | `connectionTimeoutMillis` |
| PG 会话级 | 无任何设置，全部走 PG 默认（= 不限制） | `statement_timeout` / `idle_in_transaction_session_timeout` / `lock_timeout` |
| `server/src/shared/config.ts` | `llmTimeoutMs` 60s / `aiHubTimeoutMs` 180s / `openclawTimeoutMs` 200s / `aiStaleTimeoutMs` 600s | 全是**应用层**超时，无一项作用于数据库连接 |

> 注：`idleTimeoutMillis: 30000` 常被误认为语句超时。它是 node-pg 连接池回收**空闲连接**的时间，与 SQL 执行时长、事务挂起无关。

## 2. 为什么现在必须补：共享库把单方问题变成双方问题

v0.6.1 之前只有 xiaobao 一方连库，卡住的是自己。v0.6.1 起 `ai_worker` 与 news-api / worker **共用同一个库**，出现三条此前不存在的风险链：

**风险 A — ai 长事务持锁，拖垮我方卡死回收**

ai 单条处理 wall-clock 预算 240s。若 ai 在**事务内**执行 LLM 调用，该连接处于 `idle in transaction` 状态并持有 `FOR UPDATE` 行锁。此时：

- 我方 `reclaim.ts` 要把该 task 从 `running` 改回 `queued` → **UPDATE 被行锁阻塞**；
- 我方无 `lock_timeout` → reclaim 的 UPDATE **无限等待**；
- reclaim 跑在 worker 主循环里 → **整个回收机制挂住**，不只这一行。

一个卡住的 ai 事务，能让我方的自愈机制全面失效。这是最需要堵的一条。

**风险 B — 慢查询占满连接池**

`max: 10`，无 `statement_timeout`。任何一条失控查询（缺索引的全表扫、锁等待）会长期占用连接；10 条即池满，API 全线 503。ai 侧的查询同样占这个库的资源。

**风险 C — 建连挂起**

无 `connectionTimeoutMillis`，网络异常时 `pool.connect()` 可能长期挂起而非快速失败。

## 3. 方案：四项配置 + 取值

### 3.1 xiaobao 侧（news-api + worker）

| 参数 | 取值 | 依据 |
|------|------|------|
| `statement_timeout` | **30s** | 常规查询 <1s；最慢的是 `/global-level-status-counts` 的全表 FILTER 聚合与新闻列表 DISTINCT ON，实测远小于 1s。30s 留 30 倍余量，只杀真正失控的语句 |
| `idle_in_transaction_session_timeout` | **60s** | 我方最长事务是 `l0-classifier.ts:161-199` 的 `BEGIN..COMMIT`（几条 UPDATE/INSERT，<100ms）。60s 是纯兜底，正常永不触发 |
| `lock_timeout` | **5s** | reclaim / 写回等锁时拿不到即放弃。reclaim 是周期性 tick，天然可重试，宁可这轮跳过也不能阻塞主循环 |
| `connectionTimeoutMillis`（pool） | **10s** | 同机直连正常 <100ms，10s 快速失败 |

**不适用范围**：人工执行的 SQL 迁移（`psql` 直连，不走 pool），迁移脚本可能长时间运行，不受上述限制——这是对的，不要给迁移连接设 `statement_timeout`。

### 3.2 ai_worker 侧：用 `ALTER ROLE` 强制，不依赖对方自觉

> ⚠️ **本节已于 2026-08-01 被修订，见 §8**：执行方改为 ai 侧（方案甲），取值改为 ai 的 `4s`/`3s`；且本节「强制」的定性**是错的**——`ALTER ROLE` 对 `USERSET` 参数不构成强制。下文保留作决策轨迹。

共享库场景下，schema 权属方应当在**数据库层**为对方角色兜底，而不是只在契约里写「请 ai 自行配置」：

```sql
ALTER ROLE ai_worker SET statement_timeout = '30s';
ALTER ROLE ai_worker SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE ai_worker SET lock_timeout = '5s';
```

优点：ai 侧零配置即生效；新增 ai 实例、换连接库、改代码都不会绕过；与 GRANT 同属「权属方的边界控制」，语义一致。

`ALTER ROLE ... SET` 对**新建会话**生效，已有连接需重连。

### 3.3 实施方式（xiaobao 侧代码）

`pool.ts` 加连接参数，一次性随连接下发、无额外往返：

```js
const pool = new pg.Pool({
  connectionString: toPgDsn(config.databaseUrl),
  ssl: buildSslConfig(),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: config.dbConnectTimeoutMs,       // 新增
  options: `-c statement_timeout=${config.dbStatementTimeoutMs}`
         + ` -c idle_in_transaction_session_timeout=${config.dbIdleTxTimeoutMs}`
         + ` -c lock_timeout=${config.dbLockTimeoutMs}`,     // 新增
});
```

对应 `config.ts` 四个 env（沿用现有 `getInt` 风格，默认值即上表）：

```
DB_STATEMENT_TIMEOUT_MS=30000
DB_IDLE_TX_TIMEOUT_MS=60000
DB_LOCK_TIMEOUT_MS=5000
DB_CONNECT_TIMEOUT_MS=10000
```

> 备选实现是 `pool.on('connect', c => c.query('SET ...'))`，但每建一条连接多一次往返，且失败难以感知。优先用 `options`（直连场景可用；若将来引入 PgBouncer 需改回 `SET` 方式）。

## 4. 对 ai 侧的硬约束（必须先告知再执行）

`idle_in_transaction_session_timeout = 60s` 会终止「处于事务中但空闲超过 60s」的会话。**ai 若在事务内等待 LLM 返回，该连接正处于此状态**，240s 的处理预算必然超过 60s → 会话被 DB 终止、事务回滚。

因此契约需明确一条架构约束：

> **claim 事务与处理必须分离**：claim（含 `SELECT ... FOR UPDATE SKIP LOCKED` 与状态写入）在一个短事务内完成并立即 `COMMIT`；LLM 处理在**事务外**执行；结果写回时另开事务。事务内不得包含任何 LLM / 网络等待。

这本就是长任务 worker 的正确写法（长事务持锁是反模式），设置超时只是把它变成强制。但**必须先同步 ai 侧确认其事务边界，再执行 `ALTER ROLE`**——否则联调时会表现为「连接莫名断开、任务反复回滚」，排查成本高。

## 5. 验证方法

实施后逐项验证（DevOps 执行，每条一行 SQL）：

```sql
-- 1. 确认 xiaobao 连接生效（在 news-api 连接上查）
SHOW statement_timeout; SHOW idle_in_transaction_session_timeout; SHOW lock_timeout;

-- 2. 确认 ai_worker 角色级生效
SELECT rolname, rolconfig FROM pg_roles WHERE rolname = 'ai_worker';

-- 3. 行为验证：语句超时
SET statement_timeout = '1s'; SELECT pg_sleep(2);   -- 期望 ERROR: canceling statement due to statement timeout

-- 4. 行为验证：事务空闲超时（新开会话）
BEGIN; SELECT 1;  -- 等待 > 60s 后再执行任意语句，期望连接已被终止
```

回归：验证后跑一次完整抓取链路（fetch → L0 → 直显/AI 分流），确认无语句被误杀；观察 24h `alerts` 无新增超时类告警。

## 6. 待办与归属

| # | 事项 | 归属 | 前置 |
|---|------|------|------|
| 1 | 契约 `news-l1-db.md` 补超时约定 + claim 事务边界硬约束 | Architect | — |
| 2 | 沟通文档告知 ai 侧，确认其事务边界后再执行 | Architect → ai | #1 |
| 3 | ~~`pool.ts` + `config.ts` 四项配置落代码~~ ✅ 已完成（2026-08-01 Developer，见 §9） | Developer | #2 确认 |
| 4 | 服务器执行 `ALTER ROLE ai_worker SET ...`（test 先行，prod 随部署） | DevOps | #2 确认 |
| 5 | 按 §5 验证并回写本文档 | DevOps | #3 #4 |

## 7. 顺带发现：`AI_STALE_TIMEOUT_MS` 的实际值需 DevOps 核实

ai 侧沟通文档中多处称「xiaobao 的 1800s 卡死回收」，我方回帖与契约 v1.6 沿用了该数字。但 `config.ts:95` 的默认值是 **`AI_STALE_TIMEOUT_MS = 600000`（600s）**，非 1800s。实际生效值取决于服务器 env（本地不可见）。

请 DevOps 核实 test / prod 两侧 `.env` 的实际取值并告知，我方据实订正契约与沟通文档——两侧对回收窗口的认知必须一致，否则 ai 会按错误的窗口设计自愈逻辑。

> 这条与本方案同源：**卡死回收窗口（600s？1800s？）与 `idle_in_transaction_session_timeout`（60s）应当有明确的量级关系**——事务级超时远小于任务级回收窗口，才能保证「ai 卡住 → 先被 DB 断事务释放锁 → 再被我方回收」这个顺序，而不是反过来让回收撞上未释放的锁。取值确认后应在契约里把这个关系写明。

**已核实（2026-08-01，DevOps）**：test 与 prod 的 `server/.env` 均为 `AI_STALE_TIMEOUT_MS=600000`（600s，与代码默认同值）。60s : 600s = 1:10，量级关系成立。

## 8. 方案变更（2026-08-01）

### 8.1 `ALTER ROLE` 执行方改为 ai 侧（方案甲），取值以 ai 为准

两侧都计划对同一角色执行 `ALTER ROLE`、取值不同（我方 30s/5s、ai 侧 4s/3s，ai 更严），存在互相覆盖风险。ai 提出甲/乙两案，我方 DevOps 选**方案甲**：

| 参数 | 角色级实际生效值 | 权属 |
|------|-----------------|------|
| `statement_timeout` | **4s**（ai 值） | ai 自主，改动无需通知我方 |
| `lock_timeout` | **3s**（ai 值） | 同上 |
| `idle_in_transaction_session_timeout` | **60s**（我方值，保留） | **跨项目约定上限**——ai 可更严不可放宽，放宽须先改契约 |
| 建连 / 事务级总超时 | ai 应用层配 | `ALTER ROLE` 设不了 |

**我方撤回自行执行 `ALTER ROLE` 的计划**（§3.2、§6 待办 #4 作废）。§3.1 的 xiaobao 侧四项配置不受影响，照常落地。

只把 `idle_in_transaction_session_timeout` 定为约定项，是因为它保护的不是 ai 而是**我方的 reclaim**；其余两项只作用于 ai 自己的语句。

### 8.2 更正：`ALTER ROLE` 从来不是「强制」（§3.2 的定性是错的）

§3.2 写「用 `ALTER ROLE` 强制，不依赖对方自觉」「新增实例 / 换连接库 / 改代码都绕不过」——**错的**。这三项都是 **`USERSET` 参数，应用层 `SET` 随时可覆盖角色默认值**（ai 侧实测：`ai_worker` 非超级用户但可自改这些参数）。

`ALTER ROLE` 的真实价值只是**「应用层忘记 SET 时的兜底默认」**。真正绕不过的边界只有 GRANT / REVOKE 一类权限控制——我把两种性质不同的机制混为一谈了。

据此重评：由谁执行**兜底效果相同**，而方案甲还消除了「角色默认比应用层严 → `SET` 生效前偶发失败」的边角。**方案甲严格优于原方案**，不是妥协。

### 8.3 `AI_STALE_TIMEOUT_MS` 升格为跨项目契约参数

ai 按 600s 重算其不变式 `N × (单条预算 + DB上界) < 阈值 × 0.6`：

| 项 | 原（按错误的 1800s） | 现（按实际 600s） |
|---|---|---|
| 余量 | `263s < 1080s`，约 4 倍 | **`263s < 360s`，仅 1.37 倍** |
| `N` 可行取值 | N=1 最优、N=2 尚可 | **N=1 是唯一合法值** |
| 单条预算上调空间 | 1057s | **337s** |

这暴露一个结构问题：**该值形式上是我方一个 env，实质约束着 ai 的批量上限与处理预算**，而它此前被当作内部配置，谁都能改、改了 ai 收不到任何信号。后果对称——我方调小会导致 ai 任务被误回收并重复处理；ai 要提 `N` 或上调预算超 337s 必须先请我方调大。

**契约 v1.8 已将其升格为跨项目契约参数**：任一侧变更前先改契约并通知对方，与表结构、状态枚举同级。v1.6 及以前「阈值 1800s」的错误之所以长期未被发现，原因之一正是它没被当作契约项。

### 8.4 待办变更

- ~~#4 服务器执行 `ALTER ROLE ai_worker SET ...`~~ → **转 ai 侧执行**（方案甲），我方仅需在其回帖告知实际写入值后核对。
- #2「须 ai 确认事务边界」→ ✅ **已解除**（ai Architect 2026-08-01 确认「事务内不含 LLM 调用」）。
- #3（`pool.ts` + `config.ts` 四项）~~**前置已清，可直接落**~~ → ✅ **已落代码**（2026-08-01 Developer，见 §9）。

## 9. 实施记录（2026-08-01，Developer — 待办 #3）

按 §3.1 取值 / §3.3 方式落码，三处改动：

- `server/src/shared/config.ts`：数据库段新增四项 `getInt` 配置（`DB_STATEMENT_TIMEOUT_MS=30000` / `DB_IDLE_TX_TIMEOUT_MS=60000` / `DB_LOCK_TIMEOUT_MS=5000` / `DB_CONNECT_TIMEOUT_MS=10000`）
- `server/src/db/pool.ts`：`connectionTimeoutMillis` + `options` 连接参数下发三项会话级超时（按 §3.3 备注，将来引入 PgBouncer 需改回 `SET` 方式）
- `server/.env.example`：同步四项 env（默认即推荐值）

验证（本地经 SSH 隧道 → `news_vitest`）：

- `tsc --noEmit` 0 错误；全量单测 **65/65**（全部用例经新 pool 配置连真实 PG）
- 经 pool 实查生效值：`statement_timeout=30s` / `idle_in_transaction_session_timeout=1min` / `lock_timeout=5s` ✅
- 行为验证：`SET statement_timeout='1s'; SELECT pg_sleep(2)` → `canceling statement due to statement timeout` ✅

**§5 的部署侧验证（test/prod 环境 + `ai_worker` 角色核对 + 24h 告警观察）仍归 DevOps，随下次部署执行**（待办 #5）。

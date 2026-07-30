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
| 3 | `pool.ts` + `config.ts` 四项配置落代码 | Developer | #2 确认 |
| 4 | 服务器执行 `ALTER ROLE ai_worker SET ...`（test 先行，prod 随部署） | DevOps | #2 确认 |
| 5 | 按 §5 验证并回写本文档 | DevOps | #3 #4 |

## 7. 顺带发现：`AI_STALE_TIMEOUT_MS` 的实际值需 DevOps 核实

ai 侧沟通文档中多处称「xiaobao 的 1800s 卡死回收」，我方回帖与契约 v1.6 沿用了该数字。但 `config.ts:95` 的默认值是 **`AI_STALE_TIMEOUT_MS = 600000`（600s）**，非 1800s。实际生效值取决于服务器 env（本地不可见）。

请 DevOps 核实 test / prod 两侧 `.env` 的实际取值并告知，我方据实订正契约与沟通文档——两侧对回收窗口的认知必须一致，否则 ai 会按错误的窗口设计自愈逻辑。

> 这条与本方案同源：**卡死回收窗口（600s？1800s？）与 `idle_in_transaction_session_timeout`（60s）应当有明确的量级关系**——事务级超时远小于任务级回收窗口，才能保证「ai 卡住 → 先被 DB 断事务释放锁 → 再被我方回收」这个顺序，而不是反过来让回收撞上未释放的锁。取值确认后应在契约里把这个关系写明。

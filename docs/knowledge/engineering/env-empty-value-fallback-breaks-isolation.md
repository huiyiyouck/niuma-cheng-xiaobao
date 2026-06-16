# 显式空环境变量被 .env 回退覆盖 → 环境隔离失效

> 测试环境想用 `X_BEARER_TOKEN=`（空）禁用 X Stream，却被 `.env` 文件里的真实生产 token 回退覆盖，
> 拿生产 token 连了 X Filtered Stream，与生产抢 X 唯一连接，持续 HTTP 429 + 告警风暴（236 条）。
>
> 来源：2026-06-16 测试环境 `x_stream_disconnected` 持续 429 排障。

## 核心结论一句话

**`process.env[key] || env[key] || fallback` 这种回退写法，会让「显式设为空字符串」的环境变量失效**
——空字符串是 falsy，被 `.env` 文件值回退覆盖。想用空值显式关闭某能力时必然踩坑。

## 根因链

1. `config.ts` 的 `get()` 写成 `return process.env[key] || env[key] || fallback`。
2. systemd unit 用 `Environment=X_BEARER_TOKEN=`（空）想禁用 X Stream，但空字符串 falsy → 回退到 `.env`。
3. `config.ts` 硬编码只读 `server/.env`（软链 → 根 `.env`，真实生产 token），**根本不读 `.env.test`**。
4. 于是测试环境拿**真实 token** 连 X Filtered Stream。X 每个 App 只允许 **1 个** filtered stream 连接，
   测试与生产互相挤 → 持续 HTTP 429。
5. 叠加告警去重缺陷（见下），429 每 5 分钟刷一条 active 告警，累计数百条。

## 修复

```ts
function get(key: string, fallback: string): string {
  // 显式设置的环境变量（含空字符串）优先于 .env，使「空值显式禁用」生效
  if (key in process.env) return process.env[key] as string;
  return env[key] || fallback;
}
```

`key in process.env` 区分「显式设了空」与「根本没设」：
- 生产 unit 用 `EnvironmentFile=.env`，真实 token 进 `process.env` → 返回真实 token，正常连。
- 测试 unit 用 `Environment=X_BEARER_TOKEN=` → 返回空 → `if (!config.xBearerToken) return` 禁用 stream。
- 两者零副作用：其它配置项 systemd/EnvironmentFile 注入的都是有值的，或 key 不存在走 `.env`。

## 预防

1. **零依赖 env 解析自己写 `get()` 时，区分「未设置(undefined)」与「设为空("")」**：用 `key in process.env`
   或 `?? `，不要用 `||` 把空字符串当「没设」。
2. **共享外部服务的「唯一连接」类资源（X Filtered Stream、单例 webhook、独占锁）必须做环境隔离**：
   测试环境要么用独立凭证，要么显式禁用，绝不能和生产共用同一 token 抢连接。
3. **`.env` 软链 + 多环境共用一份配置文件时**，警惕「测试以为在用测试配置，实际读了生产 `.env`」。
   隔离要靠 systemd `Environment` 显式覆盖（且覆盖逻辑要让空值生效），不能指望 `.env.test` 被自动加载。

## 关联：告警去重只认 resolved/ignored 致风暴

`createAlert` 去重 SQL `WHERE dedup_key=$1 AND status IN ('resolved','ignored')` 漏了 `active`：
持续未处理的同一问题（已有一条 active 告警）每次都匹配不到 → 重复 INSERT → 风暴。
修复：去重纳入 `active`，持续问题刷新 `last_triggered_at`/计数而非新建。
**带 dedup_key 的周期性告警，去重条件必须覆盖 active 状态。**

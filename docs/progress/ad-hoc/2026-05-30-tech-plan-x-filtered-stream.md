# X/Twitter Shared Filtered Stream Implementation Plan

> 文档定位：v0.5 候选迭代输入材料。由编外成员整理，尚未进入正式 Review。待用户启动 v0.5 后，由 PM、架构师和全栈开发按项目角色流程审阅、修订和定稿。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one shared X Filtered Stream connection for enabled account-tracking Sources while keeping configurable per-Source timeline catch-up polling.

**Architecture:** A new `XStreamManager` owns rule synchronization, the single long-lived NDJSON stream, and reconnect backoff. Stream events and scheduled timeline catch-up both call one exported ingestion function, preserving the existing `raw_items` unique constraint and downstream LLM task queue. The first release assumes one server instance.

**Tech Stack:** Node.js, TypeScript, Fastify worker process, PostgreSQL, Vue 3, native `fetch`, X API v2 Filtered Stream.

---

## 0. Preconditions

The current worktree has all tracked files under `server/` marked as deleted. Before implementation:

- [ ] Restore or switch to the intended Node.js worktree.
- [ ] Confirm `server/package.json` and `server/src/index.ts` exist.
- [ ] Run:

```bash
cd server
npm run build
```

Expected: TypeScript compilation succeeds before feature work begins.

Do not restore files automatically if those deletions are intentional user work.

## 1. File Map

### New files

| File | Responsibility |
|------|----------------|
| `server/src/worker/x-stream.ts` | Rule sync, one stream connection, NDJSON parsing, reconnect policy |
| `server/src/worker/ingest.ts` | Shared raw item insertion and process-task enqueue logic |
| `server/src/worker/x-stream.test.ts` | Unit tests for rule building, routing and parsing |
| `server/src/worker/ingest.test.ts` | Unit tests for deduplicated ingestion |

### Modified files

| File | Change |
|------|--------|
| `server/src/worker/dispatcher.ts` | Replace inline ingestion loop with shared `ingestSourceItems()` |
| `server/src/worker/index.ts` | Start `XStreamManager` beside scheduler and worker loops |
| `server/src/worker/fetchers/x_twitter.ts` | Export tweet parser for Stream reuse |
| `server/src/worker/scheduler.ts` | Keep timeline polling as catch-up polling; default X interval resolves to 24 hours |
| `server/src/shared/config.ts` | Add Stream environment settings |
| `frontend/src/components/InlineAddSource.vue` | Default X catch-up interval to 24 hours and clarify label |
| `frontend/src/components/SourceCard.vue` | Edit per-Source catch-up interval with X-specific copy |
| `.env.example` | Document Stream variables |
| `README.md` | Document shared Stream and catch-up polling |

No database migration is required. Existing uniqueness on `(source_id, source_item_id)` provides idempotency.

## 2. Target Configuration

Add to `.env.example`:

```env
X_BEARER_TOKEN=
X_STREAM_ENABLED=true
X_STREAM_RULE_PREFIX=niuma
X_STREAM_RULE_SYNC_SECONDS=30
X_STREAM_RECONNECT_MAX_SECONDS=300
X_TIMELINE_CATCHUP_DEFAULT_SECONDS=86400
```

Keep Source configuration:

```json
{
  "mode": "user_timeline",
  "usernames": ["OpenAI"],
  "max_results_per_user": 20
}
```

Keep per-binding catch-up policy:

```json
{
  "schedule": {
    "every_seconds": 86400
  }
}
```

## 3. Task Breakdown

### Task 1: Add the TypeScript Test Command

**Files:**
- Modify: `server/package.json`

- [ ] Add a test script using the existing `tsx` development dependency:

```json
{
  "scripts": {
    "test": "tsx --test src/worker/*.test.ts"
  }
}
```

- [ ] Defer the first `npm test` run until Task 3 creates `ingest.test.ts`; the script intentionally targets Worker tests only.

- [ ] Commit:

```bash
git add server/package.json
git commit -m "test(server): add TypeScript test command"
```

### Task 2: Add Stream Configuration

**Files:**
- Modify: `server/src/shared/config.ts`
- Modify: `.env.example`

- [ ] Add configuration values:

```ts
// X/Twitter
xBearerToken: get("X_BEARER_TOKEN", ""),
xStreamEnabled: getBool("X_STREAM_ENABLED", true),
xStreamRulePrefix: get("X_STREAM_RULE_PREFIX", "niuma"),
xStreamRuleSyncSeconds: getInt("X_STREAM_RULE_SYNC_SECONDS", 30),
xStreamReconnectMaxSeconds: getInt("X_STREAM_RECONNECT_MAX_SECONDS", 300),
xTimelineCatchupDefaultSeconds: getInt("X_TIMELINE_CATCHUP_DEFAULT_SECONDS", 86400),
```

- [ ] Run:

```bash
cd server
npm run build
```

Expected: PASS.

- [ ] Commit:

```bash
git add .env.example server/src/shared/config.ts
git commit -m "feat(worker): add X stream configuration"
```

### Task 3: Extract Shared Ingestion

**Files:**
- Create: `server/src/worker/ingest.ts`
- Create: `server/src/worker/ingest.test.ts`
- Modify: `server/src/worker/dispatcher.ts`

- [ ] Write a failing test using a fake `PoolClient` that asserts:
  - a new item inserts one `raw_items` row;
  - a new item enqueues one `process` task;
  - a duplicate item does not enqueue a process task.

- [ ] Implement:

```ts
export interface IngestBinding {
  channelSpaceId: string;
  sourceId: string;
}

export interface SourceItem {
  source_item_id: string;
  url?: string;
  published_at?: string;
  content: Record<string, unknown>;
}

export async function ingestSourceItems(
  conn: PoolClient,
  binding: IngestBinding,
  items: SourceItem[],
): Promise<{ inserted: number; deduped: number }> {
  let insertedCount = 0;
  for (const item of items) {
    const { rows: [inserted] } = await conn.query(
      `INSERT INTO raw_items(channel_space_id, source_id, source_item_id, source_item_url, published_at, content, created_at)
       VALUES($1, $2, $3, $4, $5, $6::jsonb, now())
       ON CONFLICT (source_id, source_item_id) DO NOTHING
       RETURNING id`,
      [binding.channelSpaceId, binding.sourceId, item.source_item_id, item.url || null,
       item.published_at || null, JSON.stringify(item.content || {})],
    );
    if (!inserted) continue;
    insertedCount++;
    await conn.query(
      `INSERT INTO tasks(type, channel_space_id, raw_item_id, status, priority, run_after, created_at, updated_at)
       VALUES('process', $1, $2, 'queued', 0, now(), now(), now())`,
      [binding.channelSpaceId, inserted.id],
    );
  }
  return { inserted: insertedCount, deduped: items.length - insertedCount };
}
```

- [ ] Replace the inline raw-item insertion loop in `dispatcher.ts` with `ingestSourceItems()`.

- [ ] Run the ingestion unit test and `npm run build`.

- [ ] Commit:

```bash
git add server/src/worker/ingest.ts server/src/worker/ingest.test.ts server/src/worker/dispatcher.ts
git commit -m "refactor(worker): share source item ingestion"
```

### Task 4: Export Stream-Compatible Tweet Parsing

**Files:**
- Modify: `server/src/worker/fetchers/x_twitter.ts`
- Create or modify: `server/src/worker/x-stream.test.ts`

- [ ] Export `parseTweets()` so polling and Stream events share one normalizer.

- [ ] Add a test payload shaped like an X stream event:

```ts
{
  data: {
    id: "123",
    author_id: "42",
    text: "hello",
    created_at: "2026-05-30T00:00:00.000Z"
  },
  includes: {
    users: [{ id: "42", username: "OpenAI", name: "OpenAI" }]
  },
  matching_rules: [{ id: "r1", tag: "niuma:x-user:openai" }]
}
```

- [ ] Normalize a single stream event by wrapping `data` in an array before calling `parseTweets()`:

```ts
export function parseStreamTweet(payload: any): SourceItem | null {
  const items = parseTweets({ ...payload, data: payload.data ? [payload.data] : [] });
  return items[0] ?? null;
}
```

- [ ] Run tests and `npm run build`.

- [ ] Commit:

```bash
git add server/src/worker/fetchers/x_twitter.ts server/src/worker/x-stream.test.ts
git commit -m "refactor(worker): reuse X tweet parsing for stream events"
```

### Task 5: Build Rule Discovery and Routing

**Files:**
- Create: `server/src/worker/x-stream.ts`
- Modify: `server/src/worker/x-stream.test.ts`

- [ ] Add types:

```ts
export interface XStreamBinding {
  channelSourceId: string;
  channelSpaceId: string;
  sourceId: string;
  username: string;
}

export interface XStreamRule {
  value: string;
  tag: string;
}
```

- [ ] Query only enabled active account-tracking Sources:

```sql
SELECT cs.id AS channel_source_id, cs.channel_space_id, s.id AS source_id, s.config
FROM channel_sources cs
JOIN sources s ON s.id = cs.source_id
WHERE cs.enabled = true
  AND s.status = 'active'
  AND s.type = 'x_twitter'
```

Filter rows in TypeScript to `config.mode === "user_timeline"` and expand every configured username.

- [ ] Build normalized rules:

```ts
export function ruleForUsername(prefix: string, username: string): XStreamRule {
  const normalized = username.replace(/^@/, "").trim().toLowerCase();
  return {
    value: `from:${normalized} -is:retweet -is:reply`,
    tag: `${prefix}:x-user:${normalized}`,
  };
}
```

- [ ] Build a routing map keyed by normalized username so one Stream event can fan out to every matching Source binding.

- [ ] Add unit tests:
  - `@OpenAI` becomes `from:openai -is:retweet -is:reply`;
  - duplicate usernames produce one external rule;
  - duplicate usernames retain multiple internal bindings.

- [ ] Run tests and `npm run build`.

- [ ] Commit:

```bash
git add server/src/worker/x-stream.ts server/src/worker/x-stream.test.ts
git commit -m "feat(worker): discover X stream rules and routes"
```

### Task 6: Synchronize X Streaming Rules

**Files:**
- Modify: `server/src/worker/x-stream.ts`
- Modify: `server/src/worker/x-stream.test.ts`

- [ ] Implement API helpers:

```ts
const RULES_URL = "https://api.x.com/2/tweets/search/stream/rules";

async function listRules(): Promise<Array<{ id: string; value: string; tag?: string }>> {
  const resp = await fetch(RULES_URL, { headers: authHeaders() });
  assertXResponse(resp);
  return (await resp.json()).data || [];
}
```

- [ ] Delete only rules whose tag starts with `${prefix}:x-user:` and are no longer desired.

- [ ] Add missing desired rules in one `POST` request:

```json
{
  "add": [
    {
      "value": "from:openai -is:retweet -is:reply",
      "tag": "niuma:x-user:openai"
    }
  ]
}
```

- [ ] Never delete rules outside this app namespace.

- [ ] Unit-test add, delete and preservation of unrelated rules using mocked `fetch`.

- [ ] Run tests and `npm run build`.

- [ ] Commit:

```bash
git add server/src/worker/x-stream.ts server/src/worker/x-stream.test.ts
git commit -m "feat(worker): synchronize X filtered stream rules"
```

### Task 7: Connect Stream and Ingest Events

**Files:**
- Modify: `server/src/worker/x-stream.ts`
- Modify: `server/src/worker/x-stream.test.ts`

- [ ] Open:

```text
GET https://api.x.com/2/tweets/search/stream?tweet.fields=created_at,public_metrics,author_id,text,entities,referenced_tweets&expansions=author_id&user.fields=name,username
```

- [ ] Read `resp.body` as NDJSON. Ignore keep-alive blank lines.

- [ ] For each event:
  1. parse the tweet;
  2. read `content.author_username`;
  3. locate all internal bindings for that username;
  4. call `ingestSourceItems()` once per binding;
  5. log inserted and deduped counts.

- [ ] Keep per-line parse failures local:

```ts
try {
  await handleStreamLine(line);
} catch (err: any) {
  log.warn("X STREAM EVENT ERROR: %s", err.message);
}
```

- [ ] Add tests for blank lines, malformed JSON and fan-out to multiple bindings.

- [ ] Run tests and `npm run build`.

- [ ] Commit:

```bash
git add server/src/worker/x-stream.ts server/src/worker/x-stream.test.ts
git commit -m "feat(worker): ingest X filtered stream events"
```

### Task 8: Add Reconnect and Periodic Resync

**Files:**
- Modify: `server/src/worker/x-stream.ts`
- Modify: `server/src/worker/index.ts`

- [ ] Implement a manager loop that:
  - synchronizes rules before opening the stream;
  - reconnects with exponential backoff after disconnect;
  - caps backoff at `xStreamReconnectMaxSeconds`;
  - resynchronizes rules every `xStreamRuleSyncSeconds`;
  - aborts and reopens the connection if desired rules changed;
  - pauses retries after `401/403` and creates one alert for every distinct affected channel space;
  - delays retry after `429`.

- [ ] Reuse `createAlert()` from `server/src/worker/monitor.ts` for authentication failures:

```ts
for (const channelSpaceId of new Set(bindings.map((binding) => binding.channelSpaceId))) {
  await createAlert(conn, channelSpaceId, "x_stream_auth_failed", error.message, {
    scope: "x_filtered_stream",
  });
}
```

- [ ] Run rule resynchronization on a timer with its own `AbortController`. Abort the active Stream response and reopen it only when the desired rule fingerprint changes.

- [ ] Export:

```ts
export function startXStreamManager(stopSignal: AbortSignal): Promise<void>
```

- [ ] Start it from `worker/index.ts` only when enabled and a bearer token exists:

```ts
if (config.xStreamEnabled && config.xBearerToken) {
  loops.push(startXStreamManager(stopSignal));
}
```

- [ ] Ensure the top-level `AbortController` is retained and aborted during shutdown in `server/src/index.ts`.

- [ ] Run tests and `npm run build`.

- [ ] Commit:

```bash
git add server/src/worker/x-stream.ts server/src/worker/index.ts server/src/index.ts
git commit -m "feat(worker): run resilient shared X stream manager"
```

### Task 9: Default X Catch-Up Polling to 24 Hours

**Files:**
- Modify: `server/src/worker/scheduler.ts`
- Modify: `server/src/shared/config.ts`

- [ ] Change interval resolution so only X account tracking falls back to `xTimelineCatchupDefaultSeconds`. RSS and other fetchers continue using `defaultFetchEverySeconds`.

- [ ] Include `s.type` and `s.config` in the scheduler query.

- [ ] Use:

```ts
function policyEverySeconds(fetchPolicy: any, sourceType: string, sourceConfig: any): number {
  const configured = fetchPolicy?.schedule?.every_seconds;
  if (typeof configured === "number" && configured > 0) return configured;
  if (sourceType === "x_twitter" && sourceConfig?.mode === "user_timeline") {
    return config.xTimelineCatchupDefaultSeconds;
  }
  return config.defaultFetchEverySeconds;
}
```

- [ ] Add a scheduler unit test for:
  - X account tracking default: `86400`;
  - configured X interval: configured value;
  - RSS default: existing global fetch interval.

- [ ] Run tests and `npm run build`.

- [ ] Commit:

```bash
git add server/src/worker/scheduler.ts server/src/shared/config.ts server/src/worker/scheduler.test.ts
git commit -m "feat(worker): default X catch-up polling to 24 hours"
```

### Task 10: Update the Management Page

**Files:**
- Modify: `frontend/src/components/InlineAddSource.vue`
- Modify: `frontend/src/components/SourceCard.vue`

- [ ] For `x_twitter` Sources, label the interval input:

```text
补偿抓取周期（小时）
```

- [ ] Add help text:

```text
新推文会通过实时流立即接收。该周期仅用于网络中断或服务重启后的补偿抓取。
```

- [ ] Default new X Source bindings to:

```ts
const catchupHours = ref(24);
```

- [ ] Convert hours to seconds on save:

```ts
fetch_policy: {
  schedule: {
    every_seconds: Math.max(1, catchupHours.value) * 3600,
  },
}
```

- [ ] Keep non-X Source labels and behavior unchanged.

- [ ] Run:

```bash
cd frontend
npm run build
```

Expected: PASS.

- [ ] Commit:

```bash
git add frontend/src/components/InlineAddSource.vue frontend/src/components/SourceCard.vue
git commit -m "feat(frontend): configure X catch-up polling interval"
```

### Task 11: Documentation and Verification

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

- [ ] Document:
  - Filtered Stream is the primary X account ingestion path;
  - timeline polling is catch-up only;
  - default catch-up period is 24 hours;
  - first release supports a single active server instance.

- [ ] Run:

```bash
cd server
npm run build
cd ../frontend
npm run build
```

Expected: both PASS.

- [ ] Perform a manual staging verification:
  1. Enable one X `user_timeline` Source.
  2. Confirm the `niuma:x-user:{username}` rule exists through the X rules endpoint.
  3. Publish one original test tweet.
  4. Confirm one `raw_items` row and one process task are created.
  5. Run catch-up polling and confirm no duplicate row is created.
  6. Publish a reply and confirm it is not ingested.
  7. Restart the service and confirm the Stream reconnects.

- [ ] Commit:

```bash
git add README.md .env.example
git commit -m "docs: describe X filtered stream ingestion"
```

## 4. Deployment Notes

1. Deploy only one server process with `X_STREAM_ENABLED=true`.
2. Set `X_BEARER_TOKEN` in server secrets, never in committed files.
3. Verify the active X API plan supports Filtered Stream and rule management immediately before deployment.
4. Watch logs for:

```text
X STREAM RULES SYNC
X STREAM CONNECTED
X STREAM RECONNECT
X STREAM EVENT ERROR
```

5. If horizontal scaling is introduced later, add leader election before enabling Stream on multiple instances.

## 5. Self-Review

- Spec coverage: shared connection, original-only filtering, automatic rule sync, fan-out routing, 24-hour default catch-up, per-Source UI configuration, dedupe and reconnect handling are covered.
- Placeholder scan: no `TBD` or open implementation placeholders remain.
- Compatibility: no schema migration is required; scheduled fetching remains available for RSS and X catch-up.

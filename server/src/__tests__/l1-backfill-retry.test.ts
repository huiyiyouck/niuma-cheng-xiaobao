/**
 * Developer 任务书三项（2026-08-01）单测：
 * - #5 score_total 轮询补算（backfillScoreTotalTick，契约 v1.9）
 * - #7 手动重试接口放开 l1_ai_process（l1-tasks.ts）
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.ts";
import { cleanTestData } from "./helpers.ts";
import { backfillScoreTotalTick } from "../worker/l1-processor.ts";
import { config } from "../shared/config.ts";

const FULL_DIMS = {
  timeliness: { score: 5, reason: "t" },
  impact: { score: 5, reason: "i" },
  confidence: { score: 5, reason: "c" },
  clarity: { score: 5, reason: "x" },
};

async function createSource(): Promise<string> {
  const { rows: [s] } = await pool.query(
    `INSERT INTO sources(type, identity, display_name) VALUES('x_twitter', 'bf-test', 'bf-test') RETURNING id`,
  );
  return s.id;
}

async function createRawItem(sourceId: string, l1Status: string): Promise<string> {
  const { rows: [r] } = await pool.query(
    `INSERT INTO raw_items(source_id, source_item_id, content, l1_status, process_type)
     VALUES($1, gen_random_uuid()::text, '{"text":"bf"}'::jsonb, $2, 'ai') RETURNING id`,
    [sourceId, l1Status],
  );
  return r.id;
}

async function createNews(rawItemId: string, dims: unknown): Promise<string> {
  const { rows: [n] } = await pool.query(
    `INSERT INTO processed_news(raw_item_id, title, summary, score_dimensions)
     VALUES($1, 'bf', 'bf', $2) RETURNING id`,
    [rawItemId, dims === null ? null : JSON.stringify(dims)],
  );
  return n.id;
}

async function scoreTotalOf(newsId: string): Promise<string | null> {
  const { rows: [n] } = await pool.query(`SELECT score_total FROM processed_news WHERE id = $1`, [newsId]);
  return n.score_total;
}

describe("#5 score_total 轮询补算", () => {
  beforeEach(async () => { await cleanTestData(); });

  it("completed + 有维度 + score_total 为空 → 按 calcScoreTotal 公式补算", async () => {
    const src = await createSource();
    const raw = await createRawItem(src, "completed");
    const news = await createNews(raw, FULL_DIMS);

    const conn = await pool.connect();
    try { await backfillScoreTotalTick(conn); } finally { conn.release(); }

    // 全 5 分：raw = 5×0.25+5×0.35+5×0.25+5×0.15 = 5 → ×2 = 10.0
    expect(Number(await scoreTotalOf(news))).toBe(10);
  });

  it("l1_status 非 completed 不补算", async () => {
    const src = await createSource();
    const raw = await createRawItem(src, "processing");
    const news = await createNews(raw, FULL_DIMS);

    const conn = await pool.connect();
    try { await backfillScoreTotalTick(conn); } finally { conn.release(); }

    expect(await scoreTotalOf(news)).toBeNull();
  });

  it("score_dimensions 为空不补算", async () => {
    const src = await createSource();
    const raw = await createRawItem(src, "completed");
    const news = await createNews(raw, null);

    const conn = await pool.connect();
    try { await backfillScoreTotalTick(conn); } finally { conn.release(); }

    expect(await scoreTotalOf(news)).toBeNull();
  });

  it("维度结构不完整时跳过该行且不抛错", async () => {
    const src = await createSource();
    const rawBad = await createRawItem(src, "completed");
    const newsBad = await createNews(rawBad, { timeliness: { score: 5 } }); // 缺 3 维
    const rawOk = await createRawItem(src, "completed");
    const newsOk = await createNews(rawOk, FULL_DIMS);

    const conn = await pool.connect();
    try { await backfillScoreTotalTick(conn); } finally { conn.release(); }

    expect(await scoreTotalOf(newsBad)).toBeNull();
    expect(Number(await scoreTotalOf(newsOk))).toBe(10);
  });
});

describe("#7 手动重试接口支持 l1_ai_process", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    await cleanTestData();
    app = Fastify({ logger: false });
    const { l1TasksRoutes } = await import("../api/routes/l1-tasks.ts");
    await app.register(async (scope) => { await l1TasksRoutes(scope); }, { prefix: "/v1" });
    await app.ready();
  });

  afterAll(async () => { await app?.close(); });

  async function createFailedAiTask(): Promise<{ taskId: string; rawItemId: string; sourceId: string }> {
    const sourceId = await createSource();
    const rawItemId = await createRawItem(sourceId, "final_failed");
    const { rows: [t] } = await pool.query(
      `INSERT INTO tasks(type, source_id, raw_item_id, status, priority, run_after, attempt, max_attempts, created_at, updated_at)
       VALUES('l1_ai_process', $1, $2, 'failed', 1, now(), 3, 3, now(), now()) RETURNING id`,
      [sourceId, rawItemId],
    );
    return { taskId: t.id, rawItemId, sourceId };
  }

  it("l1_ai_process 失败任务可重试：建同类型新任务 + max_attempts 尊重 AI_MAX_RETRIES + raw_items 复位", async () => {
    const { taskId, rawItemId } = await createFailedAiTask();

    const res = await app.inject({ method: "POST", url: `/v1/l1-tasks/${taskId}/retry` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);

    const { rows: [newTask] } = await pool.query(
      `SELECT type, status, max_attempts FROM tasks WHERE id = $1`, [body.new_task_id]);
    expect(newTask.type).toBe("l1_ai_process");
    expect(newTask.status).toBe("queued");
    expect(newTask.max_attempts).toBe(config.aiMaxRetries);

    const { rows: [raw] } = await pool.query(
      `SELECT l1_status, l1_attempt, l1_error FROM raw_items WHERE id = $1`, [rawItemId]);
    expect(raw.l1_status).toBe("queued");
    expect(raw.l1_attempt).toBe(0);
    expect(raw.l1_error).toBeNull();
  });

  it("不支持的任务类型仍拒绝", async () => {
    const sourceId = await createSource();
    const rawItemId = await createRawItem(sourceId, "final_failed");
    const { rows: [t] } = await pool.query(
      `INSERT INTO tasks(type, source_id, raw_item_id, status, priority, run_after, attempt, max_attempts, created_at, updated_at)
       VALUES('fetch', $1, $2, 'failed', 1, now(), 0, 5, now(), now()) RETURNING id`,
      [sourceId, rawItemId],
    );
    const res = await app.inject({ method: "POST", url: `/v1/l1-tasks/${t.id}/retry` });
    expect(res.statusCode).toBe(400);
  });
});

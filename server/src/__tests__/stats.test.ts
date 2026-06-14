/**
 * 统计 API 测试
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, beginTestTx, rollbackTestTx } from "./helpers.ts";

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  await beginTestTx();
});

describe("统计", () => {
  it("GET /v1/stats 应返回全局统计", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/stats" });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data).toHaveProperty("today_new");
    expect(data).toHaveProperty("avg_score");
    expect(data).toHaveProperty("active_spaces");
    expect(data).toHaveProperty("active_sources");
    expect(data).toHaveProperty("unprocessed_alerts");
    expect(data.today_new).toBe(0);
    expect(data.active_sources).toBe(0);
  });

  it("GET /v1/stats?space_id=xxx 应返回空间统计", async () => {
    const spaceRes = await app.inject({
      method: "POST", url: "/v1/spaces",
      payload: { name: "统计空间" },
    });
    const spaceId = JSON.parse(spaceRes.payload).id;

    const res = await app.inject({
      method: "GET",
      url: `/v1/stats?space_id=${spaceId}`,
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data.total_news).toBe(0);
  });
});

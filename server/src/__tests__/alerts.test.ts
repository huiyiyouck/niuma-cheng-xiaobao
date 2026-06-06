/**
 * 告警 API 测试
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

describe("告警列表", () => {
  it("GET /v1/alerts 应返回空列表", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/alerts" });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data.alerts).toEqual([]);
    expect(data.counts.active).toBe(0);
  });

  it("GET /v1/alerts 应返回 counts", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/alerts" });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data.counts).toEqual({
      active: 0,
      acknowledged: 0,
      resolved: 0,
      ignored: 0,
    });
  });

  it("GET /v1/alerts 应支持状态筛选", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/alerts?status=active&page_size=10",
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toHaveProperty("alerts");
  });
});

describe("告警状态更新", () => {
  it("PATCH /v1/alerts/:id 不存在的告警返回 404", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/v1/alerts/00000000-0000-0000-0000-000000000000",
      payload: { status: "acknowledged" },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("未读告警计数", () => {
  it("GET /v1/alerts/unread-count 应返回 0", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/alerts/unread-count",
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ count: 0 });
  });
});

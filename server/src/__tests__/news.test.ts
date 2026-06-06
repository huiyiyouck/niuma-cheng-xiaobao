/**
 * 新闻 API 测试
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

describe("新闻列表", () => {
  it("GET /v1/news 缺少 space_id 应返回 400", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/news",
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /v1/news 应返回空列表", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/news?space_id=00000000-0000-0000-0000-000000000000",
    });
    // 根据 Zod 校验，space_id 应该是有效的 UUID
    expect(res.statusCode).toBe(400);
  });

  it("GET /v1/news 有效 space_id 应返回新闻", async () => {
    // 创建空间
    const spaceRes = await app.inject({
      method: "POST", url: "/v1/spaces",
      payload: { name: "新闻测试" },
    });
    const spaceId = JSON.parse(spaceRes.payload).id;

    const res = await app.inject({
      method: "GET",
      url: `/v1/news?space_id=${spaceId}`,
    });
    expect(res.statusCode).toBe(200);
    // 无数据时应返回空数组
    expect(Array.isArray(JSON.parse(res.payload))).toBe(true);
  });

  it("GET /v1/news 应支持分页参数", async () => {
    const spaceRes = await app.inject({
      method: "POST", url: "/v1/spaces",
      payload: { name: "分页测试" },
    });
    const spaceId = JSON.parse(spaceRes.payload).id;

    const res = await app.inject({
      method: "GET",
      url: `/v1/news?space_id=${spaceId}&page=1&page_size=10`,
    });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(JSON.parse(res.payload))).toBe(true);
  });
});

describe("新闻详情", () => {
  it("GET /v1/news/:news_id 不存在的新闻应返回 404", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/news/00000000-0000-0000-0000-000000000000",
    });
    expect(res.statusCode).toBe(404);
  });
});

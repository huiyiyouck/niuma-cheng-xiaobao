/**
 * 展示位置 API 测试
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

describe("展示位置列表", () => {
  it("GET /v1/spaces/:space_id/positions 应返回空列表", async () => {
    // 创建空间
    const spaceRes = await app.inject({
      method: "POST", url: "/v1/spaces",
      payload: { name: "展示测试" },
    });
    const spaceId = JSON.parse(spaceRes.payload).id;

    const res = await app.inject({
      method: "GET",
      url: `/v1/spaces/${spaceId}/positions`,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual([]);
  });
});

describe("展示位置创建", () => {
  let spaceId: string;
  let sourceId: string;

  beforeEach(async () => {
    await beginTestTx();

    const spaceRes = await app.inject({
      method: "POST", url: "/v1/spaces",
      payload: { name: "位置测试空间" },
    });
    spaceId = JSON.parse(spaceRes.payload).id;

    const srcRes = await app.inject({
      method: "POST", url: "/v1/sources",
      payload: {
        type: "rss",
        identity: "https://pos-test.example.com/rss",
        display_name: "Position Test Source",
      },
    });
    sourceId = JSON.parse(srcRes.payload).id;
  });

  it("POST /v1/spaces/:space_id/positions 根节点位置应创建成功", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/positions`,
      payload: { source_id: sourceId },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.payload);
    expect(data.source_id).toBe(sourceId);
    expect(data.channel_id).toBeNull();
    expect(data.enabled).toBe(true);
  });

  it("POST /v1/spaces/:space_id/positions 频道位置应创建成功", async () => {
    // 创建频道
    const chRes = await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/channels`,
      payload: { name: "测试频道" },
    });
    const channelId = JSON.parse(chRes.payload).id;

    const res = await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/positions`,
      payload: { source_id: sourceId, channel_id: channelId },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.payload);
    expect(data.channel_id).toBe(channelId);
  });

  it("POST /v1/spaces/:space_id/positions 重复位置应返回 409", async () => {
    await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/positions`,
      payload: { source_id: sourceId },
    });

    const res = await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/positions`,
      payload: { source_id: sourceId },
    });
    expect(res.statusCode).toBe(409);
  });
});

describe("展示位置暂停/恢复/移除", () => {
  let positionId: string;
  let spaceId: string;
  let sourceId: string;

  beforeEach(async () => {
    await beginTestTx();

    const spaceRes = await app.inject({
      method: "POST", url: "/v1/spaces",
      payload: { name: "暂停测试" },
    });
    spaceId = JSON.parse(spaceRes.payload).id;

    const srcRes = await app.inject({
      method: "POST", url: "/v1/sources",
      payload: {
        type: "rss",
        identity: "https://pause-test.example.com/rss",
        display_name: "Pause Test Source",
      },
    });
    sourceId = JSON.parse(srcRes.payload).id;

    const posRes = await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/positions`,
      payload: { source_id: sourceId },
    });
    positionId = JSON.parse(posRes.payload).id;
  });

  it("PATCH /v1/positions/:id action=pause 应暂停", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/positions/${positionId}`,
      payload: { action: "pause" },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).enabled).toBe(false);
  });

  it("PATCH /v1/positions/:id action=resume 应恢复", async () => {
    await app.inject({
      method: "PATCH",
      url: `/v1/positions/${positionId}`,
      payload: { action: "pause" },
    });

    const res = await app.inject({
      method: "PATCH",
      url: `/v1/positions/${positionId}`,
      payload: { action: "resume" },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).enabled).toBe(true);
  });

  it("PATCH /v1/positions/:id action=remove 应软删除", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: `/v1/positions/${positionId}`,
      payload: { action: "remove", removal_reason: "test_cleanup" },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ deleted: true });
  });
});

/**
 * 空间和频道 API 测试
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

describe("空间 CRUD", () => {
  it("GET /v1/spaces 应返回空列表", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/spaces" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual([]);
  });

  it("POST /v1/spaces 应创建空间", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/spaces",
      payload: { name: "AI新闻", description: "AI 相关新闻", icon: "🤖" },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.payload);
    expect(data.name).toBe("AI新闻");
    expect(data.icon).toBe("🤖");
    expect(data).toHaveProperty("id");
  });

  it("POST /v1/spaces 不允许重名", async () => {
    await app.inject({
      method: "POST",
      url: "/v1/spaces",
      payload: { name: "AI新闻" },
    });
    const res = await app.inject({
      method: "POST",
      url: "/v1/spaces",
      payload: { name: "AI新闻" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("PUT /v1/spaces/:id 应更新空间", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/v1/spaces",
      payload: { name: "旧名" },
    });
    const { id } = JSON.parse(create.payload);

    const res = await app.inject({
      method: "PUT",
      url: `/v1/spaces/${id}`,
      payload: { name: "新名", icon: "📰" },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data.name).toBe("新名");
    expect(data.icon).toBe("📰");
  });

  it("PUT /v1/spaces/:id 不存在的空间返回 404", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/v1/spaces/00000000-0000-0000-0000-000000000000",
      payload: { name: "不存在" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /v1/spaces/:id 应删除空间", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/v1/spaces",
      payload: { name: "待删除" },
    });
    const { id } = JSON.parse(create.payload);

    const res = await app.inject({
      method: "DELETE",
      url: `/v1/spaces/${id}`,
    });
    expect(res.statusCode).toBe(204);

    // 确认不存在
    const get = await app.inject({ method: "GET", url: "/v1/spaces" });
    expect(JSON.parse(get.payload)).toHaveLength(0);
  });

  it("GET /v1/spaces/:id/delete-preview 应返回影响范围", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/v1/spaces",
      payload: { name: "预览测试" },
    });
    const { id } = JSON.parse(create.payload);

    const res = await app.inject({
      method: "GET",
      url: `/v1/spaces/${id}/delete-preview`,
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data).toHaveProperty("space_name");
    expect(data).toHaveProperty("channels_count");
    expect(data).toHaveProperty("positions_count");
  });
});

describe("空间排序", () => {
  it("PUT /v1/spaces/reorder 应更新排序", async () => {
    const space1 = await app.inject({
      method: "POST", url: "/v1/spaces",
      payload: { name: "空间一", sort_order: 0 },
    });
    const space2 = await app.inject({
      method: "POST", url: "/v1/spaces",
      payload: { name: "空间二", sort_order: 0 },
    });
    const id1 = JSON.parse(space1.payload).id;
    const id2 = JSON.parse(space2.payload).id;

    const res = await app.inject({
      method: "PUT",
      url: "/v1/spaces/reorder",
      payload: {
        items: [
          { id: id1, sort_order: 1 },
          { id: id2, sort_order: 0 },
        ],
      },
    });
    expect(res.statusCode).toBe(200);

    const list = await app.inject({ method: "GET", url: "/v1/spaces" });
    const items = JSON.parse(list.payload);
    expect(items[0].id).toBe(id2); // sort_order 0 在前
  });
});

describe("频道 CRUD", () => {
  let spaceId: string;

  beforeEach(async () => {
    await beginTestTx();
    const res = await app.inject({
      method: "POST",
      url: "/v1/spaces",
      payload: { name: "测试空间" },
    });
    spaceId = JSON.parse(res.payload).id;
  });

  it("GET /v1/spaces/:id/channels 应返回频道列表（含 Source 数）", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/v1/spaces/${spaceId}/channels`,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual([]);
  });

  it("POST /v1/spaces/:id/channels 应创建频道", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/channels`,
      payload: { name: "模型动态" },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.payload);
    expect(data.name).toBe("模型动态");
    expect(data.channel_space_id).toBe(spaceId);
  });

  it("PUT /v1/spaces/:id/channels/:cid 应更新频道", async () => {
    const create = await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/channels`,
      payload: { name: "旧频道" },
    });
    const cid = JSON.parse(create.payload).id;

    const res = await app.inject({
      method: "PUT",
      url: `/v1/spaces/${spaceId}/channels/${cid}`,
      payload: { name: "新频道" },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).name).toBe("新频道");
  });

  it("DELETE /v1/spaces/:id/channels/:cid remove_all 应删除频道", async () => {
    const create = await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/channels`,
      payload: { name: "待删除" },
    });
    const cid = JSON.parse(create.payload).id;

    const res = await app.inject({
      method: "DELETE",
      url: `/v1/spaces/${spaceId}/channels/${cid}`,
      payload: { action: "remove_all" },
    });
    expect(res.statusCode).toBe(204);
  });

  it("DELETE /v1/spaces/:id/channels/:cid migrate_to_root 应迁移展示位置到根节点", async () => {
    // 创建 Source 和频道位置
    const src = await app.inject({
      method: "POST",
      url: "/v1/sources",
      payload: {
        type: "rss",
        identity: "https://migrate-test.example.com/rss",
        display_name: "Migration Test",
        source_role: "media",
        attention_level: "regular",
      },
    });
    const sourceId = JSON.parse(src.payload).id;

    const ch = await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/channels`,
      payload: { name: "迁移目标频道" },
    });
    const channelId = JSON.parse(ch.payload).id;

    // 添加展示位置到频道
    await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/positions`,
      payload: { source_id: sourceId, channel_id: channelId },
    });

    // 删除频道并迁移位置到根节点
    const res = await app.inject({
      method: "DELETE",
      url: `/v1/spaces/${spaceId}/channels/${channelId}`,
      payload: { action: "migrate_to_root" },
    });
    expect(res.statusCode).toBe(204);

    // 验证位置已迁移到根节点（channel_id = NULL）
    const positions = await app.inject({
      method: "GET",
      url: `/v1/spaces/${spaceId}/positions`,
    });
    const migrated = JSON.parse(positions.payload).find(
      (p: any) => p.source_id === sourceId,
    );
    expect(migrated).toBeDefined();
    expect(migrated.channel_id).toBeNull();
  });

  it("DELETE /v1/spaces/:id/channels/:cid migrate_to_root 冲突时返回 409", async () => {
    // 创建 Source，同时在根节点和频道有位置
    const src = await app.inject({
      method: "POST",
      url: "/v1/sources",
      payload: {
        type: "rss",
        identity: "https://conflict-test.example.com/rss",
        display_name: "Conflict Test",
        source_role: "media",
        attention_level: "regular",
      },
    });
    const sourceId = JSON.parse(src.payload).id;

    // 添加到根节点
    await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/positions`,
      payload: { source_id: sourceId },
    });

    // 创建频道并添加同一 Source
    const ch = await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/channels`,
      payload: { name: "冲突频道" },
    });
    const channelId = JSON.parse(ch.payload).id;
    await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/positions`,
      payload: { source_id: sourceId, channel_id: channelId },
    });

    // 尝试迁移应返回 409
    const res = await app.inject({
      method: "DELETE",
      url: `/v1/spaces/${spaceId}/channels/${channelId}`,
      payload: { action: "migrate_to_root" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("GET /v1/spaces/:id/channels/:cid/delete-preview 应返回影响范围", async () => {
    const create = await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/channels`,
      payload: { name: "影响预览" },
    });
    const cid = JSON.parse(create.payload).id;

    const res = await app.inject({
      method: "GET",
      url: `/v1/spaces/${spaceId}/channels/${cid}/delete-preview`,
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data).toHaveProperty("channel_name");
    expect(data).toHaveProperty("positions_count");
    expect(data).toHaveProperty("conflict_count");
  });
});

describe("频道排序", () => {
  it("PUT /v1/spaces/:id/channels/reorder 应更新频道排序", async () => {
    const space = await app.inject({
      method: "POST", url: "/v1/spaces",
      payload: { name: "排序测试" },
    });
    const spaceId = JSON.parse(space.payload).id;

    const ch1 = await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/channels`,
      payload: { name: "频道一", sort_order: 0 },
    });
    const ch2 = await app.inject({
      method: "POST",
      url: `/v1/spaces/${spaceId}/channels`,
      payload: { name: "频道二", sort_order: 0 },
    });
    const id1 = JSON.parse(ch1.payload).id;
    const id2 = JSON.parse(ch2.payload).id;

    const res = await app.inject({
      method: "PUT",
      url: `/v1/spaces/${spaceId}/channels/reorder`,
      payload: {
        items: [
          { id: id1, sort_order: 1 },
          { id: id2, sort_order: 0 },
        ],
      },
    });
    expect(res.statusCode).toBe(200);

    const list = await app.inject({
      method: "GET",
      url: `/v1/spaces/${spaceId}/channels`,
    });
    const items = JSON.parse(list.payload);
    expect(items[0].id).toBe(id2);
  });
});

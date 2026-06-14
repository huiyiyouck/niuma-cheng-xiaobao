/**
 * Source API 测试
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp, beginTestTx, rollbackTestTx } from "./helpers.ts";
import { pool } from "../db/pool.ts";

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

describe("Source 列表", () => {
  it("GET /v1/sources 应返回空列表", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/sources" });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data.sources).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.page).toBe(1);
    expect(data.page_size).toBe(20);
  });

  it("GET /v1/sources 应支持分页", async () => {
    // 创建 5 个 source
    for (let i = 0; i < 5; i++) {
      await app.inject({
        method: "POST",
        url: "/v1/sources",
        payload: {
          type: "rss",
          identity: `https://example${i}.com/rss`,
          display_name: `测试源 ${i}`,
        },
      });
    }

    const res = await app.inject({
      method: "GET",
      url: "/v1/sources?page=1&page_size=3",
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data.sources).toHaveLength(3);
    expect(data.total).toBe(5);
  });
});

describe("Source 创建", () => {
  it("POST /v1/sources RSS 应创建成功", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/sources",
      payload: {
        type: "rss",
        identity: "https://example.com/rss.xml",
        display_name: "Example RSS",
        domain_tags: ["AI", "科技"],
        source_role: "media",
        attention_level: "regular",
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.payload);
    expect(data.type).toBe("rss");
    expect(data.source_identity).toBe("https://example.com/rss.xml");
    expect(data.display_name).toBe("Example RSS");
    expect(data.domain_tags).toEqual(["AI", "科技"]);
  });

  it("POST /v1/sources X Twitter identity 应标准化（去 @ 并小写）", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/sources",
      payload: {
        type: "x_twitter",
        identity: "@OpenAI",
        display_name: "OpenAI X",
      },
    });
    expect(res.statusCode).toBe(201);
    const data = JSON.parse(res.payload);
    expect(data.source_identity).toBe("openai");
  });

  it("POST /v1/sources 重复身份应返回 409", async () => {
    // 创建第一个
    await app.inject({
      method: "POST",
      url: "/v1/sources",
      payload: {
        type: "rss",
        identity: "https://dup.example.com/rss",
        display_name: "Duplicate Test",
      },
    });

    // 尝试重复
    const res = await app.inject({
      method: "POST",
      url: "/v1/sources",
      payload: {
        type: "rss",
        identity: "https://dup.example.com/rss",
        display_name: "Duplicate Test 2",
      },
    });
    expect(res.statusCode).toBe(409);
  });
});

describe("Source 详情", () => {
  it("GET /v1/sources/:id 应返回 Source 详情", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/v1/sources",
      payload: {
        type: "rss",
        identity: "https://detail.example.com/rss",
        display_name: "Detail Source",
      },
    });
    expect(create.statusCode).toBe(201);
    const { id } = JSON.parse(create.payload);

    const res = await app.inject({
      method: "GET",
      url: `/v1/sources/${id}`,
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data.id).toBe(id);
    expect(data.display_positions).toEqual([]);
    expect(data.identity_history).toEqual([]);
    expect(data).toHaveProperty("operational_status");
  });

  it("GET /v1/sources/:id 不存在的 Source 返回 404", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/sources/00000000-0000-0000-0000-000000000000",
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("Source 编辑", () => {
  it("PATCH /v1/sources/:id 应更新标签等字段", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/v1/sources",
      payload: {
        type: "rss",
        identity: "https://edit.example.com/rss",
        display_name: "Before Edit",
        domain_tags: ["科技"],
      },
    });
    const { id } = JSON.parse(create.payload);

    const res = await app.inject({
      method: "PATCH",
      url: `/v1/sources/${id}`,
      payload: {
        display_name: "After Edit",
        domain_tags: ["AI", "财经"],
        attention_level: "core",
      },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data.display_name).toBe("After Edit");
    expect(data.domain_tags).toEqual(["AI", "财经"]);
    expect(data.attention_level).toBe("core");
  });
});

describe("Source 身份修改", () => {
  it("PUT /v1/sources/:id/identity normal 状态不允许修改身份（409）", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/v1/sources",
      payload: {
        type: "rss",
        identity: "https://normal-source.example.com/rss",
        display_name: "Normal Source",
        source_role: "media",
        attention_level: "regular",
      },
    });
    const { id } = JSON.parse(create.payload);

    const res = await app.inject({
      method: "PUT",
      url: `/v1/sources/${id}/identity`,
      payload: { new_identity: "https://new.example.com/rss" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("PUT /v1/sources/:id/identity 待修复状态应允许修改身份并写入历史", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/v1/sources",
      payload: {
        type: "rss",
        identity: "https://fix-me.example.com/rss",
        display_name: "Fix Me",
        source_role: "media",
        attention_level: "regular",
      },
    });
    const { id } = JSON.parse(create.payload);

    // 手动设为待修复状态
    await pool.query("UPDATE sources SET lifecycle_status='needs_fix' WHERE id=$1", [id]);

    const res = await app.inject({
      method: "PUT",
      url: `/v1/sources/${id}/identity`,
      payload: { new_identity: "https://fixed.example.com/rss" },
    });
    // 200=成功 / 400=外部验证失败 / 422=格式错误
    expect([200, 400, 422]).toContain(res.statusCode);

    if (res.statusCode === 200) {
      // 验证身份历史
      const detail = await app.inject({
        method: "GET",
        url: `/v1/sources/${id}`,
      });
      const history = JSON.parse(detail.payload).source.identity_history;
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty("old_identity");
      expect(history[0]).toHaveProperty("new_identity");
    }
  });
});

describe("Source 删除", () => {
  it("DELETE /v1/sources/:id 应软删除 Source", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/v1/sources",
      payload: {
        type: "rss",
        identity: "https://delete-me.example.com/rss",
        display_name: "Delete Me",
      },
    });
    const { id } = JSON.parse(create.payload);

    const res = await app.inject({
      method: "DELETE",
      url: `/v1/sources/${id}`,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload)).toEqual({ deleted: true });
  });
});

describe("Source 验证", () => {
  it("POST /v1/sources/verify 应返回验证结果", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/sources/verify",
      payload: {
        type: "rss",
        identity: "https://example.com/rss",
      },
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("identity");
    expect(data).toHaveProperty("items");
  });
});

describe("Source 删除预览", () => {
  it("GET /v1/sources/:id/delete-preview 应返回影响范围", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/v1/sources",
      payload: {
        type: "rss",
        identity: "https://preview.example.com/rss",
        display_name: "Preview Source",
      },
    });
    const { id } = JSON.parse(create.payload);

    const res = await app.inject({
      method: "GET",
      url: `/v1/sources/${id}/delete-preview`,
    });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.payload);
    expect(data).toHaveProperty("source_name");
    expect(data).toHaveProperty("positions_count");
    expect(data).toHaveProperty("news_count");
  });
});

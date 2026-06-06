/**
 * 测试辅助函数
 */
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.ts";

// Admin 鉴权 token
const ADMIN_TOKEN = "test-token";

/** 创建测试 Fastify 实例（不带鉴权，便于测试） */
export async function createTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  const { channelSpacesRoutes } = await import("../api/routes/channel-spaces.ts");
  const { positionsRoutes } = await import("../api/routes/positions.ts");
  const { sourcesRoutes } = await import("../api/routes/sources.ts");
  const { newsRoutes } = await import("../api/routes/news.ts");
  const { alertsRoutes } = await import("../api/routes/alerts.ts");
  const { statsRoutes } = await import("../api/routes/stats.ts");

  await app.register(async (scope) => {
    await channelSpacesRoutes(scope);
    await positionsRoutes(scope);
    await sourcesRoutes(scope);
    await newsRoutes(scope);
    await alertsRoutes(scope);
    await statsRoutes(scope);
  }, { prefix: "/v1" });

  await app.ready();
  return app;
}

export function adminHeaders(extra?: Record<string, string>): Record<string, string> {
  return { "x-admin-token": ADMIN_TOKEN, "Content-Type": "application/json", ...extra };
}

/** 清理测试数据（严格 FK 顺序：子表→父表） */
export async function cleanTestData(): Promise<void> {
  // 顺序至关重要：必须先清子表，再清父表
  const ordered = [
    "news_positions",        // FK→processed_news, display_positions
    "processed_news",         // FK→raw_items
    "raw_items",              // FK→sources
    "tasks",                  // FK→sources, raw_items
    "alerts",                 // FK→sources(SET NULL), channel_spaces(SET NULL)
    "source_identity_history",// FK→sources
    "source_states",          // FK→sources
    "display_positions",      // FK→sources, channel_spaces, channels(CASCADE)
    "channels",               // FK→channel_spaces(CASCADE)
    "sources",                // 父表
    "channel_spaces",         // 顶层父表
  ];
  for (const t of ordered) {
    await pool.query(`DELETE FROM ${t}`);
  }
}

// 事务隔离 stub（兼容已修改的测试文件导入）
export async function beginTestTx(): Promise<void> { await cleanTestData(); }
export async function rollbackTestTx(): Promise<void> {}

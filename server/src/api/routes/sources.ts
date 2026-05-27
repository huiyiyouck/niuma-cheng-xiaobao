import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import { SourceCreate, SourceUpdate } from "../schemas/index.ts";
import { detectTypeWithHttp, SourceType } from "../source-detector.ts";
import { asDict } from "../../shared/utils.ts";

export async function sourcesRoutes(app: FastifyInstance): Promise<void> {
  // 列表
  app.get("/sources", async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as Record<string, string>;
    const params: any[] = [];
    const conditions: string[] = [];

    if (query.status) {
      params.push(query.status);
      conditions.push(`s.status = $${params.length}`);
    }
    if (query.type) {
      params.push(query.type);
      conditions.push(`s.type = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT s.* FROM sources s ${where} ORDER BY s.created_at DESC`,
      params,
    );

    const sourceIds = rows.map((r: any) => r.id);
    const bindings: Record<string, any[]> = {};
    if (sourceIds.length > 0) {
      const { rows: csRows } = await pool.query(
        `SELECT cs.source_id, cs.channel_space_id, cs.sub_channel_id, cs.enabled,
                csp.name as channel_space_name, sc.name as sub_channel_name
         FROM channel_sources cs
         JOIN channel_spaces csp ON csp.id = cs.channel_space_id
         LEFT JOIN sub_channels sc ON sc.id = cs.sub_channel_id
         WHERE cs.source_id = ANY($1)`,
        [sourceIds],
      );
      for (const cs of csRows) {
        if (!bindings[cs.source_id]) bindings[cs.source_id] = [];
        bindings[cs.source_id].push({
          channel_space_id: cs.channel_space_id,
          channel_space_name: cs.channel_space_name,
          sub_channel_id: cs.sub_channel_id,
          sub_channel_name: cs.sub_channel_name,
          enabled: cs.enabled,
        });
      }
    }

    return reply.send(
      rows.map((r: any) => ({
        ...sourceToOut(r),
        channel_spaces: bindings[r.id] || [],
      })),
    );
  });

  // 创建
  app.post("/sources", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = SourceCreate.parse(req.body);
    let sourceType = body.type;
    if (!sourceType && body.source_url?.trim()) {
      sourceType = await detectTypeWithHttp(body.source_url.trim());
    }
    if (!sourceType) sourceType = SourceType.unknown;

    const { rows: [row] } = await pool.query(
      `INSERT INTO sources(type, display_name, source_url, config, status)
       VALUES($1, $2, $3, $4, 'unverified') RETURNING *`,
      [sourceType, body.display_name, body.source_url?.trim() || null, JSON.stringify(body.config)],
    );
    return reply.status(201).send(sourceToOut(row));
  });

  // 类型检测
  app.get("/sources/detect-type", async (req: FastifyRequest, reply: FastifyReply) => {
    const { url } = req.query as { url: string };
    if (!url) return reply.status(400).send({ detail: "url required" });
    const detected = await detectTypeWithHttp(url);
    return reply.send({ type: detected, url });
  });

  // 单条
  app.get("/sources/:source_id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { source_id } = req.params as { source_id: string };
    const { rows: [row] } = await pool.query("SELECT * FROM sources WHERE id = $1", [source_id]);
    if (!row) return reply.status(404).send({ detail: "source not found" });

    const { rows: csRows } = await pool.query(
      `SELECT cs.source_id, cs.channel_space_id, cs.sub_channel_id, cs.enabled,
              csp.name as channel_space_name, sc.name as sub_channel_name
       FROM channel_sources cs
       JOIN channel_spaces csp ON csp.id = cs.channel_space_id
       LEFT JOIN sub_channels sc ON sc.id = cs.sub_channel_id
       WHERE cs.source_id = $1`,
      [source_id],
    );

    const bindings = csRows.map((cs: any) => ({
      channel_space_id: cs.channel_space_id,
      channel_space_name: cs.channel_space_name,
      sub_channel_id: cs.sub_channel_id,
      sub_channel_name: cs.sub_channel_name,
      enabled: cs.enabled,
    }));

    return reply.send({ ...sourceToOut(row), channel_spaces: bindings });
  });

  // 更新
  app.put("/sources/:source_id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { source_id } = req.params as { source_id: string };
    const body = SourceUpdate.parse(req.body);

    const { rows: [existing] } = await pool.query("SELECT * FROM sources WHERE id = $1", [source_id]);
    if (!existing) return reply.status(404).send({ detail: "source not found" });

    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 0;

    if (body.display_name !== undefined) {
      sets.push(`display_name = $${++idx}`); vals.push(body.display_name);
    }
    if (body.source_url !== undefined) {
      sets.push(`source_url = $${++idx}`);
      vals.push(body.source_url?.trim() || null);
    }
    if (body.type !== undefined) {
      sets.push(`type = $${++idx}`); vals.push(body.type);
    }
    if (body.config !== undefined) {
      sets.push(`config = $${++idx}`); vals.push(JSON.stringify(body.config));
    }

    // 修改 source_url 或 type → 重置验证状态
    if (body.source_url !== undefined || body.type !== undefined) {
      sets.push("status = 'unverified'");
      sets.push("last_verified_at = NULL");
      sets.push("verify_error = NULL");
    }

    if (sets.length > 0) {
      vals.push(source_id);
      await pool.query(`UPDATE sources SET ${sets.join(", ")} WHERE id = $${++idx}`, vals);
    }

    const { rows: [updated] } = await pool.query("SELECT * FROM sources WHERE id = $1", [source_id]);
    return reply.send(sourceToOut(updated));
  });

  // 删除
  app.delete("/sources/:source_id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { source_id } = req.params as { source_id: string };
    const { rows: [row] } = await pool.query("SELECT id FROM sources WHERE id = $1", [source_id]);
    if (!row) return reply.status(404).send({ detail: "source not found" });
    await pool.query("DELETE FROM sources WHERE id = $1", [source_id]);
    return reply.status(204).send();
  });

  // 验证
  app.post("/sources/:source_id/verify", async (req: FastifyRequest, reply: FastifyReply) => {
    const { source_id } = req.params as { source_id: string };
    const { rows: [row] } = await pool.query("SELECT * FROM sources WHERE id = $1", [source_id]);
    if (!row) return reply.status(404).send({ detail: "source not found" });

    const sourceType = row.type;
    const srcConfig = asDict(row.config);

    try {
      const items = await verifyFetch(sourceType, srcConfig);
      const verifyItems = items.slice(0, 5).map((it: any) => ({
        source_item_id: it.source_item_id,
        source_item_url: it.url || null,
        title: typeof it.content === "object" && it.content?.text ? String(it.content.text).slice(0, 80) : "",
        content_preview: truncatePreview(it, 200),
        published_at: it.published_at ? new Date(it.published_at).toISOString() : null,
      }));

      await pool.query(
        "UPDATE sources SET last_verified_at = NOW(), verify_error = NULL WHERE id = $1",
        [source_id],
      );
      return reply.send({ status: "ok", items: verifyItems, total_fetched: items.length });
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      await pool.query("UPDATE sources SET verify_error = $1 WHERE id = $2", [errorMsg, source_id]);
      return reply.send({ status: "error", error: errorMsg, items: [], total_fetched: 0 });
    }
  });

  // 标记已验证
  app.post("/sources/:source_id/mark-verified", async (req: FastifyRequest, reply: FastifyReply) => {
    const { source_id } = req.params as { source_id: string };
    const { rows: [row] } = await pool.query("SELECT * FROM sources WHERE id = $1", [source_id]);
    if (!row) return reply.status(404).send({ detail: "source not found" });
    if (row.status === "verified" || row.status === "active") return reply.send({ status: "ok" });
    if (row.status === "error") {
      return reply.status(409).send({ detail: "不能将 error 状态的 Source 直接标记为 verified" });
    }
    if (row.status !== "unverified") {
      return reply.status(409).send({ detail: `当前状态 ${row.status} 不允许此操作` });
    }
    await pool.query("UPDATE sources SET status = 'verified' WHERE id = $1", [source_id]);
    return reply.send({ status: "ok" });
  });
}

async function verifyFetch(sourceType: string, config: Record<string, unknown>): Promise<any[]> {
  const { find } = await import("../../worker/fetchers/registry.ts");
  const fetcher = find(sourceType);
  if (!fetcher) {
    const { NonRetryableError } = await import("../../worker/errors.ts");
    throw new NonRetryableError(`未注册的 Source 类型：${sourceType}`);
  }
  const { items } = await fetcher.fetch(config, {}, 5);
  return items;
}

function truncatePreview(item: any, maxChars: number): string {
  const content = item.content;
  let text = "";
  if (typeof content === "object" && content !== null) {
    text = content.text || content.description || "";
  } else if (typeof content === "string") {
    text = content;
  }
  return text.length <= maxChars ? text : text.slice(0, maxChars);
}

function sourceToOut(r: any) {
  return {
    id: r.id,
    type: r.type,
    display_name: r.display_name,
    source_url: r.source_url,
    status: r.status,
    config: asDict(r.config),
    last_verified_at: r.last_verified_at instanceof Date ? r.last_verified_at.toISOString() : r.last_verified_at,
    verify_error: r.verify_error,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import { PositionCreate, PositionUpdate, PositionsQuery } from "../schemas/index.ts";
import { toISO } from "./channel-spaces.ts";

export async function positionsRoutes(app: FastifyInstance): Promise<void> {
  // ── 展示位置列表（含 Source 卡片信息）──────────────────

  app.get("/spaces/:space_id/positions", async (req: FastifyRequest, reply: FastifyReply) => {
    const { space_id } = req.params as { space_id: string };
    const q = PositionsQuery.parse(req.query);

    // 验证空间存在
    const { rows: [space] } = await pool.query(
      "SELECT id FROM channel_spaces WHERE id = $1", [space_id],
    );
    if (!space) return reply.status(404).send({ detail: "频道空间不存在" });

    // channel_id 筛选：
    // - 不传 → 返回全部位置（管理页"全部"Tab）
    // - channel_id=UUID → 指定频道
    // - channel_id=（空值）→ 仅根节点（channel_id IS NULL）
    let channelFilter = "";
    const params: any[] = [space_id];
    const rawQuery = req.query as Record<string, string>;

    if (!("channel_id" in rawQuery)) {
      // 不传 → 全部位置
    } else if (q.channel_id) {
      channelFilter = "AND dp.channel_id = $2";
      params.push(q.channel_id);
    } else {
      channelFilter = "AND dp.channel_id IS NULL";
    }

    const { rows } = await pool.query(
      `SELECT
        dp.id AS position_id,
        dp.source_id,
        dp.channel_space_id,
        dp.channel_id,
        dp.enabled,
        dp.created_at AS position_created_at,
        s.type,
        s.identity,
        s.display_name,
        s.lifecycle_status,
        s.paused AS source_paused,
        s.domain_tags,
        s.source_role,
        s.attention_level,
        s.notes,
        ss.last_success_at,
        ss.consecutive_failures,
        ss.last_fetch_count,
        ch.name AS channel_name
       FROM display_positions dp
       JOIN sources s ON s.id = dp.source_id
       LEFT JOIN source_states ss ON ss.source_id = s.id
       LEFT JOIN channels ch ON ch.id = dp.channel_id
       WHERE dp.channel_space_id = $1
         AND dp.deleted_at IS NULL
         ${channelFilter}
       ORDER BY dp.created_at DESC`,
      params,
    );

    return reply.send(rows.map(positionToOut));
  });

  // ── 添加展示位置 ──────────────────────────────────────

  app.post("/spaces/:space_id/positions", async (req: FastifyRequest, reply: FastifyReply) => {
    const { space_id } = req.params as { space_id: string };
    const body = PositionCreate.parse(req.body);

    // 验证空间存在
    const { rows: [space] } = await pool.query(
      "SELECT id FROM channel_spaces WHERE id = $1", [space_id],
    );
    if (!space) return reply.status(404).send({ detail: "频道空间不存在" });

    // 验证 Source 存在且允许投放
    const { rows: [src] } = await pool.query(
      "SELECT id, type, identity, display_name, lifecycle_status FROM sources WHERE id = $1",
      [body.source_id],
    );
    if (!src) return reply.status(404).send({ detail: "信息源不存在" });
    if (src.lifecycle_status === "needs_fix" || src.lifecycle_status === "removed") {
      return reply.status(400).send({
        detail: `信息源状态为 ${src.lifecycle_status}，不允许添加到展示位置`,
      });
    }

    // 验证频道（如果指定）
    const channelId = body.channel_id ?? null;
    if (channelId) {
      const { rows: [ch] } = await pool.query(
        "SELECT id FROM channels WHERE id = $1 AND channel_space_id = $2",
        [channelId, space_id],
      );
      if (!ch) return reply.status(400).send({ detail: "频道不属于当前空间" });
    }

    // 去重检查：同一空间下该 Source 是否已有活跃位置
    const { rows: [dup] } = await pool.query(
      "SELECT id, channel_id FROM display_positions WHERE source_id = $1 AND channel_space_id = $2 AND deleted_at IS NULL",
      [body.source_id, space_id],
    );
    if (dup) {
      const loc = dup.channel_id ? "指定频道" : "根节点";
      return reply.status(409).send({ detail: `该信息源在此空间已存在（${loc}），请使用移动功能调整位置` });
    }

    try {
      const { rows: [row] } = await pool.query(
        `INSERT INTO display_positions(source_id, channel_space_id, channel_id, enabled)
         VALUES($1, $2, $3, true) RETURNING *`,
        [body.source_id, space_id, channelId],
      );
      // 同步 X Stream 规则（30s debounced）
      return reply.status(201).send(positionRowToOut(row));
    } catch (err: any) {
      if (err.code === "23505") {
        return reply.status(409).send({ detail: "该信息源在此位置已存在" });
      }
      throw err;
    }
  });

  // ── 暂停/恢复/移除展示位置 ────────────────────────────

  app.patch("/positions/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = PositionUpdate.parse(req.body);

    const { rows: [existing] } = await pool.query(
      "SELECT * FROM display_positions WHERE id = $1 AND deleted_at IS NULL", [id],
    );
    if (!existing) return reply.status(404).send({ detail: "展示位置不存在" });

    if (body.action === "pause") {
      await pool.query(
        "UPDATE display_positions SET enabled = false WHERE id = $1", [id],
      );
    } else if (body.action === "resume") {
      await pool.query(
        "UPDATE display_positions SET enabled = true WHERE id = $1", [id],
      );
    } else if (body.action === "remove") {
      // 软删除
      await pool.query(
        `UPDATE display_positions
         SET deleted_at = now(), removal_reason = $2
         WHERE id = $1`,
        [id, body.removal_reason ?? "manual"],
      );
      return reply.send({ deleted: true });
    } else if (body.action === "move") {
      if (body.channel_id === undefined) {
        return reply.status(400).send({ detail: "move 操作需要提供 channel_id" });
      }
      // 检查目标频道属于同一空间
      if (body.channel_id !== null) {
        const { rows: [ch] } = await pool.query(
          "SELECT id FROM channels WHERE id = $1 AND channel_space_id = $2",
          [body.channel_id, existing.channel_space_id],
        );
        if (!ch) return reply.status(400).send({ detail: "目标频道不属于当前空间" });
      }
      // 检查目标位置是否冲突
      const { rows: [conflict] } = await pool.query(
        `SELECT id FROM display_positions
         WHERE source_id = $1 AND channel_space_id = $2
           AND channel_id IS NOT DISTINCT FROM $3
           AND deleted_at IS NULL AND id != $4`,
        [existing.source_id, existing.channel_space_id, body.channel_id, id],
      );
      if (conflict) return reply.status(409).send({ detail: "该信息源在目标位置已存在" });
      await pool.query("UPDATE display_positions SET channel_id = $1 WHERE id = $2",
        [body.channel_id, id]);
    }

    const { rows: [updated] } = await pool.query(
      "SELECT * FROM display_positions WHERE id = $1", [id],
    );
    return reply.send(positionRowToOut(updated));
  });
}

// ── 输出格式化 ──────────────────────────────────────────

function positionToOut(r: any) {
  return {
    id: r.position_id,
    source_id: r.source_id,
    channel_space_id: r.channel_space_id,
    channel_id: r.channel_id,
    channel_name: r.channel_name ?? null,
    enabled: r.enabled,
    // Source 卡片信息
    source: {
      type: r.type,
      identity: r.identity,
      display_name: r.display_name,
      lifecycle_status: r.lifecycle_status,
      paused: r.source_paused ?? false,
      domain_tags: r.domain_tags || [],
      source_role: r.source_role,
      attention_level: r.attention_level,
      notes: r.notes,
      last_success_at: toISO(r.last_success_at),
      consecutive_failures: r.consecutive_failures ?? 0,
      last_fetch_count: r.last_fetch_count,
    },
    created_at: toISO(r.position_created_at),
  };
}

function positionRowToOut(r: any) {
  return {
    id: r.id,
    source_id: r.source_id,
    channel_space_id: r.channel_space_id,
    channel_id: r.channel_id,
    enabled: r.enabled,
    deleted_at: toISO(r.deleted_at),
    removal_reason: r.removal_reason,
    created_at: toISO(r.created_at),
  };
}

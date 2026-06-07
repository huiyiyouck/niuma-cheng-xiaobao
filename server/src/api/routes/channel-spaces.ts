import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import {
  ChannelSpaceCreate,
  ChannelSpaceUpdate,
  ChannelSpacesReorder,
  ChannelCreate,
  ChannelUpdate,
  ChannelDeleteBody,
  ChannelsReorder,
} from "../schemas/index.ts";

export async function channelSpacesRoutes(app: FastifyInstance): Promise<void> {
  // ── 空间列表 ──────────────────────────────────────────

  app.get("/spaces", async (_req: FastifyRequest, reply: FastifyReply) => {
    const { rows } = await pool.query(
      `SELECT
        cs.id, cs.name, cs.description, cs.sort_order, cs.icon, cs.created_at,
        COALESCE(ch.channel_count, 0)::int AS channel_count,
        COALESCE(dp.source_count, 0)::int AS source_count
       FROM channel_spaces cs
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS channel_count FROM channels ch WHERE ch.channel_space_id = cs.id
       ) ch ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(DISTINCT dp2.source_id)::int AS source_count
         FROM display_positions dp2
         WHERE dp2.channel_space_id = cs.id AND dp2.deleted_at IS NULL
       ) dp ON true
       ORDER BY cs.sort_order, cs.created_at DESC`,
    );
    return reply.send(rows.map(spaceToOut));
  });

  // ── 创建空间 ──────────────────────────────────────────

  app.post("/spaces", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = ChannelSpaceCreate.parse(req.body);
    try {
      const { rows: [row] } = await pool.query(
        `INSERT INTO channel_spaces(name, description, sort_order, icon)
         VALUES($1, $2, $3, $4)
         RETURNING id, name, description, sort_order, icon, created_at`,
        [body.name, body.description ?? null, body.sort_order ?? 0, body.icon ?? "📁"],
      );
      return reply.status(201).send(spaceToOut(row));
    } catch (err: any) {
      if (err.code === "23505") {
        return reply.status(409).send({ detail: `空间名称 '${body.name}' 已存在` });
      }
      throw err;
    }
  });

  // ── 更新空间 ──────────────────────────────────────────

  app.put("/spaces/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = ChannelSpaceUpdate.parse(req.body);

    const { rows: [existing] } = await pool.query(
      "SELECT id FROM channel_spaces WHERE id = $1", [id],
    );
    if (!existing) return reply.status(404).send({ detail: "频道空间不存在" });

    // 名称唯一性校验
    if (body.name) {
      const { rows: [dup] } = await pool.query(
        "SELECT id FROM channel_spaces WHERE name = $1 AND id != $2", [body.name, id],
      );
      if (dup) return reply.status(409).send({ detail: "频道空间名称已存在" });
    }

    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 0;
    if (body.name !== undefined) { sets.push(`name = $${++idx}`); vals.push(body.name); }
    if (body.description !== undefined) { sets.push(`description = $${++idx}`); vals.push(body.description); }
    if (body.sort_order !== undefined) { sets.push(`sort_order = $${++idx}`); vals.push(body.sort_order); }
    if (body.icon !== undefined) { sets.push(`icon = $${++idx}`); vals.push(body.icon); }

    if (sets.length > 0) {
      vals.push(id);
      const { rows: [updated] } = await pool.query(
        `UPDATE channel_spaces SET ${sets.join(", ")} WHERE id = $${++idx}
         RETURNING id, name, description, sort_order, icon, created_at`,
        vals,
      );
      return reply.send(spaceToOut(updated));
    }
    return reply.send(spaceToOut(existing));
  });

  // ── 删除空间 ──────────────────────────────────────────

  app.delete("/spaces/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const { rows: [existing] } = await pool.query(
      "SELECT id FROM channel_spaces WHERE id = $1", [id],
    );
    if (!existing) return reply.status(404).send({ detail: "频道空间不存在" });

    // 软删除空间下的非活跃展示位置
    await pool.query(
      `UPDATE display_positions
       SET deleted_at = now(), removal_reason = 'space_deleted'
       WHERE channel_space_id = $1 AND deleted_at IS NULL`,
      [id],
    );

    // 外键 ON DELETE CASCADE 会自动清理 channels 和 display_positions
    await pool.query("DELETE FROM channel_spaces WHERE id = $1", [id]);
    return reply.status(204).send();
  });

  // ── 空间排序 ──────────────────────────────────────────

  app.put("/spaces/reorder", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = ChannelSpacesReorder.parse(req.body);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const { id, sort_order } of body.items) {
        const { rows: [cs] } = await client.query(
          "SELECT id FROM channel_spaces WHERE id = $1", [id],
        );
        if (!cs) {
          await client.query("ROLLBACK");
          return reply.status(400).send({ detail: `空间 ${id} 不存在` });
        }
        await client.query(
          "UPDATE channel_spaces SET sort_order = $1 WHERE id = $2",
          [sort_order, id],
        );
      }
      await client.query("COMMIT");
      return reply.send({ ok: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  // ── 空间删除影响预览 ──────────────────────────────────

  app.get("/spaces/:id/delete-preview", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const { rows: [space] } = await pool.query(
      "SELECT id, name FROM channel_spaces WHERE id = $1", [id],
    );
    if (!space) return reply.status(404).send({ detail: "频道空间不存在" });

    const [channelsCount, positionsCount, newsCount] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS c FROM channels WHERE channel_space_id = $1", [id]),
      pool.query(
        "SELECT COUNT(*)::int AS c FROM display_positions WHERE channel_space_id = $1 AND deleted_at IS NULL",
        [id],
      ),
      pool.query(
        `SELECT COUNT(DISTINCT pn.id)::int AS c
         FROM processed_news pn
         JOIN news_positions np ON np.news_id = pn.id
         JOIN display_positions dp ON dp.id = np.position_id
         WHERE dp.channel_space_id = $1 AND dp.deleted_at IS NULL`,
        [id],
      ),
    ]);

    return reply.send({
      space_name: space.name,
      channels_count: channelsCount.rows[0]?.c ?? 0,
      positions_count: positionsCount.rows[0]?.c ?? 0,
      affected_news_count: newsCount.rows[0]?.c ?? 0,
    });
  });

  // ── 频道列表 ──────────────────────────────────────────

  app.get("/spaces/:id/channels", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const { rows: [space] } = await pool.query(
      "SELECT id FROM channel_spaces WHERE id = $1", [id],
    );
    if (!space) return reply.status(404).send({ detail: "频道空间不存在" });

    const { rows } = await pool.query(
      `SELECT ch.*, COALESCE(dp.source_count, 0)::int AS source_count
       FROM channels ch
       LEFT JOIN LATERAL (
         SELECT COUNT(DISTINCT dp2.source_id)::int AS source_count
         FROM display_positions dp2
         WHERE dp2.channel_id = ch.id AND dp2.deleted_at IS NULL
       ) dp ON true
       WHERE ch.channel_space_id = $1
       ORDER BY ch.sort_order, ch.created_at`,
      [id],
    );
    return reply.send(rows.map(channelToOut));
  });

  // ── 创建频道 ──────────────────────────────────────────

  app.post("/spaces/:id/channels", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = ChannelCreate.parse(req.body);

    const { rows: [space] } = await pool.query(
      "SELECT id FROM channel_spaces WHERE id = $1", [id],
    );
    if (!space) return reply.status(404).send({ detail: "频道空间不存在" });

    try {
      const { rows: [row] } = await pool.query(
        `INSERT INTO channels(channel_space_id, name, description, sort_order)
         VALUES($1, $2, $3, $4) RETURNING *`,
        [id, body.name, body.description ?? null, body.sort_order ?? 0],
      );
      return reply.status(201).send(channelToOut(row));
    } catch (err: any) {
      if (err.code === "23505") {
        return reply.status(409).send({ detail: `频道名称 '${body.name}' 已存在` });
      }
      throw err;
    }
  });

  // ── 更新频道 ──────────────────────────────────────────

  app.put("/spaces/:id/channels/:cid", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id, cid } = req.params as { id: string; cid: string };
    const body = ChannelUpdate.parse(req.body);

    const { rows: [existing] } = await pool.query(
      "SELECT * FROM channels WHERE id = $1 AND channel_space_id = $2", [cid, id],
    );
    if (!existing) return reply.status(404).send({ detail: "频道不存在" });

    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 0;

    if (body.name !== undefined) { sets.push(`name = $${++idx}`); vals.push(body.name); }
    if (body.description !== undefined) { sets.push(`description = $${++idx}`); vals.push(body.description); }
    if (body.sort_order !== undefined) { sets.push(`sort_order = $${++idx}`); vals.push(body.sort_order); }
    if (sets.length === 0) {
      return reply.status(400).send({ detail: "at least one field required" });
    }

    vals.push(cid);
    const { rows: [updated] } = await pool.query(
      `UPDATE channels SET ${sets.join(", ")} WHERE id = $${++idx} RETURNING *`,
      vals,
    );
    return reply.send(channelToOut(updated));
  });

  // ── 删除频道（含迁移逻辑）─────────────────────────────

  app.delete("/spaces/:id/channels/:cid", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id, cid } = req.params as { id: string; cid: string };
    const body = ChannelDeleteBody.parse(req.body);

    const { rows: [channel] } = await pool.query(
      "SELECT id FROM channels WHERE id = $1 AND channel_space_id = $2", [cid, id],
    );
    if (!channel) return reply.status(404).send({ detail: "频道不存在" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      if (body.action === "migrate_to_root") {
        // 冲突检测：目标位置（空间根节点）是否已存在同一 Source 的展示位置
        const { rows: conflicts } = await client.query(
          `SELECT DISTINCT dp.source_id
           FROM display_positions dp
           WHERE dp.channel_id = $1 AND dp.deleted_at IS NULL
           AND EXISTS(
             SELECT 1 FROM display_positions dp2
             WHERE dp2.source_id = dp.source_id
               AND dp2.channel_space_id = $2
               AND dp2.channel_id IS NULL
               AND dp2.deleted_at IS NULL
           )`,
          [cid, id],
        );
        if (conflicts.length > 0) {
          await client.query("ROLLBACK");
          return reply.status(409).send({
            detail: "部分展示位置在空间根节点已存在，无法迁移",
            conflicting_source_ids: conflicts.map((c: any) => c.source_id),
          });
        }

        // 迁移：channel_id 改为 NULL
        await client.query(
          `UPDATE display_positions
           SET channel_id = NULL
           WHERE channel_id = $1 AND deleted_at IS NULL`,
          [cid],
        );
      }

      if (body.action === "remove_all") {
        // 全部软删除
        await client.query(
          `UPDATE display_positions
           SET deleted_at = now(), removal_reason = 'channel_deleted'
           WHERE channel_id = $1 AND deleted_at IS NULL`,
          [cid],
        );
      }

      // 硬删除频道
      await client.query("DELETE FROM channels WHERE id = $1", [cid]);
      await client.query("COMMIT");
      return reply.status(204).send();
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  // ── 频道排序 ──────────────────────────────────────────

  app.put("/spaces/:id/channels/reorder", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = ChannelsReorder.parse(req.body);

    const { rows: [space] } = await pool.query(
      "SELECT id FROM channel_spaces WHERE id = $1", [id],
    );
    if (!space) return reply.status(404).send({ detail: "频道空间不存在" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const { id: chId, sort_order } of body.items) {
        const { rows: [ch] } = await client.query(
          "SELECT id FROM channels WHERE id = $1 AND channel_space_id = $2",
          [chId, id],
        );
        if (!ch) {
          await client.query("ROLLBACK");
          return reply.status(400).send({ detail: "频道不属于当前空间" });
        }
        await client.query("UPDATE channels SET sort_order = $1 WHERE id = $2", [sort_order, chId]);
      }
      await client.query("COMMIT");
      return reply.send({ ok: true });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  // ── 频道删除影响预览 ──────────────────────────────────

  app.get("/spaces/:id/channels/:cid/delete-preview", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id, cid } = req.params as { id: string; cid: string };
    const { rows: [channel] } = await pool.query(
      "SELECT id, name FROM channels WHERE id = $1 AND channel_space_id = $2", [cid, id],
    );
    if (!channel) return reply.status(404).send({ detail: "频道不存在" });

    const [positionsResult, conflictsResult] = await Promise.all([
      pool.query(
        "SELECT COUNT(*)::int AS c FROM display_positions WHERE channel_id = $1 AND deleted_at IS NULL",
        [cid],
      ),
      pool.query(
        `SELECT COUNT(DISTINCT dp.source_id)::int AS c
         FROM display_positions dp
         WHERE dp.channel_id = $1 AND dp.deleted_at IS NULL
         AND EXISTS(
           SELECT 1 FROM display_positions dp2
           WHERE dp2.source_id = dp.source_id
             AND dp2.channel_space_id = $2
             AND dp2.channel_id IS NULL
             AND dp2.deleted_at IS NULL
         )`,
        [cid, id],
      ),
    ]);

    return reply.send({
      channel_name: channel.name,
      positions_count: positionsResult.rows[0]?.c ?? 0,
      conflict_count: conflictsResult.rows[0]?.c ?? 0,
    });
  });
}

// ── 输出格式化 ──────────────────────────────────────────

function spaceToOut(r: any) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    sort_order: r.sort_order,
    icon: r.icon,
    channel_count: r.channel_count ?? 0,
    source_count: r.source_count ?? 0,
    created_at: toISO(r.created_at),
  };
}

function channelToOut(r: any) {
  return {
    id: r.id,
    channel_space_id: r.channel_space_id,
    name: r.name,
    description: r.description ?? null,
    sort_order: r.sort_order,
    source_count: r.source_count ?? 0,
    created_at: toISO(r.created_at),
  };
}

export function toISO(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return null;
}

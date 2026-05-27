import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import { ChannelSourceBind, ChannelSourceUpdatePolicy } from "../schemas/index.ts";
import { asDict } from "../../shared/utils.ts";

export async function bindingsRoutes(app: FastifyInstance): Promise<void> {
  // 列出频道下的 Source 绑定
  app.get("/channel-spaces/:space_id/sources", async (req: FastifyRequest, reply: FastifyReply) => {
    const { space_id } = req.params as { space_id: string };
    const { rows } = await pool.query(
      `SELECT cs.*, s.type, s.display_name, s.source_url, s.status, s.config,
              s.last_verified_at, s.verify_error, s.created_at as s_created_at
       FROM channel_sources cs
       JOIN sources s ON s.id = cs.source_id
       WHERE cs.channel_space_id = $1
       ORDER BY cs.created_at DESC`,
      [space_id],
    );
    return reply.send(
      rows.map((r: any) => ({
        channel_source: channelSourceToOut(r),
        source: {
          id: r.source_id,
          type: r.type,
          display_name: r.display_name,
          source_url: r.source_url,
          status: r.status,
          config: asDict(r.config),
          last_verified_at: r.last_verified_at instanceof Date ? r.last_verified_at.toISOString() : r.last_verified_at,
          verify_error: r.verify_error,
          created_at: r.s_created_at instanceof Date ? r.s_created_at.toISOString() : r.s_created_at,
        },
      })),
    );
  });

  // 绑定 Source 到频道
  app.post("/channel-spaces/:space_id/sources", async (req: FastifyRequest, reply: FastifyReply) => {
    const { space_id } = req.params as { space_id: string };
    const body = ChannelSourceBind.parse(req.body);

    // 验证 space 存在
    const { rows: [space] } = await pool.query("SELECT id FROM channel_spaces WHERE id = $1", [space_id]);
    if (!space) return reply.status(404).send({ detail: "channel_space not found" });

    // 验证 source 存在
    const { rows: [src] } = await pool.query("SELECT id, status FROM sources WHERE id = $1", [body.source_id]);
    if (!src) return reply.status(404).send({ detail: "source not found" });

    // 验证 sub_channel
    if (body.sub_channel_id) {
      const { rows: [sc] } = await pool.query(
        "SELECT id FROM sub_channels WHERE id = $1 AND channel_space_id = $2",
        [body.sub_channel_id, space_id],
      );
      if (!sc) return reply.status(400).send({ detail: "sub_channel not found in this channel_space" });
    }

    // verified → active 触发
    if (body.enabled && src.status === "verified") {
      await pool.query("UPDATE sources SET status = 'active' WHERE id = $1", [body.source_id]);
    }

    try {
      const { rows: [row] } = await pool.query(
        `INSERT INTO channel_sources(channel_space_id, source_id, enabled, fetch_policy, sub_channel_id)
         VALUES($1, $2, $3, $4, $5) RETURNING *`,
        [space_id, body.source_id, body.enabled, JSON.stringify(body.fetch_policy), body.sub_channel_id ?? null],
      );
      return reply.status(201).send(channelSourceToOut(row));
    } catch (err: any) {
      if (err.code === "23505") {
        return reply.status(409).send({ detail: "该 Source 已绑定到此 ChannelSpace" });
      }
      throw err;
    }
  });

  // 更新绑定
  app.put("/channel-sources/:channel_source_id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { channel_source_id } = req.params as { channel_source_id: string };
    const body = ChannelSourceUpdatePolicy.parse(req.body);

    const { rows: [existing] } = await pool.query(
      "SELECT * FROM channel_sources WHERE id = $1",
      [channel_source_id],
    );
    if (!existing) return reply.status(404).send({ detail: "channel_source not found" });

    if (body.enabled === true && !existing.enabled) {
      const { rows: [src] } = await pool.query("SELECT status FROM sources WHERE id = $1", [existing.source_id]);
      if (src?.status === "verified") {
        await pool.query("UPDATE sources SET status = 'active' WHERE id = $1", [existing.source_id]);
      }
    }

    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 0;

    if (body.enabled !== undefined) {
      sets.push(`enabled = $${++idx}`); vals.push(body.enabled);
    }
    if (body.fetch_policy !== undefined) {
      sets.push(`fetch_policy = $${++idx}`); vals.push(JSON.stringify(body.fetch_policy));
    }
    if (body.sub_channel_id !== undefined) {
      if (body.sub_channel_id) {
        const { rows: [sc] } = await pool.query(
          "SELECT id FROM sub_channels WHERE id = $1 AND channel_space_id = $2",
          [body.sub_channel_id, existing.channel_space_id],
        );
        if (!sc) return reply.status(400).send({ detail: "sub_channel not found in this channel_space" });
      }
      sets.push(`sub_channel_id = $${++idx}`); vals.push(body.sub_channel_id);
    }

    if (sets.length > 0) {
      vals.push(channel_source_id);
      await pool.query(`UPDATE channel_sources SET ${sets.join(", ")} WHERE id = $${++idx}`, vals);
    }

    const { rows: [updated] } = await pool.query(
      "SELECT * FROM channel_sources WHERE id = $1",
      [channel_source_id],
    );
    return reply.send(channelSourceToOut(updated));
  });
}

function channelSourceToOut(r: any) {
  return {
    id: r.id,
    channel_space_id: r.channel_space_id,
    source_id: r.source_id,
    enabled: r.enabled,
    fetch_policy: asDict(r.fetch_policy),
    sub_channel_id: r.sub_channel_id,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

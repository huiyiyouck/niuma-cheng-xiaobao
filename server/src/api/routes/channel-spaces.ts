import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import { ChannelSpaceCreate, ChannelSpaceUpdate } from "../schemas/index.ts";

export async function channelSpacesRoutes(app: FastifyInstance): Promise<void> {
  // 列表
  app.get("/channel-spaces", async (_req: FastifyRequest, reply: FastifyReply) => {
    const { rows } = await pool.query(
      "SELECT id, name, description, created_at FROM channel_spaces ORDER BY created_at DESC",
    );
    return reply.send(rows.map(rowToOut));
  });

  // 创建
  app.post("/channel-spaces", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = ChannelSpaceCreate.parse(req.body);
    const { rows: [row] } = await pool.query(
      "INSERT INTO channel_spaces(name, description) VALUES($1, $2) RETURNING id, name, description, created_at",
      [body.name, body.description ?? null],
    );
    return reply.status(201).send(rowToOut(row));
  });

  // v0.4: 重命名频道空间
  app.put("/channel-spaces/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = ChannelSpaceUpdate.parse(req.body);

    // 确认存在
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

    if (sets.length > 0) {
      vals.push(id);
      const { rows: [updated] } = await pool.query(
        `UPDATE channel_spaces SET ${sets.join(", ")} WHERE id = $${++idx} RETURNING id, name, description, created_at`,
        vals,
      );
      return reply.send(rowToOut(updated));
    }
    return reply.send(rowToOut(existing));
  });

  // v0.4: 删除前统计
  app.get("/channel-spaces/:id/delete-preview", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const { rows: [space] } = await pool.query("SELECT id FROM channel_spaces WHERE id = $1", [id]);
    if (!space) return reply.status(404).send({ detail: "频道空间不存在" });

    const counts: Record<string, number> = {};
    for (const tbl of ["sub_channels", "channel_sources", "raw_items", "processed_news", "tasks", "alerts"]) {
      const { rows: [r] } = await pool.query(
        `SELECT COUNT(*)::int AS c FROM ${tbl} WHERE channel_space_id = $1`, [id],
      );
      counts[tbl] = r.c;
    }
    // source_states 通过 channel_sources 间接关联
    const { rows: [ss] } = await pool.query(
      `SELECT COUNT(*)::int AS c FROM source_states ss
       JOIN channel_sources cs ON cs.id = ss.channel_source_id
       WHERE cs.channel_space_id = $1`, [id],
    );
    counts.source_states = ss.c;

    return reply.send({
      channel_sources: counts.channel_sources,
      sub_channels: counts.sub_channels,
      raw_items: counts.raw_items,
      processed_news: counts.processed_news,
      source_states: counts.source_states,
      tasks: counts.tasks,
      alerts: counts.alerts,
    });
  });

  // v0.4: 删除频道空间（外键 ON DELETE CASCADE 自动级联）
  app.delete("/channel-spaces/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const { rows: [existing] } = await pool.query("SELECT id FROM channel_spaces WHERE id = $1", [id]);
    if (!existing) return reply.status(404).send({ detail: "频道空间不存在" });
    await pool.query("DELETE FROM channel_spaces WHERE id = $1", [id]);
    return reply.status(204).send();
  });
}

function rowToOut(r: any) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

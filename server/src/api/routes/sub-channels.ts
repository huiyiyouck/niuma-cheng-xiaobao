import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import { SubChannelCreate, SubChannelUpdate, SubChannelsReorder } from "../schemas/index.ts";

export async function subChannelsRoutes(app: FastifyInstance): Promise<void> {
  // 列表
  app.get("/channel-spaces/:space_id/sub-channels", async (req: FastifyRequest, reply: FastifyReply) => {
    const { space_id } = req.params as { space_id: string };
    const { rows } = await pool.query(
      "SELECT * FROM sub_channels WHERE channel_space_id = $1 ORDER BY sort_order, created_at",
      [space_id],
    );
    return reply.send(rows.map(rowToOut));
  });

  // 创建
  app.post("/channel-spaces/:space_id/sub-channels", async (req: FastifyRequest, reply: FastifyReply) => {
    const { space_id } = req.params as { space_id: string };
    const body = SubChannelCreate.parse(req.body);

    const { rows: [space] } = await pool.query("SELECT id FROM channel_spaces WHERE id = $1", [space_id]);
    if (!space) return reply.status(404).send({ detail: "channel_space not found" });

    try {
      const { rows: [row] } = await pool.query(
        "INSERT INTO sub_channels(channel_space_id, name, sort_order) VALUES($1, $2, $3) RETURNING *",
        [space_id, body.name, body.sort_order],
      );
      return reply.status(201).send(rowToOut(row));
    } catch (err: any) {
      if (err.code === "23505") {
        return reply.status(409).send({ detail: `子频道名称 '${body.name}' 已存在` });
      }
      throw err;
    }
  });

  // 更新
  app.put("/sub-channels/:sub_channel_id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { sub_channel_id } = req.params as { sub_channel_id: string };
    const body = SubChannelUpdate.parse(req.body);

    const { rows: [existing] } = await pool.query("SELECT * FROM sub_channels WHERE id = $1", [sub_channel_id]);
    if (!existing) return reply.status(404).send({ detail: "sub_channel not found" });

    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 0;

    if (body.name !== undefined) {
      sets.push(`name = $${++idx}`); vals.push(body.name);
    }
    if (body.sort_order !== undefined) {
      sets.push(`sort_order = $${++idx}`); vals.push(body.sort_order);
    }
    if (sets.length === 0) {
      return reply.status(400).send({ detail: "at least one field required" });
    }

    vals.push(sub_channel_id);
    await pool.query(`UPDATE sub_channels SET ${sets.join(", ")} WHERE id = $${++idx}`, vals);

    const { rows: [updated] } = await pool.query("SELECT * FROM sub_channels WHERE id = $1", [sub_channel_id]);
    return reply.send(rowToOut(updated));
  });

  // 删除
  app.delete("/sub-channels/:sub_channel_id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { sub_channel_id } = req.params as { sub_channel_id: string };
    const { rows: [row] } = await pool.query("SELECT id FROM sub_channels WHERE id = $1", [sub_channel_id]);
    if (!row) return reply.status(404).send({ detail: "sub_channel not found" });
    await pool.query("DELETE FROM sub_channels WHERE id = $1", [sub_channel_id]);
    return reply.status(204).send();
  });

  // v0.4: 批量更新子频道排序
  app.put("/channel-spaces/:space_id/sub-channels/reorder", async (req: FastifyRequest, reply: FastifyReply) => {
    const { space_id } = req.params as { space_id: string };
    const body = SubChannelsReorder.parse(req.body);

    const { rows: [space] } = await pool.query("SELECT id FROM channel_spaces WHERE id = $1", [space_id]);
    if (!space) return reply.status(404).send({ detail: "channel_space not found" });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const { id, sort_order } of body.items) {
        const { rows: [sc] } = await client.query(
          "SELECT id FROM sub_channels WHERE id = $1 AND channel_space_id = $2", [id, space_id],
        );
        if (!sc) {
          await client.query("ROLLBACK");
          return reply.status(400).send({ detail: "子频道不属于当前空间" });
        }
        await client.query("UPDATE sub_channels SET sort_order = $1 WHERE id = $2", [sort_order, id]);
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
}

function rowToOut(r: any) {
  return {
    id: r.id,
    channel_space_id: r.channel_space_id,
    name: r.name,
    sort_order: r.sort_order,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

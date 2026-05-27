import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import { ChannelSpaceCreate } from "../schemas/index.ts";

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
}

function rowToOut(r: any) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

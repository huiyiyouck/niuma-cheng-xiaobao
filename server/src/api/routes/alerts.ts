import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import { asDict } from "../../shared/utils.ts";

export async function alertsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/alerts", async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as Record<string, string>;
    const limit = Math.min(Math.max(parseInt(query.limit || "50"), 1), 200);

    const params: any[] = [limit];
    let where = "";
    if (query.channel_space_id) {
      where = "WHERE channel_space_id = $2";
      params.push(query.channel_space_id);
    }

    const { rows } = await pool.query(
      `SELECT * FROM alerts ${where} ORDER BY created_at DESC LIMIT $1`,
      params,
    );
    return reply.send(rows.map(alertToOut));
  });
}

function alertToOut(r: any) {
  return {
    id: r.id,
    channel_space_id: r.channel_space_id,
    type: r.type,
    severity: r.severity,
    message: r.message,
    meta: asDict(r.meta),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import { asDict } from "../../shared/utils.ts";
import { AlertStatusUpdate, AlertsAcknowledgeAll } from "../schemas/index.ts";

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

  // v0.4: 更新告警状态
  app.patch("/alerts/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = AlertStatusUpdate.parse(req.body);

    const { rows: [existing] } = await pool.query("SELECT * FROM alerts WHERE id = $1", [id]);
    if (!existing) return reply.status(404).send({ detail: "告警不存在" });

    // 状态机校验（Zod 已排除 "active"，API 层只接收 acknowledged/resolved）
    const current: string = existing.status;
    if (current === "resolved") {
      return reply.status(422).send({ detail: "已解决的告警不可再次修改状态" });
    }
    // active→acknowledged, active→resolved, acknowledged→resolved 均合法

    const { rows: [updated] } = await pool.query(
      "UPDATE alerts SET status = $1 WHERE id = $2 RETURNING *", [body.status, id],
    );
    return reply.send(alertToOut(updated));
  });

  // v0.4: 批量标记已确认
  app.post("/alerts/acknowledge-all", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = AlertsAcknowledgeAll.parse(req.body);

    const params: any[] = [];
    let where = "status = 'active'";
    if (body.channel_space_id) {
      where += " AND channel_space_id = $1";
      params.push(body.channel_space_id);
    }

    const { rowCount } = await pool.query(
      `UPDATE alerts SET status = 'acknowledged' WHERE ${where}`, params,
    );
    return reply.send({ updated: rowCount ?? 0 });
  });
}

function alertToOut(r: any) {
  return {
    id: r.id,
    channel_space_id: r.channel_space_id,
    type: r.type,
    severity: r.severity,
    status: r.status,
    message: r.message,
    meta: asDict(r.meta),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

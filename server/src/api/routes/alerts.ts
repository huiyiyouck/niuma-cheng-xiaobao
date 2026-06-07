import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import { asDict } from "../../shared/utils.ts";
import { AlertStatusUpdate, AlertsQuery } from "../schemas/index.ts";
import { toISO } from "./channel-spaces.ts";

export async function alertsRoutes(app: FastifyInstance): Promise<void> {
  // ── 告警列表（含 counts）──────────────────────────────

  app.get("/alerts", async (req: FastifyRequest, reply: FastifyReply) => {
    const q = AlertsQuery.parse(req.query);

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 0;

    if (q.status) {
      conditions.push(`a.status = $${++idx}`);
      params.push(q.status);
    }
    if (q.type) {
      conditions.push(`a.type = $${++idx}`);
      params.push(q.type);
    }
    if (q.severity) {
      conditions.push(`a.severity = $${++idx}`);
      params.push(q.severity);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // 分页
    const pageSize = q.page_size;
    const offset = (q.page - 1) * pageSize;
    params.push(pageSize, offset);
    const limitIdx = ++idx;
    const offsetIdx = ++idx;

    const { rows } = await pool.query(
      `SELECT a.*,
              s.display_name AS source_display_name,
              cs.name AS space_name,
              NULL AS channel_name
       FROM alerts a
       LEFT JOIN sources s ON s.id = a.source_id
       LEFT JOIN channel_spaces cs ON cs.id = a.channel_space_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    // 获取各状态计数
    const { rows: countRows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'acknowledged')::int AS acknowledged,
         COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
         COUNT(*) FILTER (WHERE status = 'ignored')::int AS ignored,
         COUNT(*)::int AS total
       FROM alerts`,
    );

    const counts = countRows[0] || { active: 0, acknowledged: 0, resolved: 0, ignored: 0, total: 0 };

    // 按筛选条件重新计总数
    let filteredTotal: number;
    if (conditions.length > 0) {
      const { rows: [ft] } = await pool.query(
        `SELECT COUNT(*)::int AS c FROM alerts a ${where}`,
        params.slice(0, -2), // 去掉 limit/offset 参数
      );
      filteredTotal = ft?.c ?? 0;
    } else {
      filteredTotal = counts.total;
    }

    return reply.send({
      alerts: rows.map(alertToOut),
      total: filteredTotal,
      counts: {
        active: counts.active,
        acknowledged: counts.acknowledged,
        resolved: counts.resolved,
        ignored: counts.ignored,
      },
    });
  });

  // ── 更新告警状态 ──────────────────────────────────────

  app.patch("/alerts/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = AlertStatusUpdate.parse(req.body);

    const { rows: [existing] } = await pool.query(
      "SELECT * FROM alerts WHERE id = $1", [id],
    );
    if (!existing) return reply.status(404).send({ detail: "告警不存在" });

    const current = existing.status;

    // 状态流转校验
    const allowedTransitions: Record<string, string[]> = {
      active: ["acknowledged", "ignored"],
      acknowledged: ["resolved", "ignored"],
      resolved: [], // 终态
      ignored: ["active"], // 只能重新打开
    };

    const allowed = allowedTransitions[current] || [];
    if (!allowed.includes(body.status)) {
      return reply.status(422).send({
        detail: `不允许从 ${current} 转换到 ${body.status}`,
      });
    }

    // 更新
    const updates: string[] = [];
    const vals: any[] = [body.status];
    let idx = 1;

    if (body.status === "resolved") {
      updates.push(`resolved_at = now()`);
    }

    updates.push(`status = $${idx}`);

    vals.push(id);
    const { rows: [updated] } = await pool.query(
      `UPDATE alerts SET ${updates.join(", ")} WHERE id = $${++idx} RETURNING *`,
      vals,
    );

    return reply.send(alertToOut(updated));
  });

  // ── 批量更新告警状态 ────────────────────────────────────

  app.patch("/alerts/batch", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = AlertStatusUpdate.parse(req.body);
    // body.status: acknowledged | ignored | resolved
    // 根据目标状态推断源状态（确认→来自活跃，恢复→来自已确认）
    const fromMap: Record<string, string> = { acknowledged: "active", resolved: "acknowledged", ignored: "active" };
    const fromStatus = fromMap[body.status] || "active";
    const result = await pool.query(
      `UPDATE alerts SET status = $1 WHERE status = $2 RETURNING id`,
      [body.status, fromStatus],
    );
    return reply.send({ updated: result.rowCount ?? 0 });
  });

  // ── 未处理数量（顶栏角标）─────────────────────────────

  app.get("/alerts/unread-count", async (_req: FastifyRequest, reply: FastifyReply) => {
    const { rows: [row] } = await pool.query(
      "SELECT COUNT(*)::int AS count FROM alerts WHERE status = 'active'",
    );
    return reply.send({ count: row?.count ?? 0 });
  });
}

function alertToOut(r: any) {
  return {
    id: r.id,
    scope: r.scope,
    source_id: r.source_id,
    source_display_name: r.source_display_name ?? null,
    channel_space_id: r.channel_space_id,
    space_name: r.space_name ?? null,
    channel_name: r.channel_name ?? null,
    type: r.type,
    severity: r.severity,
    status: r.status,
    message: r.message,
    meta: asDict(r.meta),
    dedup_key: r.dedup_key,
    last_triggered_at: toISO(r.last_triggered_at),
    resolved_at: toISO(r.resolved_at),
    created_at: toISO(r.created_at),
  };
}

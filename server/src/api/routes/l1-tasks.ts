import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import { maxAttemptsForTaskType } from "../../worker/dispatcher.ts";

/**
 * L1 手动重试（AC-31）
 * #D11：不创建 l1_retry type，手动重试创建与原任务同类型的新任务。
 * 遗留 #7（2026-08-01）：放开 l1_ai_process（database 模式 ai 任务），max_attempts 走单一真源。
 */
export async function l1TasksRoutes(app: FastifyInstance): Promise<void> {
  app.post("/l1-tasks/:task_id/retry", async (req: FastifyRequest, reply: FastifyReply) => {
    const { task_id } = req.params as { task_id: string };

    // 查找任务并校验类型
    const { rows: [task] } = await pool.query(
      `SELECT t.id, t.type, t.status, t.raw_item_id, t.source_id,
              ri.l1_status
       FROM tasks t
       JOIN raw_items ri ON ri.id = t.raw_item_id
       WHERE t.id = $1`,
      [task_id],
    );
    if (!task) return reply.status(404).send({ detail: "任务不存在" });

    if (!["l1_process", "l1_ai_process"].includes(task.type)) {
      return reply.status(400).send({ detail: `任务类型 ${task.type} 不支持手动重试，仅支持 l1_process / l1_ai_process` });
    }
    if (!["failed", "retryable_failed", "final_failed"].includes(task.l1_status)) {
      return reply.status(400).send({ detail: `当前 L1 状态 ${task.l1_status} 不支持重试` });
    }

    // #D11：创建与原任务同类型的新 task；当前 tasks 表无 metadata 列，不额外记录触发来源。
    const { rows: [newTask] } = await pool.query(
      `INSERT INTO tasks(type, source_id, raw_item_id, status, priority, run_after, attempt, max_attempts, created_at, updated_at)
       VALUES($1, $2, $3, 'queued', 1, now(), 0, $4, now(), now())
       RETURNING id`,
      [task.type, task.source_id, task.raw_item_id, maxAttemptsForTaskType(task.type)],
    );

    // 重置 raw_items L1 状态
    await pool.query(
      `UPDATE raw_items SET l1_status = 'queued', l1_attempt = 0, l1_error = NULL, l1_next_retry_at = NULL
       WHERE id = $1`,
      [task.raw_item_id],
    );

    return reply.send({
      success: true,
      new_task_id: newTask.id,
      status: "queued",
    });
  });
}

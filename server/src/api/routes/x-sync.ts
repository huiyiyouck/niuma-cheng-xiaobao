import type { FastifyInstance, FastifyReply } from "fastify";
import { xRuleSyncer } from "../../worker/x-rule-sync.ts";

export async function xSyncRoutes(app: FastifyInstance): Promise<void> {
  app.post("/x/sync-rules", async (_req, reply: FastifyReply) => {
    try {
      const result = await xRuleSyncer.syncOnce();
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ detail: err.message || "X 规则同步失败" });
    }
  });
}

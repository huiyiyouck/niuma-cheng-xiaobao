import type { FastifyRequest, FastifyReply } from "fastify";
import { apiLogger } from "../../shared/logger.ts";

export async function httpLogger(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const t0 = performance.now();
  await reply;
  const durationMs = Math.round((performance.now() - t0) * 100) / 100;
  apiLogger.info("HTTP %s %s → %d (%dms)", request.method, request.url, reply.statusCode, Math.round(durationMs));
}

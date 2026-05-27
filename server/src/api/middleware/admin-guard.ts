import type { FastifyRequest, FastifyReply } from "fastify";
import { config } from "../../shared/config.ts";

function clientIp(request: FastifyRequest): string {
  if (config.trustProxyHeaders) {
    const xff = request.headers["x-forwarded-for"];
    if (typeof xff === "string") return xff.split(",")[0]!.trim();
  }
  return request.ip;
}

export async function adminGuard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const path = request.url;
  const method = request.method;

  // 判断是否需要管理员权限
  const isAlertsPath = path.startsWith("/v1/alerts");
  const isNonGetWrite =
    path.startsWith("/v1") && !["GET", "HEAD", "OPTIONS"].includes(method);

  if (!isAlertsPath && !isNonGetWrite) return;

  // Token 验证
  if (config.adminToken) {
    const token = (request.headers["x-admin-token"] as string) || "";
    if (token !== config.adminToken) {
      reply.status(403).send({ detail: "forbidden" });
      return;
    }
    if (!config.adminRequireBoth) return;
  }

  // IP 白名单
  const allowed = new Set(
    config.adminAllowedIps.split(",").map((s) => s.trim()).filter(Boolean),
  );
  if (!allowed.has("*")) {
    const ip = clientIp(request);
    if (!allowed.has(ip)) {
      reply.status(403).send({ detail: "forbidden" });
    }
  }
}

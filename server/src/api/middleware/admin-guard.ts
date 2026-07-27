import type { FastifyRequest, FastifyReply } from "fastify";
import { config } from "../../shared/config.ts";
import { apiLogger } from "../../shared/logger.ts";

function clientIp(request: FastifyRequest): string {
  if (config.trustProxyHeaders) {
    const xff = request.headers["x-forwarded-for"];
    if (typeof xff === "string") return xff.split(",")[0]!.trim();
  }
  return request.ip;
}

// 管理员鉴权判定：token +（可选 ADMIN_REQUIRE_BOTH）IP 白名单；未配 token 时退化为纯 IP 白名单。
// 供 adminGuard 门禁与 news.ts l1_error 差异化返回共用，避免鉴权语义两处独立实现漂移（#A-R4-2）
export function isAdminAuthenticated(request: FastifyRequest): boolean {
  if (config.adminToken) {
    const token = (request.headers["x-admin-token"] as string) || "";
    if (token !== config.adminToken) return false;
    if (!config.adminRequireBoth) return true;
  }
  const allowed = new Set(
    config.adminAllowedIps.split(",").map((s) => s.trim()).filter(Boolean),
  );
  return allowed.has("*") || allowed.has(clientIp(request));
}

export async function adminGuard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const path = request.url;
  const method = request.method;

  // 判断是否需要管理员权限
  const isAlertsPath = path.startsWith("/v1/alerts") && !["GET", "HEAD"].includes(method);
  const isAdminPath = path.startsWith("/v1/admin") && !["GET", "HEAD"].includes(method); // v0.4: 非GET管理端点保护
  const isNonGetWrite =
    path.startsWith("/v1") && !["GET", "HEAD", "OPTIONS"].includes(method);
  const isAdminGetPath = config.adminProtectReads &&                  // v0.4: 可选 GET 鉴权
    (path.startsWith("/v1/admin") || path.startsWith("/v1/alerts")) && ["GET", "HEAD"].includes(method);

  if (!isAlertsPath && !isAdminPath && !isNonGetWrite && !isAdminGetPath) return;

  if (!isAdminAuthenticated(request)) {
    apiLogger.warn("Auth 403: %s %s (admin auth failed, ip=%s)", method, path, clientIp(request));
    return reply.status(403).send({ detail: "forbidden" });
  }
}

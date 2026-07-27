/**
 * #A-R4-2：isAdminAuthenticated 公共鉴权判定（纯函数测试，不依赖数据库）
 * adminGuard 门禁与 news.ts l1_error 差异化返回共用本函数，语义不得漂移
 * 依赖 .env.test 的 ADMIN_TOKEN=test-token（ADMIN_REQUIRE_BOTH 未设，默认 false）
 */
import { describe, it, expect } from "vitest";
import { isAdminAuthenticated } from "../api/middleware/admin-guard.ts";
import { config } from "../shared/config.ts";

// 伪造最小 FastifyRequest：headers + ip（白名单外的公网 IP）
const req = (headers: Record<string, string>, ip = "203.0.113.9") => ({ headers, ip }) as any;

describe("isAdminAuthenticated 管理员鉴权判定", () => {
  it("前置：测试环境已配置 ADMIN_TOKEN", () => {
    expect(config.adminToken).toBe("test-token");
    expect(config.adminRequireBoth).toBe(false);
  });

  it("正确 token 放行（REQUIRE_BOTH=false 时不看 IP）", () => {
    expect(isAdminAuthenticated(req({ "x-admin-token": "test-token" }))).toBe(true);
  });

  it("错误 token 拒绝", () => {
    expect(isAdminAuthenticated(req({ "x-admin-token": "wrong-token" }))).toBe(false);
  });

  it("缺失 token 拒绝（白名单外 IP）", () => {
    expect(isAdminAuthenticated(req({}))).toBe(false);
  });
});

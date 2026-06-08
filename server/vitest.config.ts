import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
    // ⚠️ 2026-06-08 事故：vitest 直连生产数据库 localhost:5432/news，
    // npm test 触发 cleanTestData() DELETE 全部 11 张表，清空所有生产数据。
    // 在配置独立测试数据库之前，禁止执行任何集成测试。
    // 如需恢复测试：1) 创建 .env.test → 独立 test DB
    // 2) drizzle-kit push 到 test DB 3) 把 include 改回默认值
    include: ["./__tests_disabled__/**"],
    passWithNoTests: true,
  },
});

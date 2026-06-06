import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    fileParallelism: false,  // 测试共享同一数据库，必须顺序执行
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});

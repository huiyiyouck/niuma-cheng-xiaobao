import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 加载 .env.test 覆盖 DATABASE_URL，防止测试直连生产库
function loadEnv(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    for (const line of readFileSync(path, "utf-8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  } catch {
    // .env.test 不存在时不报错（例如 CI 中用系统环境变量）
  }
  return env;
}

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
    env: loadEnv(resolve(__dirname, ".env.test")),
    // v0.6：恢复测试（.env.test + 独立 test DB 已就绪）
    include: ["./src/__tests__/**/*.test.ts"],
  },
});

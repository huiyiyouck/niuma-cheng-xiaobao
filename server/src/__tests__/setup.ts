/**
 * 测试环境设置
 * 在所有测试运行前设置环境变量和数据库连接
 */
import { beforeAll, afterAll } from "vitest";

// 设置测试环境变量（不覆盖已存在的值）
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://news:news@localhost:5432/news_test";
process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN || "test-token";
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "test-key";
process.env.PORT = process.env.PORT || "0"; // 随机端口

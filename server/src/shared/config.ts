import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// 简易 .env 解析，零依赖
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../../.env");
const env: Record<string, string> = {};

try {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    env[key] = val;
  }
} catch {
  // .env 文件不存在时使用系统环境变量
}

function get(key: string, fallback: string): string {
  return process.env[key] || env[key] || fallback;
}
function getBool(key: string, fallback: boolean): boolean {
  const v = process.env[key] || env[key];
  if (v === undefined) return fallback;
  return v === "true" || v === "1";
}
function getInt(key: string, fallback: number): number {
  const v = process.env[key] || env[key];
  if (v === undefined) return fallback;
  const n = parseInt(v, 10);
  return isNaN(n) ? fallback : n;
}
function getFloat(key: string, fallback: number): number {
  const v = process.env[key] || env[key];
  if (v === undefined) return fallback;
  const n = parseFloat(v);
  return isNaN(n) ? fallback : n;
}

export const config = {
  // 数据库
  databaseUrl: get("DATABASE_URL", "postgresql://news:news@localhost:5432/news"),
  dbSslVerify: getBool("DB_SSL_VERIFY", true),

  // 服务
  port: getInt("PORT", 8000),
  host: get("HOST", "0.0.0.0"),

  // 管理员
  adminAllowedIps: get("ADMIN_ALLOWED_IPS", "127.0.0.1"),
  adminToken: get("ADMIN_TOKEN", ""),
  adminRequireBoth: getBool("ADMIN_REQUIRE_BOTH", false),

  // CORS
  corsAllowOrigins: get("CORS_ALLOW_ORIGINS", "*"),
  trustProxyHeaders: getBool("TRUST_PROXY_HEADERS", false),

  // 代理
  httpProxy: get("HTTP_PROXY", "") || get("http_proxy", ""),
  httpsProxy: get("HTTPS_PROXY", "") || get("https_proxy", ""),
  xProxyUrl: get("X_PROXY_URL", ""),

  // X/Twitter
  xBearerToken: get("X_BEARER_TOKEN", ""),

  // LLM
  openaiBaseUrl: get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
  openaiApiKey: get("OPENAI_API_KEY", ""),
  openaiModel: get("OPENAI_MODEL", "gpt-4o-mini"),
  llmMaxRetries: getInt("LLM_MAX_RETRIES", 3),
  llmRetryBaseSeconds: getFloat("LLM_RETRY_BASE_SECONDS", 1.0),

  // Worker
  workerId: get("WORKER_ID", "worker-1"),
  schedulerScanSeconds: getInt("SCHEDULER_SCAN_SECONDS", 5),
  fetchConcurrency: getInt("FETCH_CONCURRENCY", 2),
  processConcurrency: getInt("PROCESS_CONCURRENCY", 1),

  // 默认策略
  defaultFetchEverySeconds: getInt("DEFAULT_FETCH_EVERY_SECONDS", 600),
  defaultMaxItemsPerRun: getInt("DEFAULT_MAX_ITEMS_PER_RUN", 20),
  defaultFailAlertThreshold: getInt("DEFAULT_FAIL_ALERT_THRESHOLD", 5),
  defaultZeroNewHours: getInt("DEFAULT_ZERO_NEW_HOURS", 24),

  // 任务回收
  taskStaleSeconds: getInt("TASK_STALE_SECONDS", 600),
} as const;

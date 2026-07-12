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
  // 显式设置的环境变量（含空字符串，如 systemd Environment=X_BEARER_TOKEN=）优先于 .env 文件，
  // 避免「想用空值显式禁用某能力」却被 .env 回退覆盖（测试环境用空 token 禁用 X Stream 即依赖此语义）
  if (key in process.env) return process.env[key] as string;
  return env[key] || fallback;
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
  adminProtectReads: getBool("ADMIN_PROTECT_READS", false),

  // CORS
  corsAllowOrigins: get("CORS_ALLOW_ORIGINS", "*"),
  trustProxyHeaders: getBool("TRUST_PROXY_HEADERS", false),

  // 金十 MCP
  jin10McpUrl: get("JIN10_MCP_URL", "https://mcp.jin10.com/mcp"),
  jin10McpToken: get("JIN10_MCP_TOKEN", ""),

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

  // v0.6 L0/L1 LLM（fallback 到 openaiModel 由 callLLM 处理）
  // v0.6 收口默认不放开 AI 处理：X/Twitter 等抓取内容先直显；后续 AI 中枢接管后再显式启用。
  // v0.6.1: ENABLE_AI_PROCESSING 废弃，由 AI_INTEGRATION_MODE 替代（兼容读取：true 等价于 database）
  aiProcessingEnabled: getBool("ENABLE_AI_PROCESSING", false) || get("AI_INTEGRATION_MODE", "http") === "database",
  // v0.6.1 AI 集成模式：database（数据库契约异步）/ http（HTTP 同步，灰度回退）
  aiIntegrationMode: get("AI_INTEGRATION_MODE", "http"),
  // v0.6.1 AI 卡死回收超时阈值（秒）
  aiStaleTimeoutMs: getInt("AI_STALE_TIMEOUT_MS", 600000),
  // v0.6.1 AI 最大重试次数
  aiMaxRetries: getInt("AI_MAX_RETRIES", 3),
  l0LlmModel: get("L0_LLM_MODEL", "gpt-4o-mini"),
  l1LlmModel: get("L1_LLM_MODEL", "gpt-4o-mini"),
  llmL0MaxRetries: getInt("LLM_L0_MAX_RETRIES", 3),
  llmL1MaxRetries: getInt("LLM_L1_MAX_RETRIES", 3),
  llmTimeoutMs: getInt("LLM_TIMEOUT_MS", 60000),

  // AI Hub（独立 niuma-cheng-ai 服务）
  aiHubBaseUrl: get("AI_HUB_BASE_URL", "http://127.0.0.1:8100"),
  aiHubApiToken: get("AI_HUB_API_TOKEN", ""),
  aiHubTimeoutMs: getInt("AI_HUB_TIMEOUT_MS", 180000),

  // v0.6 L1 处理引擎：builtin（内建 LLM 完整链路，经设计阶段 Review）| agent（OpenClaw news-l1 嵌入，生产侧未验证，仅显式 opt-in）| ai（独立 AI Hub）
  // 默认 builtin：OpenClaw 嵌入路径生产未验证（Gateway scope pending / 成本未控），方向上已定为废弃
  // （见 ad-hoc 2026-06-16-spike-langgraph-agent-hub-proposal.md §12 D1），不作默认引擎；agent 模式下内建 LLM 仅回退做翻译保底
  l1Engine: get("L1_ENGINE", "builtin"),
  openclawBin: get("OPENCLAW_BIN", "openclaw"),
  openclawAgentId: get("OPENCLAW_AGENT_ID", "news-l1"),
  openclawTimeoutMs: getInt("OPENCLAW_TIMEOUT_MS", 200000),
  webSearchMaxResults: getInt("WEB_SEARCH_MAX_RESULTS", 5),

  // Worker
  workerId: get("WORKER_ID", "worker-1"),
  schedulerScanSeconds: getInt("SCHEDULER_SCAN_SECONDS", 5),
  fetchConcurrency: getInt("FETCH_CONCURRENCY", 2),
  processConcurrency: getInt("PROCESS_CONCURRENCY", 1),
  l1Concurrency: getInt("L1_CONCURRENCY", 3),

  // 默认策略
  defaultFetchEverySeconds: getInt("DEFAULT_FETCH_EVERY_SECONDS", 600),
  defaultMaxItemsPerRun: getInt("DEFAULT_MAX_ITEMS_PER_RUN", 20),
  defaultFailAlertThreshold: getInt("DEFAULT_FAIL_ALERT_THRESHOLD", 5),
  defaultZeroNewHours: getInt("DEFAULT_ZERO_NEW_HOURS", 24),

  // 任务回收
  taskStaleSeconds: getInt("TASK_STALE_SECONDS", 600),
} as const;

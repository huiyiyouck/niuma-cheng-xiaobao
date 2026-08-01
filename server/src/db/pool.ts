import pg from "pg";
import { config } from "../shared/config.ts";

// 将 SQLAlchemy asyncpg URL 转为 pg 可用的 DSN
function toPgDsn(url: string): string {
  // postgresql+asyncpg://user:pass@host:port/db → postgresql://user:pass@host:port/db
  return url.replace(/^postgresql\+asyncpg:\/\//, "postgresql://");
}

function buildSslConfig(): pg.PoolConfig["ssl"] {
  if (config.dbSslVerify) return undefined; // 默认验证
  return { rejectUnauthorized: false };
}

const pool = new pg.Pool({
  connectionString: toPgDsn(config.databaseUrl),
  ssl: buildSslConfig(),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: config.dbConnectTimeoutMs,
  // 会话级超时随连接下发（直连场景可用；若将来引入 PgBouncer 需改为 on('connect') SET 方式）
  options:
    `-c statement_timeout=${config.dbStatementTimeoutMs}` +
    ` -c idle_in_transaction_session_timeout=${config.dbIdleTxTimeoutMs}` +
    ` -c lock_timeout=${config.dbLockTimeoutMs}`,
});

pool.on("error", (err) => {
  console.error("PG Pool unexpected error:", err.message);
});

export { pool };

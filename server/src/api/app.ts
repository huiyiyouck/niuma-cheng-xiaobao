import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";
import { config } from "../shared/config.ts";
import { adminGuard } from "./middleware/admin-guard.ts";
import { httpLogger } from "./middleware/http-logger.ts";
import { channelSpacesRoutes } from "./routes/channel-spaces.ts";
import { sourcesRoutes } from "./routes/sources.ts";
import { bindingsRoutes } from "./routes/bindings.ts";
import { subChannelsRoutes } from "./routes/sub-channels.ts";
import { newsRoutes } from "./routes/news.ts";
import { statsRoutes } from "./routes/stats.ts";
import { adminLogsRoutes } from "./routes/admin-logs.ts";
import { alertsRoutes } from "./routes/alerts.ts";

export async function buildApp() {
  const app = Fastify({ logger: false });

  // CORS
  const origins = config.corsAllowOrigins === "*"
    ? ["*"]
    : config.corsAllowOrigins.split(",").map((s) => s.trim()).filter(Boolean);
  await app.register(cors, {
    origin: origins,
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-token"],
  });

  // 全局错误处理
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        detail: "validation error",
        errors: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
    }
    // pg 驱动类型转换错误（如无效 UUID）→ 400
    if ((error as any).code === "22P02") {
      return reply.status(400).send({ detail: "invalid input format" });
    }
    const err = error as any;
    return reply.status(err.statusCode || 500).send({
      detail: err.message || "internal server error",
    });
  });

  // 管理员鉴权
  app.addHook("onRequest", adminGuard);
  // HTTP 请求日志
  app.addHook("onResponse", httpLogger);

  // 注册路由（前缀 /v1）
  await app.register(async (scope) => {
    await channelSpacesRoutes(scope);
    await sourcesRoutes(scope);
    await bindingsRoutes(scope);
    await subChannelsRoutes(scope);
    await newsRoutes(scope);
    await statsRoutes(scope);
    await adminLogsRoutes(scope);
    await alertsRoutes(scope);
  }, { prefix: "/v1" });

  // 根页面
  app.get("/", async (_req, reply) => {
    reply.type("text/html").send(INDEX_HTML);
  });

  // 健康检查
  app.get("/health", async (_req, reply) => {
    reply.send({ status: "ok" });
  });

  return app;
}

const INDEX_HTML = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>News Aggregator Backend</title>
    <style>
      :root { --bg:#fff; --text:#0f172a; --muted:#64748b; --border:#e2e8f0; --card:#fff; --shadow: 0 10px 30px rgba(2, 6, 23, 0.08); --primary:#2563eb; }
      * { box-sizing: border-box; }
      body { margin:0; font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; background: var(--bg); color: var(--text); }
      .wrap { max-width: 980px; margin: 0 auto; padding: 28px 16px 60px; }
      .card { border: 1px solid var(--border); border-radius: 16px; background: var(--card); box-shadow: var(--shadow); padding: 16px; }
      a { color: var(--primary); text-decoration: none; font-weight: 700; }
      a:hover { text-decoration: underline; }
      .muted { color: var(--muted); font-size: 13px; line-height: 1.6; }
      .row { display:flex; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
      .pill { display:inline-flex; gap:8px; align-items:center; border: 1px solid var(--border); border-radius: 999px; padding: 8px 10px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div style="font-weight:900; font-size:18px;">News Aggregator Backend (Node.js)</div>
        <div class="muted">REST API (/v1) — 前端独立部署，通过反向代理或 CORS 对接。</div>
        <div class="row">
          <span class="pill"><a href="/v1/channel-spaces" target="_blank">API /v1/channel-spaces</a></span>
          <span class="pill"><span class="muted">Health:</span> <a href="/health">/health</a></span>
        </div>
      </div>
    </div>
  </body>
</html>`;

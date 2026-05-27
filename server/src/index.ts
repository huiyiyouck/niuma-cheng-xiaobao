import { buildApp } from "./api/app.ts";
import { startWorker } from "./worker/index.ts";
import { config } from "./shared/config.ts";
import { apiLogger } from "./shared/logger.ts";

const log = apiLogger;

async function main() {
  // 启动 API
  const app = await buildApp();

  // 静态文件服务（前端 dist）
  const fastifyStatic = await import("@fastify/static").catch(() => null);
  if (fastifyStatic) {
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const distPath = resolve(__dirname, "../../frontend/dist");
    await app.register(fastifyStatic.default, {
      root: distPath,
      prefix: "/assets/",
      decorateReply: false,
    });
    // SPA fallback
    app.setNotFoundHandler(async (req, reply) => {
      if (req.url.startsWith("/v1/") || req.url.startsWith("/health")) {
        return reply.status(404).send({ detail: "not found" });
      }
      const { readFile } = await import("node:fs/promises");
      try {
        const html = await readFile(resolve(distPath, "index.html"), "utf-8");
        reply.type("text/html").send(html);
      } catch {
        reply.status(404).send({ detail: "frontend not built" });
      }
    });
  }

  // 启动 Worker（通过 AbortSignal 控制生命周期）
  const stopSignal = new AbortController().signal;

  // 优雅关闭
  const shutdown = async () => {
    log.info("Shutting down...");
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // 启动 Worker 循环（后台运行）
  startWorker(stopSignal);

  // 启动 HTTP 服务
  try {
    await app.listen({ port: config.port, host: config.host });
    log.info("API server listening on %s:%d", config.host, config.port);
  } catch (err: any) {
    log.error("Failed to start server: %s", err.message);
    process.exit(1);
  }
}

main();

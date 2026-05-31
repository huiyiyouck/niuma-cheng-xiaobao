import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = resolve(__dirname, "../../../../logs");

// v0.4: 动态解析日志文件（支持 winston-daily-rotate-file 轮转后的日期后缀文件）
function getLogFiles(): { name: string; path: string }[] {
  const files: { name: string; path: string }[] = [];
  if (!existsSync(LOG_DIR)) return files;
  const entries = readdirSync(LOG_DIR).filter((f) => f.endsWith(".log"));
  for (const f of entries) {
    const match = f.match(/^(api|worker)(?:-(\d{4}-\d{2}-\d{2}))?\.log$/);
    if (match) {
      const [, source, date] = match;
      const label = date ? `${source} (${date})` : `${source} (今天)`;
      files.push({ name: label, path: join(LOG_DIR, f) });
    }
  }
  return files.sort((a, b) => b.path.localeCompare(a.path)); // 最新在前
}

function readLogLines(opts: {
  source?: string;
  level?: string;
  keyword?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
}): { entries: any[]; total: number } {
  const logFiles = getLogFiles();
  const filesToRead: string[] = [];
  if (opts.source) {
    const sources = new Set(opts.source.split(",").map((s) => s.trim()).filter(Boolean));
    for (const lf of logFiles) {
      // 提取 source 名（不含日期部分）
      const sourceName = lf.name.startsWith("api") ? "api" : "worker";
      if (sources.has(sourceName)) filesToRead.push(lf.path);
    }
  } else {
    filesToRead.push(...logFiles.map((f) => f.path));
  }

  let allLines: any[] = [];
  for (const fp of filesToRead) {
    // 也在没有日期后缀时尝试
    if (!existsSync(fp)) continue;
    const content = readFileSync(fp, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        allLines.push(JSON.parse(trimmed));
      } catch {
        // 跳过非 JSON 行
      }
    }
  }

  if (opts.from) allLines = allLines.filter((e) => (e.timestamp || "") >= opts.from!);
  if (opts.to) allLines = allLines.filter((e) => (e.timestamp || "") <= opts.to!);
  if (opts.level) {
    const levels = new Set(opts.level.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean));
    allLines = allLines.filter((e) => levels.has((e.level || "").toUpperCase()));
  }
  if (opts.keyword) {
    const kw = opts.keyword.toLowerCase();
    allLines = allLines.filter((e) => (e.message || "").toLowerCase().includes(kw));
  }

  allLines.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
  const total = allLines.length;
  const entries = allLines.slice(opts.offset, opts.offset + opts.limit);
  return { entries, total };
}

export async function adminLogsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/admin/logs", async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as Record<string, string>;
    const { entries, total } = readLogLines({
      source: query.source,
      level: query.level,
      keyword: query.keyword,
      from: query.from,
      to: query.to,
      limit: Math.min(Math.max(parseInt(query.limit || "100"), 1), 1000),
      offset: Math.max(parseInt(query.offset || "0"), 0),
    });
    return reply.send({
      entries,
      total,
      has_more: (parseInt(query.offset || "0") + parseInt(query.limit || "100")) < total,
    });
  });

  app.get("/admin/logs/config", async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      levels: ["DEBUG", "INFO", "WARNING", "ERROR"],
      sources: ["api", "worker"],
      log_files: Object.fromEntries(getLogFiles().map((f) => [f.name, f.path])),
    });
  });
}

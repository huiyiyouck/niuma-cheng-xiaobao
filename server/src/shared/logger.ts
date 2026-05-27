import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = resolve(__dirname, "../../../logs");

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: () => new Date().toISOString() }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, ...rest }) => {
    const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
    return `${timestamp} [${level.toUpperCase().padEnd(5)}] ${message}${extra}`;
  }),
);

function createLogger(name: string, filename: string): winston.Logger {
  return winston.createLogger({
    level: "debug",
    transports: [
      new DailyRotateFile({
        filename: `${LOG_DIR}/${filename}-%DATE%.log`,
        datePattern: "YYYY-MM-DD",
        maxFiles: "7d",
        format: jsonFormat,
        level: "debug",
      }),
      new winston.transports.Console({
        format: consoleFormat,
        level: "info",
      }),
    ],
  });
}

const apiLogger = createLogger("api", "api");
const workerLogger = createLogger("worker", "worker");

export function getLogger(name: string = "api"): winston.Logger {
  return name === "worker" ? workerLogger : apiLogger;
}

export { apiLogger, workerLogger };

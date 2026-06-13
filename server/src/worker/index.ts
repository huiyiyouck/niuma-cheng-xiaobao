import os from "node:os";
import { pool as dbPool } from "../db/pool.ts";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";
import { schedulerTick } from "./scheduler.ts";
import { workerLoop } from "./dispatcher.ts";
import { zeroNewMonitorTick } from "./monitor.ts";
import { reclaimStaleTick } from "./reclaim.ts";
import { xStreamManager } from "./x-stream-manager.ts";
import { xRuleSyncer } from "./x-rule-sync.ts";
import { EnvHttpProxyAgent, ProxyAgent, setGlobalDispatcher } from "undici";
import "./fetchers/index.ts";

const log = workerLogger;

// 全局代理：所有 fetch 调用（包括 RSS fetcher）都走代理
const proxyUrl = config.xProxyUrl || config.httpsProxy;
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  log.info("Worker 全局代理: %s", proxyUrl);
} else {
  setGlobalDispatcher(new EnvHttpProxyAgent());
  log.info("Worker 使用环境变量代理（https_proxy）");
}

// 简易信号量
class Semaphore {
  private permits: number;
  private readonly maxPermits: number;
  constructor(max: number) {
    this.permits = max;
    this.maxPermits = max;
  }
  async acquire(): Promise<boolean> {
    if (this.permits > 0) {
      this.permits--;
      return true;
    }
    return false;
  }
  release(): void {
    if (this.permits < this.maxPermits) this.permits++;
  }
}

async function schedulerLoop(stopSignal: AbortSignal): Promise<void> {
  while (!stopSignal.aborted) {
    try {
      const client = await dbPool.connect();
      try {
        await schedulerTick(client);
      } finally {
        client.release();
      }
    } catch (err: any) {
      log.error("SCHEDULER ERROR: %s", err.message);
    }
    await sleep(config.schedulerScanSeconds * 1000, stopSignal);
  }
}

async function workerLoopRunner(stopSignal: AbortSignal): Promise<void> {
  const fetchSem = new Semaphore(config.fetchConcurrency);
  const processSem = new Semaphore(config.processConcurrency);
  const l1Sem = new Semaphore(config.l1Concurrency);
  const totalWorkers = config.fetchConcurrency + config.processConcurrency + config.l1Concurrency;

  // 启动多个并发 worker
  const workers = Array.from({ length: totalWorkers }, async () => {
    while (!stopSignal.aborted) {
      try {
        await workerLoop(dbPool, config.workerId, fetchSem, processSem, l1Sem);
      } catch (err: any) {
        log.error("WORKER LOOP ERROR: %s", err.message);
      }
      await sleep(50, stopSignal);
    }
  });

  await Promise.all(workers);
}

async function monitorLoop(stopSignal: AbortSignal): Promise<void> {
  while (!stopSignal.aborted) {
    try {
      const client = await dbPool.connect();
      try {
        await zeroNewMonitorTick(client);
      } finally {
        client.release();
      }
    } catch (err: any) {
      log.error("MONITOR ERROR: %s", err.message);
    }
    await sleep(3600 * 1000, stopSignal);
  }
}

async function reclaimLoop(stopSignal: AbortSignal): Promise<void> {
  while (!stopSignal.aborted) {
    try {
      const client = await dbPool.connect();
      try {
        await reclaimStaleTick(client);
      } finally {
        client.release();
      }
    } catch (err: any) {
      log.error("RECLAIM ERROR: %s", err.message);
    }
    await sleep(30 * 1000, stopSignal);
  }
}

function sleep(ms: number, stopSignal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    stopSignal.addEventListener("abort", () => clearTimeout(t), { once: true });
  });
}

export function startWorker(stopSignal: AbortSignal): void {
  const hostname = os.hostname();
  const workerId = `${hostname}-${process.pid}`;
  log.info("WORKER START worker_id=%s pid=%d", workerId, process.pid);

  // 启动 X Stream Manager（X_BEARER_TOKEN 缺失时自动跳过）
  xStreamManager.start().catch((err) => {
    log.error("X Stream Manager failed to start: %s", err.stack || err.message);
  });

  // 启动 X Rule Syncer（拉模式，X Portal 为唯一真理源）
  xRuleSyncer.start();

  // 注册关闭回调
  stopSignal.addEventListener("abort", () => {
    xStreamManager.stop();
    xRuleSyncer.stop();
  }, { once: true });

  // 启动各循环
  Promise.all([
    schedulerLoop(stopSignal),
    workerLoopRunner(stopSignal),
    monitorLoop(stopSignal),
    reclaimLoop(stopSignal),
  ]).catch((err) => {
    log.error("Worker crashed: %s", err.stack || err.message);
  });
}

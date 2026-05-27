import os from "node:os";
import { pool as dbPool } from "../db/pool.ts";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";
import { schedulerTick } from "./scheduler.ts";
import { workerLoop } from "./dispatcher.ts";
import { zeroNewMonitorTick } from "./monitor.ts";
import { reclaimStaleTick } from "./reclaim.ts";
import "./fetchers/index.ts";

const log = workerLogger;

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

  while (!stopSignal.aborted) {
    try {
      await workerLoop(dbPool, config.workerId, fetchSem, processSem);
    } catch (err: any) {
      log.error("WORKER LOOP ERROR: %s", err.message);
    }
    // 无任务时短暂休眠
    await sleep(50, stopSignal);
  }
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

  Promise.all([
    schedulerLoop(stopSignal),
    workerLoopRunner(stopSignal),
    monitorLoop(stopSignal),
    reclaimLoop(stopSignal),
  ]).catch((err) => {
    log.error("Worker crashed: %s", err.stack || err.message);
  });
}

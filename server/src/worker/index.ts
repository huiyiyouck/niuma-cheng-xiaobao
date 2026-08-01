import os from "node:os";
import { pool as dbPool } from "../db/pool.ts";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";
import { schedulerTick } from "./scheduler.ts";
import { workerLoop } from "./dispatcher.ts";
import { zeroNewMonitorTick } from "./monitor.ts";
import { reclaimStaleTick } from "./reclaim.ts";
import { backfillScoreTotalTick } from "./l1-processor.ts";
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
        // 遗留 #5（契约 v1.9）：与 reclaim 同节奏补算 ai 写回后缺失的 score_total
        await backfillScoreTotalTick(client);
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
    // 关键：正常超时结束后必须 removeEventListener，否则每次 sleep 都会在
    // 长期存活的 stopSignal 上永久累积 abort 监听器（once:true 仅在 abort 触发后才清，
    // 而服务运行期 abort 永不触发）→ 监听器数百万级泄漏，addEventListener 退化 O(n)，
    // 表现为主线程 100% CPU + 内存线性增长 + 页面越来越慢。
    const onAbort = () => { clearTimeout(t); resolve(); };
    const t = setTimeout(() => {
      stopSignal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    stopSignal.addEventListener("abort", onAbort, { once: true });
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

  // 心跳：每 60s 输出系统状态
  const heartbeat = async () => {
    while (!stopSignal.aborted) {
      await sleep(60_000, stopSignal);
      if (!stopSignal.aborted) {
        log.info("HEARTBEAT pid=%d uptime=%ds", process.pid, Math.floor(process.uptime()));
      }
    }
  };

  // 启动各循环 + 心跳
  Promise.all([
    schedulerLoop(stopSignal),
    workerLoopRunner(stopSignal),
    monitorLoop(stopSignal),
    reclaimLoop(stopSignal),
    heartbeat(),
  ]).catch((err) => {
    log.error("Worker crashed: %s", err.stack || err.message);
  });
}

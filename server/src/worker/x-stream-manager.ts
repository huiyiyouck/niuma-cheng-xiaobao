import { pool } from "../db/pool.ts";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";

const log = workerLogger;

/**
 * X Filtered Stream 长连接管理器（v0.5.1 反向同步版）
 *
 * 职责：
 * - 只负责建立 Filtered Stream 长连接、接收推文、落 raw_items + enqueue process task
 * - 规则同步交给 XRuleSyncer（拉模式，X Portal 为唯一真理源）
 * - 断线重连：指数退避（1s→2s→4s...max 60s）
 *
 * 注意：handleTweet 不再过滤 lifecycle_status='normal'，paused 也保留入库（前端隐藏即可）。
 */
export class XStreamManager {
  private abortController: AbortController | null = null;
  private reconnectDelay = 1000;
  private readonly maxReconnectDelay = 60000;
  private running = false;
  private consecutiveDisconnects = 0;

  /**
   * 处理推文：创建 raw_item → enqueue process task
   * v0.5.1: 不再按 lifecycle_status 过滤，只要本地存在对应 source 就入库（paused 状态历史完整）
   */
  private async handleTweet(tweet: any, includes?: any): Promise<void> {
    try {
      const users = includes?.users || [];
      const username = tweet.author_id
        ? users.find((u: any) => u.id === tweet.author_id)?.username || ""
        : "";
      const tweetId = tweet.id;
      if (!tweetId) return;

      const { rows: [source] } = await pool.query(
        `SELECT id FROM sources WHERE type = 'x_twitter' AND LOWER(identity) = LOWER($1)`,
        [username],
      );
      if (!source) return;

      const publishedAt = tweet.created_at
        ? new Date(tweet.created_at.replace("Z", "+00:00")).toISOString()
        : undefined;

      const authorName = tweet.author_id
        ? users.find((u: any) => u.id === tweet.author_id)?.name || ""
        : "";

      const content = {
        tweet_id: tweetId,
        text: tweet.text || "",
        author_username: username,
        author_name: authorName,
        created_at: tweet.created_at,
        public_metrics: tweet.public_metrics || {},
        entities: tweet.entities || {},
        referenced_tweets: tweet.referenced_tweets || [],
      };

      const { rows: [inserted] } = await pool.query(
        `INSERT INTO raw_items(source_id, source_item_id, source_item_url, published_at, content, fetched_at)
         VALUES($1, $2, $3, $4, $5::jsonb, now())
         ON CONFLICT (source_id, source_item_id) DO NOTHING
         RETURNING id`,
        [
          source.id,
          tweetId,
          username ? `https://x.com/${username}/status/${tweetId}` : null,
          publishedAt || null,
          JSON.stringify(content),
        ],
      );

      if (inserted) {
        await pool.query(
          `INSERT INTO tasks(type, source_id, raw_item_id, status, priority, run_after, created_at, updated_at)
           VALUES('process', $1, $2, 'queued', 0, now(), now(), now())`,
          [source.id, inserted.id],
        );
        log.debug("X STREAM tweet ingested source=%s tweet_id=%s", source.id, tweetId);
      }
    } catch (err: any) {
      log.error("X STREAM handle tweet error: %s", err.message);
    }
  }

  private async connectStream(signal: AbortSignal): Promise<void> {
    const url = "https://api.twitter.com/2/tweets/search/stream?tweet.fields=created_at,public_metrics,author_id,text,entities,referenced_tweets&user.fields=name,username&expansions=author_id";

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${config.xBearerToken}` },
      signal,
    });

    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 403) {
        throw new Error(`X Stream auth failed: HTTP ${resp.status} — 检查 X_BEARER_TOKEN`);
      }
      throw new Error(`X Stream connection failed: HTTP ${resp.status}`);
    }

    log.info("X STREAM connected");

    const reader = resp.body?.getReader();
    if (!reader) throw new Error("No readable stream body");

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (!signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const data = JSON.parse(trimmed);
            if (data.data) {
              this.handleTweet(data.data, data.includes);
            }
          } catch {
            // 跳过非 JSON 行（如 keep-alive 空行）
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        log.info("X STREAM connection aborted");
        return;
      }
      throw err;
    }
  }

  async start(): Promise<void> {
    if (!config.xBearerToken) {
      log.info("X STREAM disabled: X_BEARER_TOKEN not configured");
      return;
    }

    this.running = true;
    log.info("X STREAM starting (规则同步由 XRuleSyncer 负责)");
    this.connectLoop();
  }

  private async connectLoop(): Promise<void> {
    while (this.running) {
      this.abortController = new AbortController();
      try {
        await this.connectStream(this.abortController.signal);
        this.reconnectDelay = 1000;
        this.consecutiveDisconnects = 0;
      } catch (err: any) {
        this.consecutiveDisconnects++;
        log.error("X STREAM disconnected (consecutive=%d): %s", this.consecutiveDisconnects, err.message);

        if (this.consecutiveDisconnects >= 3) {
          try {
            const client = await pool.connect();
            try {
              const { createAlert } = await import("./monitor.ts");
              await createAlert(
                client,
                null,
                null,
                "x_stream_disconnected",
                `X Stream 连续断开 ${this.consecutiveDisconnects} 次: ${err.message}`,
                { consecutive_disconnects: this.consecutiveDisconnects },
                "x_stream",
                "warning",
                "x_stream:disconnected",
              );
            } finally {
              client.release();
            }
          } catch (alertErr: any) {
            log.error("Failed to create x_stream alert: %s", alertErr.message);
          }
        }
      }

      if (!this.running) break;

      log.info("X STREAM reconnecting in %dms...", this.reconnectDelay);
      await this.sleep(this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
    }
  }

  stop(): void {
    this.running = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    log.info("X STREAM stopped");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const xStreamManager = new XStreamManager();

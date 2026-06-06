import { pool } from "../db/pool.ts";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";

const log = workerLogger;

interface StreamEvent {
  data: any;
}

/**
 * X Filtered Stream 长连接管理器
 *
 * 生命周期：
 * 1. start(): 构建规则 → 建立长连接
 * 2. 规则同步（30s debounced）：Source 变更 → 批量同步规则
 * 3. 推文接收：Stream 推送 → raw_items → enqueue tasks
 * 4. 断线重连：指数退避（1s→2s→4s...max 60s）
 * 5. stop(): 断开连接
 */
export class XStreamManager {
  private abortController: AbortController | null = null;
  private reconnectDelay = 1000; // 初始 1s
  private readonly maxReconnectDelay = 60000; // 最大 60s
  private ruleSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private ruleSyncPending = false;
  private running = false;
  private consecutiveDisconnects = 0;

  /**
   * 查询所有需要监听的 X Source（lifecycle_status='normal' + 有启用 display_position）
   */
  private async getActiveXSources(): Promise<Array<{ source_id: string; username: string }>> {
    const { rows } = await pool.query(
      `SELECT s.id AS source_id, s.identity AS username
       FROM sources s
       WHERE s.type = 'x_twitter'
         AND s.lifecycle_status = 'normal'
         AND EXISTS(
           SELECT 1 FROM display_positions dp
           WHERE dp.source_id = s.id AND dp.enabled = true AND dp.deleted_at IS NULL
         )`,
    );
    return rows.map((r: any) => ({ source_id: r.source_id, username: r.username }));
  }

  /**
   * 构建 Filtered Stream 规则：from:{username} -is:retweet -is:reply
   */
  private buildRule(username: string): { value: string; tag: string } {
    return {
      value: `from:${username} -is:retweet -is:reply`,
      tag: `source:${username}`,
    };
  }

  /**
   * 获取当前规则列表
   */
  private async getRules(): Promise<Array<{ id: string; value: string; tag: string }>> {
    const resp = await fetch("https://api.twitter.com/2/tweets/search/stream/rules", {
      headers: { Authorization: `Bearer ${config.xBearerToken}` },
    });
    if (!resp.ok) {
      throw new Error(`获取 Stream 规则失败: HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return data.data || [];
  }

  /**
   * 批量设置规则（先删后加）
   */
  private async setRules(rules: Array<{ value: string; tag: string }>): Promise<void> {
    // 获取旧规则并删除
    const oldRules = await this.getRules();
    if (oldRules.length > 0) {
      const deleteBody = {
        delete: { ids: oldRules.map((r) => r.id) },
      };
      const delResp = await fetch("https://api.twitter.com/2/tweets/search/stream/rules", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.xBearerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deleteBody),
      });
      if (!delResp.ok) {
        throw new Error(`删除 Stream 规则失败: HTTP ${delResp.status}`);
      }
    }

    // 添加新规则
    if (rules.length > 0) {
      const addBody = { add: rules };
      const addResp = await fetch("https://api.twitter.com/2/tweets/search/stream/rules", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.xBearerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(addBody),
      });
      if (!addResp.ok) {
        const errText = await addResp.text();
        throw new Error(`添加 Stream 规则失败: HTTP ${addResp.status} ${errText}`);
      }
    }

    log.info("X STREAM rules synced: %d active rules", rules.length);
  }

  /**
   * 同步规则到 X API（debounced 30s）
   */
  private scheduleRuleSync(): void {
    if (this.ruleSyncTimer) {
      clearTimeout(this.ruleSyncTimer);
    }
    this.ruleSyncTimer = setTimeout(async () => {
      if (!this.running) return;
      try {
        const sources = await this.getActiveXSources();
        const rules = sources.map((s) => this.buildRule(s.username));
        await this.setRules(rules);
        this.ruleSyncPending = false;
      } catch (err: any) {
        log.error("X STREAM rule sync failed: %s", err.message);
        this.ruleSyncPending = true;
      }
    }, 30000);
  }

  /**
   * 处理推文：创建 raw_item → enqueue process task
   */
  private async handleTweet(tweet: any, includes?: any): Promise<void> {
    try {
      const users = includes?.users || [];
      const username = tweet.author_id
        ? users.find((u: any) => u.id === tweet.author_id)?.username || ""
        : "";
      const tweetId = tweet.id;
      if (!tweetId) return;

      // 查找对应的 Source
      const { rows: [source] } = await pool.query(
        `SELECT id FROM sources WHERE type = 'x_twitter' AND LOWER(identity) = LOWER($1) AND lifecycle_status = 'normal'`,
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

      // 创建 raw_item（利用 UNIQUE(source_id, source_item_id) 去重）
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
        // 创建 process task
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

  /**
   * 建立 Filtered Stream 长连接
   */
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
            // Filtered Stream 返回的 JSON 包含 data（推文）和 includes（用户等）
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

  /**
   * 启动 X Stream Manager
   */
  async start(): Promise<void> {
    if (!config.xBearerToken) {
      log.info("X STREAM disabled: X_BEARER_TOKEN not configured");
      return;
    }

    this.running = true;
    log.info("X STREAM starting");

    // 初始规则同步
    try {
      const sources = await this.getActiveXSources();
      const rules = sources.map((s) => this.buildRule(s.username));
      await this.setRules(rules);
    } catch (err: any) {
      log.error("X STREAM initial rule sync failed: %s", err.message);
    }

    // 启动连接循环
    this.connectLoop();
  }

  /**
   * 连接循环：指数退避重连
   */
  private async connectLoop(): Promise<void> {
    while (this.running) {
      this.abortController = new AbortController();
      try {
        await this.connectStream(this.abortController.signal);
        // 正常断开（可能是连接关闭）
        this.reconnectDelay = 1000; // 重置退避
        this.consecutiveDisconnects = 0;
      } catch (err: any) {
        this.consecutiveDisconnects++;
        log.error("X STREAM disconnected (consecutive=%d): %s", this.consecutiveDisconnects, err.message);

        // 连续断开触发全局告警
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

      // 指数退避
      log.info("X STREAM reconnecting in %dms...", this.reconnectDelay);
      await this.sleep(this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);

      // 重连后全量同步规则
      try {
        const sources = await this.getActiveXSources();
        const rules = sources.map((s) => this.buildRule(s.username));
        await this.setRules(rules);
        this.consecutiveDisconnects = 0;
      } catch (err: any) {
        log.error("X STREAM reconnect rule sync failed: %s", err.message);
      }
    }
  }

  /**
   * 停止 X Stream Manager
   */
  stop(): void {
    this.running = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.ruleSyncTimer) {
      clearTimeout(this.ruleSyncTimer);
      this.ruleSyncTimer = null;
    }
    log.info("X STREAM stopped");
  }

  /**
   * 触发规则同步（外部调用，如 Source 新增/删除时）
   */
  triggerRuleSync(): void {
    if (!this.running) return;
    this.scheduleRuleSync();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 单例
export const xStreamManager = new XStreamManager();

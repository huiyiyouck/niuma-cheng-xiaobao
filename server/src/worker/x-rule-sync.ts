import { pool } from "../db/pool.ts";
import { config } from "../shared/config.ts";
import { workerLogger } from "../shared/logger.ts";

const log = workerLogger;

interface XRule {
  id: string;
  value: string;
  tag?: string;
}

interface SyncResult {
  added: number;
  updated: number;
  removed: number;
  restored: number;
}

/**
 * X Filtered Stream 规则反向同步器
 *
 * X Developer Portal 为唯一真理源：
 * - remote 有 / local 无 → 创建 source（source_origin='x_synced'）
 * - remote 有 / local 有 → 更新 display_name（rule.tag 覆盖）
 * - remote 无 / local 有 → 软删除（lifecycle_status='removed'）
 * - remote 有 / local 有(removed) → 恢复（lifecycle_status='normal'）
 *
 * 触发：worker 启动一次 + 每 5min 定时 + 管理页手动按钮
 */
export class XRuleSyncer {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs = 5 * 60 * 1000;

  private async fetchRemoteRules(): Promise<XRule[]> {
    const resp = await fetch("https://api.twitter.com/2/tweets/search/stream/rules", {
      headers: { Authorization: `Bearer ${config.xBearerToken}` },
    });
    if (!resp.ok) {
      throw new Error(`获取 X Stream 规则失败: HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return data.data || [];
  }

  private parseUsername(value: string): string | null {
    const m = value.match(/from:(\w+)/i);
    return m ? m[1].toLowerCase() : null;
  }

  async syncOnce(): Promise<SyncResult> {
    if (!config.xBearerToken) {
      log.info("X RULE SYNC skipped: X_BEARER_TOKEN not configured");
      return { added: 0, updated: 0, removed: 0, restored: 0 };
    }

    const remoteRules = await this.fetchRemoteRules();

    const { rows: localSources } = await pool.query<{
      id: string;
      identity: string;
      display_name: string;
      x_rule_id: string | null;
      lifecycle_status: string;
    }>(
      `SELECT id, identity, display_name, x_rule_id, lifecycle_status
       FROM sources WHERE type = 'x_twitter'`,
    );

    const remoteById = new Map(remoteRules.map((r) => [r.id, r]));
    const localByRuleId = new Map(
      localSources.filter((s) => s.x_rule_id).map((s) => [s.x_rule_id as string, s]),
    );
    const localByUsername = new Map(
      localSources
        .filter((s) => !s.x_rule_id)
        .map((s) => [s.identity.toLowerCase(), s]),
    );

    let added = 0, updated = 0, removed = 0, restored = 0;

    for (const rule of remoteRules) {
      const username = this.parseUsername(rule.value);
      if (!username) {
        log.warn("X RULE SYNC skip non-from rule id=%s value=%s", rule.id, rule.value);
        continue;
      }
      const tag = rule.tag || username;

      const existing = localByRuleId.get(rule.id) || localByUsername.get(username);

      if (!existing) {
        await pool.query(
          `INSERT INTO sources (type, identity, display_name, source_origin, x_rule_id, lifecycle_status, paused)
           VALUES ('x_twitter', $1, $2, 'x_synced', $3, 'normal', false)`,
          [username, tag, rule.id],
        );
        added++;
        log.info("X RULE SYNC + source username=%s tag=%s rule_id=%s", username, tag, rule.id);
      } else {
        const wasRemoved = existing.lifecycle_status === "removed";
        await pool.query(
          `UPDATE sources
              SET display_name = $1,
                  x_rule_id = $2,
                  source_origin = 'x_synced',
                  lifecycle_status = CASE WHEN lifecycle_status = 'removed' THEN 'normal' ELSE lifecycle_status END
            WHERE id = $3`,
          [tag, rule.id, existing.id],
        );
        if (wasRemoved) {
          restored++;
          log.info("X RULE SYNC ↻ restored source id=%s username=%s", existing.id, username);
        } else {
          updated++;
        }
      }
    }

    for (const local of localSources) {
      if (!local.x_rule_id) continue;
      if (remoteById.has(local.x_rule_id)) continue;
      if (local.lifecycle_status === "removed") continue;
      await pool.query(
        `UPDATE sources SET lifecycle_status = 'removed' WHERE id = $1`,
        [local.id],
      );
      removed++;
      log.info("X RULE SYNC - removed source id=%s username=%s rule_id=%s", local.id, local.identity, local.x_rule_id);
    }

    log.info(
      "X RULE SYNC done: +%d ~%d -%d ↻%d (remote=%d local=%d)",
      added, updated, removed, restored, remoteRules.length, localSources.length,
    );
    return { added, updated, removed, restored };
  }

  start(): void {
    this.syncOnce().catch((e) => log.error("X RULE SYNC initial failed: %s", e.message));
    this.timer = setInterval(() => {
      this.syncOnce().catch((e) => log.error("X RULE SYNC tick failed: %s", e.message));
    }, this.intervalMs);
    log.info("X RULE SYNC started (interval=%dms)", this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const xRuleSyncer = new XRuleSyncer();

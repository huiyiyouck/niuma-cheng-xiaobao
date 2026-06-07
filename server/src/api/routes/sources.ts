import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { pool } from "../../db/pool.ts";
import {
  SourceCreate,
  SourceUpdate,
  SourceIdentityUpdate,
  SourceVerify,
  SourcesQuery,
} from "../schemas/index.ts";
import { detectTypeWithHttp, SourceType } from "../source-detector.ts";
import { asDict } from "../../shared/utils.ts";
import { toISO } from "./channel-spaces.ts";

export async function sourcesRoutes(app: FastifyInstance): Promise<void> {
  // ── Source 列表（分页+筛选，CTE 计算 operational_status）──

  app.get("/sources", async (req: FastifyRequest, reply: FastifyReply) => {
    const q = SourcesQuery.parse(req.query);

    const whereConditions: string[] = [];
    const params: any[] = [];
    let idx = 0;

    // 搜索
    if (q.search) {
      params.push(q.search);
      const searchIdx = ++idx;
      whereConditions.push(
        `(s.display_name ILIKE '%' || $${searchIdx} || '%'
          OR s.identity ILIKE '%' || $${searchIdx} || '%'
          OR s.notes ILIKE '%' || $${searchIdx} || '%'
          OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(s.content_topics) AS t WHERE t ILIKE '%' || $${searchIdx} || '%'))`,
      );
    }

    if (q.type) { params.push(q.type); whereConditions.push(`s.type = $${++idx}`); }
    if (q.lifecycle_status) { params.push(q.lifecycle_status); whereConditions.push(`s.lifecycle_status = $${++idx}`); }

    let operationalFilter = "";
    if (q.operational_status) { operationalFilter = q.operational_status; }

    if (q.domain_tags) {
      const tags = q.domain_tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tags.length > 0) { params.push(tags); whereConditions.push(`s.domain_tags ?| $${++idx}::text[]`); }
    }

    if (q.source_role) { params.push(q.source_role); whereConditions.push(`s.source_role = $${++idx}`); }
    if (q.attention_level) { params.push(q.attention_level); whereConditions.push(`s.attention_level = $${++idx}`); }

    if (q.space_id) {
      params.push(q.space_id);
      whereConditions.push(`EXISTS(SELECT 1 FROM display_positions dp WHERE dp.source_id = s.id AND dp.channel_space_id = $${++idx} AND dp.deleted_at IS NULL)`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // 排序
    let orderBy = "s.created_at DESC";
    if (q.sort === "name_asc") orderBy = "s.display_name ASC";
    else if (q.sort === "last_success_desc") orderBy = "ss.last_success_at DESC NULLS LAST";

    // 分页
    const page = q.page;
    const pageSize = q.page_size;
    const pageOffset = (page - 1) * pageSize;

    // 使用简单的子查询替代 CTE
    const sql = `SELECT s.*, ss.last_success_at, ss.consecutive_failures, ss.last_fetch_count, ss.last_error,
      CASE
        WHEN s.lifecycle_status IN ('needs_fix', 'source_error', 'removed') THEN 'stopped'
        WHEN EXISTS(SELECT 1 FROM display_positions dp2 WHERE dp2.source_id = s.id AND dp2.enabled = true AND dp2.deleted_at IS NULL) THEN 'fetching'
        ELSE 'stopped'
      END AS operational_status,
      (SELECT COUNT(*)::int FROM display_positions dp3 WHERE dp3.source_id = s.id AND dp3.deleted_at IS NULL) AS position_count,
      (SELECT COUNT(*)::int FROM display_positions dp4 WHERE dp4.source_id = s.id AND dp4.enabled = true AND dp4.deleted_at IS NULL) AS enabled_position_count,
      (SELECT COUNT(DISTINCT pn.id)::int FROM processed_news pn JOIN raw_items ri ON ri.id = pn.raw_item_id WHERE ri.source_id = s.id) AS news_count
    FROM sources s
    LEFT JOIN source_states ss ON ss.source_id = s.id
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${++idx} OFFSET $${++idx}`;
    params.push(pageSize, pageOffset);

    const { rows } = await pool.query(sql, params);

    const { rows: [totalRow] } = await pool.query(`SELECT COUNT(*)::int AS count FROM sources`);
    const total = totalRow?.count ?? 0;

    return reply.send({
      sources: rows.map(sourceCardToOut),
      total,
      page,
      page_size: pageSize,
    });
  });

  // ── 创建 Source ───────────────────────────────────────

  app.post("/sources", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = SourceCreate.parse(req.body);

    // v0.5.1: X Source 由 X Developer Portal 规则自动同步，禁止平台创建
    if (body.type === "x_twitter") {
      return reply.status(400).send({
        detail: "X 信息源由 X Developer Portal 规则自动同步，请在 Portal 创建规则后等待同步",
      });
    }

    // 标准化 identity
    let identity = body.identity.trim();
    if (body.type === "x_twitter") {
      identity = identity.replace(/^@/, "").toLowerCase();
    } else if (body.type === "rss") {
      identity = identity.replace(/\/+$/, "");
    }

    // 去重检查
    const { rows: [dup] } = await pool.query(
      "SELECT id FROM sources WHERE type = $1 AND LOWER(identity) = LOWER($2)",
      [body.type, identity],
    );
    if (dup) {
      return reply.status(409).send({
        detail: "相同类型的来源身份已存在",
        existing_source_id: dup.id,
      });
    }

    // 创建时不自动验证，Source 默认 lifecycle_status='normal'
    // 验证通过 POST /api/sources/verify 单独执行

    const { rows: [row] } = await pool.query(
      `INSERT INTO sources(
        type, identity, display_name,
        lifecycle_status,
        domain_tags, source_role, content_topics, attention_level, notes,
        fetch_interval_sec, max_items_per_fetch, compensation_interval_sec, config,
        last_verified_at, verify_error
      )
      VALUES($1, $2, $3, 'normal', $4::jsonb, $5, $6::jsonb, $7, $8, $9, $10, $11, $12::jsonb, NULL, NULL)
      RETURNING *`,
      [
        body.type,
        identity,
        body.display_name,
        JSON.stringify(body.domain_tags || []),
        body.source_role,
        JSON.stringify(body.content_topics || []),
        body.attention_level,
        body.notes ?? null,
        body.fetch_interval_sec ?? null,
        body.max_items_per_fetch ?? null,
        body.compensation_interval_sec ?? 86400,
        JSON.stringify(body.config || {}),
      ],
    );

    // 如果指定了自动添加位置（从空间管理页发起）
    if (body.auto_add_to_space_id) {
      try {
        await pool.query(
          `INSERT INTO display_positions(source_id, channel_space_id, channel_id, enabled)
           VALUES($1, $2, $3, true)`,
          [row.id, body.auto_add_to_space_id, body.auto_add_to_channel_id ?? null],
        );
      } catch (err: any) {
        if (err.code !== "23505") throw err;
        // 重复位置，忽略
      }
    }

    return reply.status(201).send(sourceToOut(row));
  });

  // ── Source 详情（含 positions + identity_history）──────

  app.get("/sources/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };

    const { rows: [row] } = await pool.query(
      `SELECT s.*,
        COALESCE(ss.last_success_at, NULL) AS last_success_at,
        COALESCE(ss.consecutive_failures, 0) AS consecutive_failures,
        COALESCE(ss.last_fetch_count, 0) AS last_fetch_count,
        COALESCE(ss.last_error, NULL) AS last_error,
        COALESCE(ss.next_fetch_at, NULL) AS next_fetch_at,
        CASE
          WHEN s.lifecycle_status IN ('needs_fix', 'source_error', 'removed') THEN 'stopped'
          WHEN EXISTS(
            SELECT 1 FROM display_positions dp
            WHERE dp.source_id = s.id AND dp.enabled = true AND dp.deleted_at IS NULL
          ) THEN 'fetching'
          ELSE 'stopped'
        END AS operational_status
       FROM sources s
       LEFT JOIN source_states ss ON ss.source_id = s.id
       WHERE s.id = $1`,
      [id],
    );
    if (!row) return reply.status(404).send({ detail: "信息源不存在" });

    // 查询展示位置
    const { rows: positions } = await pool.query(
      `SELECT dp.id, dp.enabled, dp.created_at,
              cs.name AS space_name, ch.name AS channel_name
       FROM display_positions dp
       JOIN channel_spaces cs ON cs.id = dp.channel_space_id
       LEFT JOIN channels ch ON ch.id = dp.channel_id
       WHERE dp.source_id = $1 AND dp.deleted_at IS NULL
       ORDER BY dp.created_at DESC`,
      [id],
    );

    // 查询身份变更历史
    const { rows: identityHistory } = await pool.query(
      `SELECT old_identity, new_identity, changed_at
       FROM source_identity_history
       WHERE source_id = $1
       ORDER BY changed_at DESC`,
      [id],
    );

    // 查询新闻数量
    const { rows: [newsCount] } = await pool.query(
      `SELECT COUNT(DISTINCT pn.id)::int AS count
       FROM processed_news pn
       JOIN raw_items ri ON ri.id = pn.raw_item_id
       WHERE ri.source_id = $1`,
      [id],
    );

    return reply.send({
      source: {
        ...sourceToOut(row),
        operational_status: row.operational_status,
        last_success_at: toISO(row.last_success_at),
        consecutive_failures: row.consecutive_failures,
        last_error: row.last_error,
        last_fetch_count: row.last_fetch_count,
        next_fetch_at: toISO(row.next_fetch_at),
        positions: positions.map((p: any) => ({
          id: p.id,
          space_name: p.space_name,
          channel_name: p.channel_name ?? null,
          enabled: p.enabled,
          created_at: toISO(p.created_at),
        })),
        identity_history: identityHistory.map((h: any) => ({
          old_identity: h.old_identity,
          new_identity: h.new_identity,
          changed_at: toISO(h.changed_at),
        })),
        news_count: newsCount?.count ?? 0,
      },
    });
  });

  // ── 编辑 Source（标签、备注等非身份字段）───────────────

  app.patch("/sources/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = SourceUpdate.parse(req.body);

    const { rows: [existing] } = await pool.query(
      "SELECT * FROM sources WHERE id = $1", [id],
    );
    if (!existing) return reply.status(404).send({ detail: "信息源不存在" });

    // v0.5.1: X Source 的 display_name 由 X rule.tag 同步覆盖，UI 不可编辑
    if (existing.type === "x_twitter" && body.display_name !== undefined) {
      return reply.status(400).send({
        detail: "X 信息源的展示名由 X Developer Portal Tag 同步，不可在此修改",
      });
    }

    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 0;

    if (body.display_name !== undefined) {
      sets.push(`display_name = $${++idx}`); vals.push(body.display_name);
    }
    if (body.domain_tags !== undefined) {
      sets.push(`domain_tags = $${++idx}::jsonb`); vals.push(JSON.stringify(body.domain_tags));
    }
    if (body.source_role !== undefined) {
      sets.push(`source_role = $${++idx}`); vals.push(body.source_role);
    }
    if (body.content_topics !== undefined) {
      sets.push(`content_topics = $${++idx}::jsonb`); vals.push(JSON.stringify(body.content_topics));
    }
    if (body.attention_level !== undefined) {
      sets.push(`attention_level = $${++idx}`); vals.push(body.attention_level);
    }
    if (body.notes !== undefined) {
      sets.push(`notes = $${++idx}`); vals.push(body.notes);
    }
    if (body.fetch_interval_sec !== undefined) {
      sets.push(`fetch_interval_sec = $${++idx}`); vals.push(body.fetch_interval_sec);
    }
    if (body.max_items_per_fetch !== undefined) {
      sets.push(`max_items_per_fetch = $${++idx}`); vals.push(body.max_items_per_fetch);
    }
    if (body.compensation_interval_sec !== undefined) {
      sets.push(`compensation_interval_sec = $${++idx}`); vals.push(body.compensation_interval_sec);
    }
    if (body.config !== undefined) {
      sets.push(`config = $${++idx}::jsonb`); vals.push(JSON.stringify(body.config));
    }

    if (sets.length > 0) {
      vals.push(id);
      await pool.query(
        `UPDATE sources SET ${sets.join(", ")} WHERE id = $${++idx}`,
        vals,
      );
    }

    const { rows: [updated] } = await pool.query(
      "SELECT * FROM sources WHERE id = $1", [id],
    );
    return reply.send(sourceToOut(updated));
  });

  // ── 修改来源身份（两步流程：验证→写历史+更新）─────────

  app.put("/sources/:id/identity", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = SourceIdentityUpdate.parse(req.body);

    const { rows: [existing] } = await pool.query(
      "SELECT * FROM sources WHERE id = $1", [id],
    );
    if (!existing) return reply.status(404).send({ detail: "信息源不存在" });

    // v0.5.1: X Source 的 identity（username）由 X Portal 同步决定，禁止平台修改
    if (existing.type === "x_twitter") {
      return reply.status(400).send({
        detail: "X 信息源的身份由 X Developer Portal 同步，请在 Portal 修改规则",
      });
    }

    // 仅待修复/来源异常状态允许修改身份
    if (existing.lifecycle_status !== "needs_fix" && existing.lifecycle_status !== "source_error") {
      return reply.status(409).send({
        detail: `当前可用性状态为 ${existing.lifecycle_status}，不允许直接修改来源身份`,
      });
    }

    // 标准化新身份
    let newIdentity = body.new_identity.trim();
    if (existing.type === "x_twitter") {
      newIdentity = newIdentity.replace(/^@/, "").toLowerCase();
    } else if (existing.type === "rss") {
      newIdentity = newIdentity.replace(/\/+$/, "");
    }

    // 检查重复
    const { rows: [dup] } = await pool.query(
      "SELECT id FROM sources WHERE type = $1 AND LOWER(identity) = LOWER($2) AND id != $3",
      [existing.type, newIdentity, id],
    );
    if (dup) {
      return reply.status(409).send({
        detail: "新来源身份与其他信息源重复",
        existing_source_id: dup.id,
      });
    }

    // 步骤 1：验证新身份
    let verifyError: string | null = null;
    try {
      await verifySource(existing.type, newIdentity, asDict(existing.config));
    } catch (err: any) {
      verifyError = err.message || String(err);
      return reply.status(400).send({
        detail: "新身份验证失败，请确认信息正确后重试",
        error: verifyError,
      });
    }

    // 步骤 2：写入历史 + 更新身份 + 更新状态
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 写入历史记录
      await client.query(
        `INSERT INTO source_identity_history(source_id, old_identity, new_identity)
         VALUES($1, $2, $3)`,
        [id, existing.identity, newIdentity],
      );

      // 更新身份和状态
      await client.query(
        `UPDATE sources
         SET identity = $2, lifecycle_status = 'normal', last_verified_at = now(), verify_error = NULL
         WHERE id = $1`,
        [id, newIdentity],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    const { rows: [updated] } = await pool.query(
      "SELECT * FROM sources WHERE id = $1", [id],
    );
    return reply.send(sourceToOut(updated));
  });

  // ── 删除 Source（软标记 lifecycle_status='removed'）────

  app.delete("/sources/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const { rows: [existing] } = await pool.query(
      "SELECT id, type, lifecycle_status FROM sources WHERE id = $1", [id],
    );
    if (!existing) return reply.status(404).send({ detail: "信息源不存在" });

    // v0.5.1: X Source 由 X Portal 规则同步管理，禁止平台删除
    if (existing.type === "x_twitter") {
      return reply.status(400).send({
        detail: "X 信息源请在 X Developer Portal 删除规则，平台会在 5 分钟内自动同步",
      });
    }

    if (existing.lifecycle_status === "removed") {
      return reply.status(409).send({ detail: "信息源已被移除" });
    }

    // 软删除：更新 lifecycle_status 并软删除所有展示位置
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 软删除所有活跃展示位置
      await client.query(
        `UPDATE display_positions
         SET deleted_at = now(), removal_reason = 'source_removed'
         WHERE source_id = $1 AND deleted_at IS NULL`,
        [id],
      );

      // 标记 lifecycle_status
      await client.query(
        "UPDATE sources SET lifecycle_status = 'removed' WHERE id = $1",
        [id],
      );

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    return reply.send({ deleted: true });
  });

  // ── 删除影响预览 ──────────────────────────────────────

  app.get("/sources/:id/delete-preview", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const { rows: [source] } = await pool.query(
      "SELECT id, display_name FROM sources WHERE id = $1", [id],
    );
    if (!source) return reply.status(404).send({ detail: "信息源不存在" });

    const [positionsCount, newsCount] = await Promise.all([
      pool.query(
        "SELECT COUNT(*)::int AS c FROM display_positions WHERE source_id = $1 AND deleted_at IS NULL",
        [id],
      ),
      pool.query(
        `SELECT COUNT(DISTINCT pn.id)::int AS c
         FROM processed_news pn
         JOIN raw_items ri ON ri.id = pn.raw_item_id
         WHERE ri.source_id = $1`,
        [id],
      ),
    ]);

    return reply.send({
      source_name: source.display_name,
      positions_count: positionsCount.rows[0]?.c ?? 0,
      news_count: newsCount.rows[0]?.c ?? 0,
    });
  });

  // ── 验证 Source ───────────────────────────────────────

  app.post("/sources/verify", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = SourceVerify.parse(req.body);

    // v0.5.1: X Source 不允许手动验证（由同步流程保证）
    if (body.type === "x_twitter") {
      return reply.status(400).send({
        detail: "X 信息源无需手动验证，由 X Developer Portal 同步流程保证",
      });
    }

    let identity = body.identity.trim();
    if (body.type === "x_twitter") {
      identity = identity.replace(/^@/, "").toLowerCase();
    } else if (body.type === "rss") {
      identity = identity.replace(/\/+$/, "");
    }

    try {
      const items = await verifySource(body.type, identity, body.config);
      const verifyItems = items.slice(0, 5).map((it: any) => ({
        source_item_id: it.source_item_id,
        source_item_url: it.url || null,
        title: typeof it.content === "object" && it.content?.text ? String(it.content.text).slice(0, 80) : "",
        content_preview: truncatePreview(it, 200),
        published_at: it.published_at ? new Date(it.published_at).toISOString() : null,
      }));

      return reply.send({
        status: "ok",
        identity,
        items: verifyItems,
        total_fetched: items.length,
      });
    } catch (err: any) {
      return reply.send({
        status: "error",
        identity,
        error: err.message || String(err),
        items: [],
        total_fetched: 0,
      });
    }
  });

  // ── X Source 暂停/恢复（v0.5.1）────────────────────────

  app.post("/sources/:id/pause", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const { rows: [existing] } = await pool.query(
      "SELECT id, type FROM sources WHERE id = $1", [id],
    );
    if (!existing) return reply.status(404).send({ detail: "信息源不存在" });
    if (existing.type !== "x_twitter") {
      return reply.status(400).send({ detail: "暂停/恢复仅适用于 X 信息源" });
    }
    await pool.query("UPDATE sources SET paused = true WHERE id = $1", [id]);
    return reply.send({ paused: true });
  });

  app.post("/sources/:id/resume", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const { rows: [existing] } = await pool.query(
      "SELECT id, type FROM sources WHERE id = $1", [id],
    );
    if (!existing) return reply.status(404).send({ detail: "信息源不存在" });
    if (existing.type !== "x_twitter") {
      return reply.status(400).send({ detail: "暂停/恢复仅适用于 X 信息源" });
    }
    await pool.query("UPDATE sources SET paused = false WHERE id = $1", [id]);
    return reply.send({ paused: false });
  });
}

// ── 验证 Source ──────────────────────────────────────────

async function verifySource(
  sourceType: string,
  identity: string,
  config: Record<string, unknown>,
): Promise<any[]> {
  const { find } = await import("../../worker/fetchers/registry.ts");
  const fetcher = find(sourceType);
  if (!fetcher) {
    const { NonRetryableError } = await import("../../worker/errors.ts");
    throw new NonRetryableError(`未注册的 Source 类型：${sourceType}`);
  }
  // 构建验证配置：根据 Source 类型适配 fetcher 需要的 config 格式
  const verifyConfig = buildFetchConfig(sourceType, identity, config);
  const { items } = await fetcher.fetch(verifyConfig, {}, 5);
  return items;
}

/** 构建 fetcher 需要的配置：根据 Source 类型适配 */
export function buildFetchConfig(
  sourceType: string,
  identity: string,
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (sourceType === "x_twitter") {
    // X Source: identity 就是用户名，构建 user_timeline 模式的配置
    return {
      ...config,
      mode: "user_timeline",
      usernames: [identity],
      max_results_per_user: 20,
      source_url: identity, // 兼容旧 fetcher
    };
  }
  // RSS 和其他类型：identity 作为 source_url
  return {
    ...config,
    source_url: identity,
  };
}

function truncatePreview(item: any, maxChars: number): string {
  const content = item.content;
  let text = "";
  if (typeof content === "object" && content !== null) {
    text = content.text || content.description || "";
  } else if (typeof content === "string") {
    text = content;
  }
  return text.length <= maxChars ? text : text.slice(0, maxChars);
}

// ── 输出格式化 ──────────────────────────────────────────

function sourceToOut(r: any) {
  return {
    id: r.id,
    type: r.type,
    identity: r.identity,
    display_name: r.display_name,
    lifecycle_status: r.lifecycle_status,
    domain_tags: r.domain_tags || [],
    source_role: r.source_role,
    content_topics: r.content_topics || [],
    attention_level: r.attention_level,
    notes: r.notes,
    fetch_interval_sec: r.fetch_interval_sec,
    max_items_per_fetch: r.max_items_per_fetch,
    compensation_interval_sec: r.compensation_interval_sec,
    config: asDict(r.config),
    last_verified_at: toISO(r.last_verified_at),
    verify_error: r.verify_error,
    // v0.5.1: X 反向同步字段
    source_origin: r.source_origin ?? "manual",
    x_rule_id: r.x_rule_id ?? null,
    paused: r.paused ?? false,
    created_at: toISO(r.created_at),
  };
}

function sourceCardToOut(r: any) {
  return {
    id: r.id,
    type: r.type,
    identity: r.identity,
    display_name: r.display_name,
    lifecycle_status: r.lifecycle_status,
    operational_status: r.operational_status,
    domain_tags: r.domain_tags || [],
    source_role: r.source_role,
    attention_level: r.attention_level,
    position_count: r.position_count ?? 0,
    enabled_position_count: r.enabled_position_count ?? 0,
    last_success_at: toISO(r.last_success_at),
    consecutive_failures: r.consecutive_failures ?? 0,
    news_count: r.news_count ?? 0,
    // v0.5.1: X 反向同步字段
    source_origin: r.source_origin ?? "manual",
    x_rule_id: r.x_rule_id ?? null,
    paused: r.paused ?? false,
    created_at: toISO(r.created_at),
  };
}

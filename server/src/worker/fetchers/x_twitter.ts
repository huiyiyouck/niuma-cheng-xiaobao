import { config } from "../../shared/config.ts";
import { NonRetryableError } from "../errors.ts";
import { register } from "./registry.ts";

const TWEET_FIELDS = "created_at,public_metrics,author_id,text,entities,referenced_tweets";
const USER_FIELDS = "name,username";
const EXPANSIONS = "author_id";

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${config.xBearerToken}` };
}

function handleAuthFailure(status: number): void {
  if (status === 401 || status === 403) {
    throw new NonRetryableError(
      `X API authentication failed (HTTP ${status}). Check X_BEARER_TOKEN in .env`,
    );
  }
}

function handleRateLimit(status: number): void {
  if (status === 429) {
    throw new Error("X API rate limit exceeded (HTTP 429)");
  }
}

// 将 X API 响应解析为标准 item 格式
function parseTweets(apiResponse: any): any[] {
  const tweets = apiResponse.data || [];
  const includes = apiResponse.includes || {};
  const users: Record<string, any> = {};
  for (const u of includes.users || []) {
    users[u.id] = u;
  }

  const items: any[] = [];
  for (const tweet of tweets) {
    const tweetId = tweet.id;
    if (!tweetId) continue;

    const user = users[tweet.author_id] || {};
    const username = user.username || "";
    const authorName = user.name || "";
    const text = tweet.text || "";
    let publishedAt: string | undefined;
    if (tweet.created_at) {
      try {
        publishedAt = new Date(tweet.created_at.replace("Z", "+00:00")).toISOString();
      } catch {
        // 保持 undefined
      }
    }

    const content = {
      tweet_id: tweetId,
      text,
      author_username: username,
      author_name: authorName,
      created_at: tweet.created_at,
      public_metrics: tweet.public_metrics || {},
      entities: tweet.entities || {},
      referenced_tweets: tweet.referenced_tweets || [],
    };

    const url = username
      ? `https://x.com/${username}/status/${tweetId}`
      : `https://x.com/i/status/${tweetId}`;

    items.push({ source_item_id: tweetId, url, published_at: publishedAt, content });
  }
  return items;
}

// 关键词搜索模式
async function fetchSearch(
  searchConfig: Record<string, unknown>,
  cursor: Record<string, unknown>,
  maxItems: number,
): Promise<[any[], Record<string, unknown>]> {
  const query = searchConfig.search_query as string;
  if (!query) throw new Error("x_twitter search mode requires config.search_query");

  const params = new URLSearchParams({
    query,
    max_results: String(Math.min(maxItems, 100)),
    "tweet.fields": TWEET_FIELDS,
    "user.fields": USER_FIELDS,
    expansions: EXPANSIONS,
  });
  if (cursor.since_id) params.set("since_id", String(cursor.since_id));

  const url = `https://api.twitter.com/2/tweets/search/recent?${params.toString()}`;
  const resp = await fetch(url, { headers: authHeaders() });
  handleAuthFailure(resp.status);
  handleRateLimit(resp.status);
  if (!resp.ok) throw new Error(`X API error: HTTP ${resp.status} ${await resp.text()}`);
  const data = await resp.json();

  const items = parseTweets(data);
  let newSinceId: string | undefined;
  if (items.length > 0) {
    const tweetIds = items
      .map((t: any) => parseInt(t.source_item_id))
      .filter((n: number) => !isNaN(n));
    if (tweetIds.length > 0) newSinceId = String(Math.max(...tweetIds));
  }

  const cursorUpdates: Record<string, unknown> = {};
  if (newSinceId) cursorUpdates.since_id = newSinceId;
  return [items.slice(0, maxItems), cursorUpdates];
}

// 账号追踪模式
async function fetchUserTimelines(
  searchConfig: Record<string, unknown>,
  cursor: Record<string, unknown>,
  maxItems: number,
): Promise<[any[], Record<string, unknown>]> {
  const usernames = searchConfig.usernames as string[];
  if (!usernames?.length) throw new Error("x_twitter user_timeline mode requires config.usernames");

  const maxPerUser = (searchConfig.max_results_per_user as number) || 20;
  const userCursors = (cursor.user_cursors as Record<string, string>) || {};
  const allItems: any[] = [];
  const userItems: Record<string, any[]> = {};

  // 解析 username → user_id
  const userIds: Record<string, string | null> = {};
  for (const username of usernames) {
    try {
      const r = await fetch(`https://api.twitter.com/2/users/by/username/${username}`, {
        headers: authHeaders(),
      });
      handleAuthFailure(r.status);
      handleRateLimit(r.status);
      if (r.status === 200) {
        const d = await r.json();
        userIds[username] = d?.data?.id || null;
      } else if (r.status === 404) {
        userIds[username] = null;
      } else {
        throw new Error(`X API error: HTTP ${r.status}`);
      }
    } catch (err) {
      if (err instanceof NonRetryableError) throw err;
      // 其他错误继续
    }
  }

  for (const [username, userId] of Object.entries(userIds)) {
    if (!userId) continue;

    const params = new URLSearchParams({
      max_results: String(Math.min(maxPerUser, 100)),
      "tweet.fields": TWEET_FIELDS,
      exclude: "retweets,replies",
    });
    const since = userCursors[username];
    if (since) params.set("since_id", since);

    const r = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?${params.toString()}`,
      { headers: authHeaders() },
    );
    handleAuthFailure(r.status);
    handleRateLimit(r.status);
    if (!r.ok) throw new Error(`X API error: HTTP ${r.status}`);
    const data = await r.json();

    const tweets = parseTweets(data);
    userItems[username] = tweets;
    allItems.push(...tweets);
  }

  // 按 published_at DESC 排序后截断
  allItems.sort((a, b) => {
    const da = a.published_at ? new Date(a.published_at).getTime() : 0;
    const db = b.published_at ? new Date(b.published_at).getTime() : 0;
    return db - da;
  });
  const retained = allItems.slice(0, maxItems);
  const retainedIds = new Set(retained.map((it: any) => it.source_item_id));

  // 仅对保留推文更新游标
  const updatedCursors: Record<string, string> = { ...userCursors };
  for (const [username, tweets] of Object.entries(userItems)) {
    const retainedTweets = tweets.filter((t) => retainedIds.has(t.source_item_id));
    if (retainedTweets.length > 0) {
      const tweetIds = retainedTweets
        .map((t: any) => parseInt(t.source_item_id))
        .filter((n: number) => !isNaN(n));
      if (tweetIds.length > 0) updatedCursors[username] = String(Math.max(...tweetIds));
    }
  }

  return [retained, { user_cursors: updatedCursors }];
}

// 主入口
export async function parseXTweets(
  config: Record<string, unknown>,
  cursor: Record<string, unknown>,
  maxItems: number,
): Promise<[any[], Record<string, unknown>]> {
  const mode = (config.mode as string) || "search";
  if (mode === "search") return fetchSearch(config, cursor, maxItems);
  if (mode === "user_timeline") return fetchUserTimelines(config, cursor, maxItems);
  throw new Error(`unsupported x_twitter mode: ${mode}`);
}

export function renderTextForLLM(content: Record<string, unknown>): string {
  if (typeof content === "string") {
    try {
      content = JSON.parse(content);
    } catch {
      content = {};
    }
  }

  const username = (content.author_username as string) || "";
  const text = (content.text as string) || "";
  const metrics = (content.public_metrics as Record<string, number>) || {};
  const entities = (content.entities as Record<string, any>) || {};

  const parts: string[] = [];
  if (username) parts.push(`[Tweet by @${username}]`);
  parts.push(text);

  const metricParts: string[] = [];
  for (const key of ["like_count", "retweet_count", "reply_count"]) {
    const v = metrics[key];
    if (v !== undefined) metricParts.push(`${key.replace("_count", "").replace(/^\w/, (c) => c.toUpperCase())}s: ${v}`);
  }
  if (metricParts.length > 0) parts.push(metricParts.join(" | "));

  const urls = entities.urls || [];
  if (urls.length > 0) {
    const linkParts = urls.map((u: any) => u.expanded_url || u.url || "").filter(Boolean);
    parts.push("引用链接:\n" + linkParts.map((u: string) => `- ${u}`).join("\n"));
  }

  return parts.join("\n\n").trim();
}

// 注册到 registry
register({
  type: "x_twitter",
  fetch: async (cfg, cursor, maxItems) => {
    const [items, cursorUpdates] = await parseXTweets(cfg, cursor, maxItems);
    return { items, cursorUpdates };
  },
  renderForLLM: renderTextForLLM,
});

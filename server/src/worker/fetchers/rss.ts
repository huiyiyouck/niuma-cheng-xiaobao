import Parser from "rss-parser";
import { register } from "./registry.ts";
import { NonRetryableError } from "../errors.ts";

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "NiumaNewsBot/0.4" },
});

async function fetchRSS(
  feedUrl: string,
  cursor: Record<string, unknown>,
  maxItems: number,
): Promise<[any[], Record<string, unknown>]> {
  let feed: Parser.Output<{ [key: string]: any }>;
  try {
    feed = await parser.parseURL(feedUrl);
  } catch (err: any) {
    throw new NonRetryableError(`RSS 抓取/解析失败: ${err.message}`);
  }

  const lastPubDate = cursor.lastPubDate as string | undefined;
  const items: any[] = [];

  for (const entry of feed.items || []) {
    const pubDate = entry.pubDate || entry.isoDate || undefined;
    // 游标过滤：仅处理比 lastPubDate 更新的条目
    if (lastPubDate && pubDate && new Date(pubDate) <= new Date(lastPubDate)) continue;

    const guid = entry.guid || entry.link || undefined;
    if (!guid) continue;

    items.push({
      source_item_id: guid,
      url: entry.link || undefined,
      published_at: pubDate ? new Date(pubDate).toISOString() : undefined,
      content: {
        title: entry.title || "",
        summary: entry.contentSnippet || entry.content || "",
        author: entry.creator || undefined,
        categories: entry.categories || [],
        source_name: feed.title || "",
      },
    });
  }

  // 按 published_at 升序（最早的在前，游标取最新的）
  items.sort((a, b) => {
    const da = a.published_at ? new Date(a.published_at).getTime() : 0;
    const db = b.published_at ? new Date(b.published_at).getTime() : 0;
    return da - db;
  });

  const retained = items.slice(0, maxItems);
  const newCursor: Record<string, unknown> = {};
  if (retained.length > 0) {
    const latest = retained[retained.length - 1];
    if (latest.published_at) {
      newCursor.lastPubDate = latest.published_at;
    }
  }

  return [retained, newCursor];
}

function renderRSSForLLM(content: Record<string, unknown>): string {
  const title = (content.title as string) || "";
  const summary = (content.summary as string) || "";
  const source = (content.source_name as string) || "";
  const author = (content.author as string) || "";

  const parts: string[] = [];
  if (source) parts.push(`[来源: ${source}]`);
  if (author) parts.push(`作者: ${author}`);
  parts.push(title);
  if (summary && summary !== title) parts.push(summary);
  return parts.join("\n\n").trim();
}

register({
  type: "rss",
  fetch: async (cfg, cursor, maxItems) => {
    const feedUrl = cfg.source_url as string;
    if (!feedUrl) throw new NonRetryableError("RSS fetcher 需要 source_url");
    const [items, cursorUpdates] = await fetchRSS(feedUrl, cursor, maxItems);
    return { items, cursorUpdates };
  },
  renderForLLM: renderRSSForLLM,
});

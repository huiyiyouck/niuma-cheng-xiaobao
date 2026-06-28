import { describe, expect, it, vi } from "vitest";

vi.mock("../worker/llm.ts", () => ({
  processLLM: vi.fn(async () => {
    throw new Error("LLM should not run for direct X display");
  }),
}));

describe("X/Twitter direct display", () => {
  it("creates displayable news from a raw tweet without calling LLM", async () => {
    const { processOne } = await import("../worker/processor.ts");
    const { processLLM } = await import("../worker/llm.ts");

    const tweetText = "OpenAI 发布新的模型路由能力，开发者可以更细粒度控制成本。";
    const insertedNews: Record<string, unknown> = {};
    const statusUpdates: string[] = [];

    const conn = {
      async query(sql: string, params: unknown[] = []) {
        if (sql.includes("FROM raw_items ri")) {
          return {
            rows: [{
              id: "raw-1",
              source_id: "source-1",
              source_item_url: "https://x.com/openai/status/1",
              published_at: "2026-06-28T01:00:00.000Z",
              source_type: "x_twitter",
              source_identity: "openai",
              content: {
                tweet_id: "1",
                text: tweetText,
                author_username: "openai",
                author_name: "OpenAI",
              },
            }],
          };
        }

        if (sql.includes("INSERT INTO processed_news")) {
          insertedNews.title = params[1];
          insertedNews.summary = params[2];
          insertedNews.tags = JSON.parse(String(params[7]));
          insertedNews.importanceScore = params[9];
          return { rows: [{ id: "news-1", title: params[1], published_at: params[5] }] };
        }

        if (sql.includes("FROM display_positions")) {
          return { rows: [{ id: "position-1" }] };
        }

        if (sql.includes("UPDATE raw_items")) {
          statusUpdates.push(sql);
          return { rows: [] };
        }

        return { rows: [] };
      },
    };

    await processOne(conn as any, { id: "task-1", source_id: "source-1", raw_item_id: "raw-1" });

    expect(processLLM).not.toHaveBeenCalled();
    expect(insertedNews).toMatchObject({
      title: tweetText,
      summary: tweetText,
      tags: ["X/Twitter"],
      importanceScore: 0,
    });
    expect(statusUpdates.some((sql) => sql.includes("l1_status = 'completed'"))).toBe(true);
  });

  it("queues ordinary process tasks for new X raw items while AI processing is disabled", async () => {
    const { taskTypeForNewRawItem } = await import("../worker/dispatcher.ts");

    expect(taskTypeForNewRawItem("x_twitter")).toBe("process");
    expect(taskTypeForNewRawItem("rss")).toBe("process");
  });
});

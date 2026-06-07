import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { register } from "./registry.ts";
import { NonRetryableError } from "../errors.ts";
import { workerLogger } from "../../shared/logger.ts";
import { config } from "../../shared/config.ts";

const log = workerLogger;

let client: Client | null = null;
let transport: StreamableHTTPClientTransport | null = null;

async function getClient(): Promise<Client> {
  if (client) return client;

  const serverUrl = config.jin10McpUrl;
  const token = config.jin10McpToken;

  if (!token) throw new NonRetryableError("JIN10_MCP_TOKEN 未配置");

  transport = new StreamableHTTPClientTransport(new URL(serverUrl), {
    requestInit: {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    },
  });

  client = new Client(
    { name: "niuma-news", version: "0.5" },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);
    log.info("金十 MCP 连接成功");
  } catch (err: any) {
    client = null;
    transport = null;
    throw new NonRetryableError(`金十 MCP 连接失败: ${err.message}`);
  }

  return client;
}

async function fetchJin10Flash(
  _cursor: Record<string, unknown>,
  maxItems: number,
): Promise<[any[], Record<string, unknown>]> {
  const c = await getClient();

  const result = await c.callTool({
    name: "list_flash",
    arguments: {},
  });

  const content = result.structuredContent as any;
  const items = content?.data?.items || [];

  const retained = items.slice(0, maxItems).map((item: any) => ({
    source_item_id: item.id || String(Date.now()),
    url: item.url || undefined,
    published_at: item.time ? new Date(item.time).toISOString() : undefined,
    content: {
      title: item.title || "",
      summary: item.introduction || item.content || "",
      source_name: "金十数据",
    },
  }));

  return [retained, {}];
}

function renderJin10ForLLM(content: Record<string, unknown>): string {
  const title = (content.title as string) || "";
  const summary = (content.summary as string) || "";
  return `[金十快讯] ${title}\n\n${summary}`.trim();
}

register({
  type: "jin10_flash",
  fetch: async (_cfg, cursor, maxItems) => {
    const [items, cursorUpdates] = await fetchJin10Flash(cursor, maxItems);
    return { items, cursorUpdates };
  },
  renderForLLM: renderJin10ForLLM,
});

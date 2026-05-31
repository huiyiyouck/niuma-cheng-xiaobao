import { config as appConfig } from "../../shared/config.ts";

// Fetcher 接口和注册表

export interface FetchResult {
  items: Array<{
    source_item_id: string;
    url?: string;
    published_at?: string;
    content: Record<string, unknown>;
  }>;
  cursorUpdates: Record<string, unknown>;
}

export interface Fetcher {
  type: string;
  fetch(config: Record<string, unknown>, cursor: Record<string, unknown>, maxItems: number): Promise<FetchResult>;
  renderForLLM(content: Record<string, unknown>): string;
}

const registry = new Map<string, Fetcher>();

export function register(f: Fetcher): void {
  registry.set(f.type, f);
}

export function find(type: string): Fetcher | undefined {
  return registry.get(type);
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class HttpError extends Error {
  status: number;
  bodyText?: string;

  constructor(status: number, message: string, bodyText?: string) {
    super(message);
    this.status = status;
    this.bodyText = bodyText;
  }
}

function getAdminToken(): string {
  return (import.meta.env.VITE_ADMIN_TOKEN as string) || localStorage.getItem("__admin_token__") || "";
}

const WRITE_METHODS = new Set<HttpMethod>(["POST", "PUT", "PATCH", "DELETE"]);

export async function requestJson<T>(url: string, init?: { method?: HttpMethod; body?: unknown }): Promise<T> {
  const method = init?.method || "GET";
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // v0.4: admin token 注入（仅写操作）
  if (WRITE_METHODS.has(method)) {
    const token = getAdminToken();
    if (token) headers["x-admin-token"] = token;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new HttpError(res.status, `HTTP ${res.status}`, text);
  }

  return (await res.json()) as T;
}

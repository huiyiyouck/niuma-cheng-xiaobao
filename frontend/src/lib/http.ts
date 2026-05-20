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

export async function requestJson<T>(url: string, init?: { method?: HttpMethod; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method || "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new HttpError(res.status, `HTTP ${res.status}`, text);
  }

  return (await res.json()) as T;
}


export class HttpError extends Error {
    status;
    bodyText;
    constructor(status, message, bodyText) {
        super(message);
        this.status = status;
        this.bodyText = bodyText;
    }
}
function getAdminToken() {
    return import.meta.env.VITE_ADMIN_TOKEN || localStorage.getItem("__admin_token__") || "";
}
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
export async function requestJson(url, init) {
    const method = init?.method || "GET";
    const headers = {};
    // 只在有 body 时声明 Content-Type，避免 Fastify 拒绝"声明了 JSON 但 body 为空"的请求
    if (init?.body !== undefined) {
        headers["Content-Type"] = "application/json";
    }
    // v0.4: admin token 注入（仅写操作）
    if (WRITE_METHODS.has(method)) {
        const token = getAdminToken();
        if (token)
            headers["x-admin-token"] = token;
    }
    const res = await fetch(url, {
        method,
        headers,
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new HttpError(res.status, `HTTP ${res.status}`, text);
    }
    // 204 No Content / Content-Length=0：没有响应体，直接返回 undefined
    if (res.status === 204 || res.headers.get("content-length") === "0") {
        return undefined;
    }
    return (await res.json());
}

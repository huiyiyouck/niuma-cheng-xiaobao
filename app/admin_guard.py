from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.settings import settings


def _client_ip(request: Request) -> str:
    if settings.trust_proxy_headers:
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip()
    if request.client:
        return request.client.host
    return ""


class AdminIPWhitelistMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, api_prefix: str):
        super().__init__(app)
        allowed = {ip.strip() for ip in settings.admin_allowed_ips.split(",") if ip.strip()}
        self._allowed = allowed
        self._api_prefix = api_prefix

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        needs_admin = False
        if path.startswith(f"{self._api_prefix}/alerts"):
            needs_admin = True
        elif path.startswith(self._api_prefix) and request.method not in {"GET", "HEAD", "OPTIONS"}:
            needs_admin = True
        if needs_admin:
            if settings.admin_token:
                token = request.headers.get("x-admin-token") or ""
                if token != settings.admin_token:
                    return _forbidden()
                if not settings.admin_require_both:
                    return await call_next(request)
            ip = _client_ip(request)
            if "*" not in self._allowed and ip not in self._allowed:
                return _forbidden()
        return await call_next(request)


def _forbidden():
    from starlette.responses import JSONResponse

    return JSONResponse(status_code=403, content={"detail": "forbidden"})

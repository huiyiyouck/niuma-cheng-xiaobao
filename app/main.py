import asyncio
import json
import uuid
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from app.admin_guard import AdminIPWhitelistMiddleware
from app.pg_notify import start_listener
from app.routes import router as v1_router
from app.schemas import WSClientMessage
from app.settings import settings
from app.ws_manager import ws_manager


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        stop_event = asyncio.Event()
        task = asyncio.create_task(start_listener(stop_event))
        try:
            yield
        finally:
            stop_event.set()
            try:
                await task
            except Exception:
                pass

    app = FastAPI(title="News Aggregator MVP", lifespan=lifespan)
    origins = [o.strip() for o in settings.cors_allow_origins.split(",") if o.strip()] or ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(AdminIPWhitelistMiddleware, api_prefix="/v1")
    app.include_router(v1_router, prefix="/v1")

    # HTTP 请求日志中间件
    from app.logger import get_logger
    import time
    log = get_logger()

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        t0 = time.monotonic()
        response = await call_next(request)
        duration_ms = round((time.monotonic() - t0) * 1000)
        log.info("HTTP %s %s → %d (%.0fms)", request.method, request.url.path, response.status_code, duration_ms)
        return response

    @app.get("/", response_class=HTMLResponse)
    async def index():
        return """
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>News Aggregator Backend</title>
    <style>
      :root { --bg:#fff; --text:#0f172a; --muted:#64748b; --border:#e2e8f0; --card:#fff; --shadow: 0 10px 30px rgba(2, 6, 23, 0.08); --primary:#2563eb; }
      * { box-sizing: border-box; }
      body { margin:0; font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; background: var(--bg); color: var(--text); }
      .wrap { max-width: 980px; margin: 0 auto; padding: 28px 16px 60px; }
      .card { border: 1px solid var(--border); border-radius: 16px; background: var(--card); box-shadow: var(--shadow); padding: 16px; }
      a { color: var(--primary); text-decoration: none; font-weight: 700; }
      a:hover { text-decoration: underline; }
      .muted { color: var(--muted); font-size: 13px; line-height: 1.6; }
      .row { display:flex; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
      .pill { display:inline-flex; gap:8px; align-items:center; border: 1px solid var(--border); border-radius: 999px; padding: 8px 10px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div style="font-weight:900; font-size:18px;">News Aggregator Backend</div>
        <div class="muted">后端只提供 REST(/v1) + WS(/ws)。前端请用独立的 Vue 项目运行。</div>
        <div class="row">
          <span class="pill"><a href="/docs" target="_blank" rel="noreferrer">API 文档 /docs</a></span>
          <span class="pill"><span class="muted">WS:</span> <code>/ws</code></span>
        </div>
      </div>
    </div>
  </body>
</html>
        """

    @app.websocket("/ws")
    async def websocket_endpoint(ws: WebSocket):
        await ws.accept()
        space_id: Optional[uuid.UUID] = None
        try:
            while True:
                text = await ws.receive_text()
                msg = WSClientMessage.model_validate_json(text)
                if msg.type == "subscribe" and msg.channel_space_id:
                    if space_id:
                        await ws_manager.remove(space_id, ws)
                    space_id = msg.channel_space_id
                    await ws_manager.add(space_id, ws)
                    await ws.send_text(json.dumps({"type": "subscribed", "channel_space_id": str(space_id)}))
                elif msg.type == "ping":
                    await ws.send_text(json.dumps({"type": "pong"}))
        except WebSocketDisconnect:
            pass
        finally:
            if space_id:
                await ws_manager.remove(space_id, ws)

    return app


app = create_app()

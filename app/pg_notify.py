import asyncio
import json
import uuid
import ssl

import asyncpg

from app.settings import settings
from app.ws_manager import ws_manager


def _to_asyncpg_dsn(database_url: str) -> str:
    if database_url.startswith("postgresql+asyncpg://"):
        return "postgresql://" + database_url.removeprefix("postgresql+asyncpg://")
    if database_url.startswith("postgres+asyncpg://"):
        return "postgres://" + database_url.removeprefix("postgres+asyncpg://")
    return database_url


async def start_listener(stop_event: asyncio.Event) -> None:
    dsn = _to_asyncpg_dsn(settings.database_url)
    ctx = ssl.create_default_context()
    if not settings.db_ssl_verify:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    conn = await asyncpg.connect(dsn, ssl=ctx)
    try:
        await conn.add_listener("news_processed", _on_news_processed)
        await conn.add_listener("alert_created", _on_alert_created)
        await stop_event.wait()
    finally:
        try:
            await conn.close()
        except Exception:
            pass


async def _broadcast(space_id: uuid.UUID, payload: dict) -> None:
    await ws_manager.broadcast(space_id, payload)


def _on_news_processed(conn, pid, channel, payload):
    try:
        data = json.loads(payload)
        space_id = uuid.UUID(data["channel_space_id"])
    except Exception:
        return
    asyncio.create_task(_broadcast(space_id, {"type": "news.processed", "data": data}))


def _on_alert_created(conn, pid, channel, payload):
    try:
        data = json.loads(payload)
        space_id = uuid.UUID(data["channel_space_id"])
    except Exception:
        return
    asyncio.create_task(_broadcast(space_id, {"type": "alert.created", "data": data}))
